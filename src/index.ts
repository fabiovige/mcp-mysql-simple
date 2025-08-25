#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}


class DatabaseConfig {
  static create(): MySQLConfig {
    const port = parseInt(process.env.MYSQL_PORT || "3306", 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error("Porta MySQL inválida");
    }
    
    return {
      host: process.env.MYSQL_HOST || "localhost",
      port,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || process.env.MYSQL_PASS || "",
      database: process.env.MYSQL_DATABASE || process.env.MYSQL_DB,
    };
  }
}

class DatabaseConnection {
  private connection: mysql.Connection | null = null;
  private config: MySQLConfig;

  constructor(config: MySQLConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connection) return;

    try {
      this.connection = await mysql.createConnection(this.config);
      console.error("✅ Conectado ao MySQL");
    } catch (error) {
      const message = this.getErrorMessage(error);
      console.error("❌ Erro ao conectar ao MySQL:", message);
      throw new Error(`Falha na conexão: ${message}`);
    }
  }
  
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async execute(query: string, params?: any[]): Promise<any> {
    if (!this.connection) {
      await this.connect();
    }
    return this.connection!.execute(query, params);
  }

  async useDatabase(database: string): Promise<void> {
    await this.execute(`USE \`${database}\``);
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

class QueryValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /DROP\s+DATABASE/i,
    /DROP\s+TABLE/i,
    /DELETE\s+FROM.*WHERE.*1\s*=\s*1/i,
    /TRUNCATE/i,
  ];

  static validate(query: string): void {
    const normalizedQuery = query.trim();
    
    if (!normalizedQuery) {
      throw new Error("Query não pode estar vazia");
    }

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(normalizedQuery)) {
        throw new Error("Query contém operações potencialmente perigosas");
      }
    }
  }

  static sanitizeTableName(tableName: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error("Nome de tabela inválido");
    }
    return tableName;
  }
}

class ResponseFormatter {
  private static createResponse(text: string): CallToolResult {
    return { content: [{ type: "text", text }] };
  }

  static success(content: string): CallToolResult {
    return this.createResponse(content);
  }

  static error(message: string): CallToolResult {
    return this.createResponse(`❌ Erro: ${message}`);
  }

  static queryResult(query: string, data: any): CallToolResult {
    return this.success(
      `Resultado da query:\n\`\`\`sql\n${query}\n\`\`\`\n\nResultados:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
    );
  }

  static tableStructure(tableName: string, data: any): CallToolResult {
    return this.success(
      `Estrutura da tabela "${tableName}":\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
    );
  }
}

class ToolsHandler {
  constructor(private db: DatabaseConnection) {}
  
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
  
  private async useDatabase(database?: string): Promise<void> {
    if (database) {
      await this.db.useDatabase(database);
    }
  }

  async executeQuery(query: string, database?: string): Promise<CallToolResult> {
    try {
      QueryValidator.validate(query);
      await this.useDatabase(database);
      
      const [rows] = await this.db.execute(query);
      return ResponseFormatter.queryResult(query, rows);
    } catch (error) {
      return ResponseFormatter.error(this.getErrorMessage(error));
    }
  }

  async describeTable(tableName: string, database?: string): Promise<CallToolResult> {
    try {
      const sanitizedName = QueryValidator.sanitizeTableName(tableName);
      await this.useDatabase(database);
      
      const [rows] = await this.db.execute(`DESCRIBE \`${sanitizedName}\``);
      return ResponseFormatter.tableStructure(sanitizedName, rows);
    } catch (error) {
      return ResponseFormatter.error(this.getErrorMessage(error));
    }
  }
}

class ResourcesHandler {
  constructor(private db: DatabaseConnection) {}
  
  private createResourceResponse(uri: string, data: any) {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    };
  }

  async getDatabases() {
    const [rows] = await this.db.execute("SHOW DATABASES");
    return this.createResourceResponse("mysql://databases", rows);
  }

  async getTables() {
    const [rows] = await this.db.execute("SHOW TABLES");
    return this.createResourceResponse("mysql://tables", rows);
  }

  async getSchema() {
    const [tables] = await this.db.execute("SHOW TABLES");
    const schema = { tables: [] as any[] };

    for (const table of tables as any[]) {
      const tableName = Object.values(table)[0] as string;
      try {
        const [columns] = await this.db.execute(`DESCRIBE \`${tableName}\``);
        schema.tables.push({ name: tableName, columns });
      } catch (error) {
        console.error(`Erro ao descrever tabela ${tableName}:`, error);
        schema.tables.push({ name: tableName, error: "Não foi possível descrever" });
      }
    }

    return this.createResourceResponse("mysql://schema", schema);
  }
}

class PromptsHandler {
  static getPrompts() {
    return {
      prompts: [
        {
          name: "analyze_table",
          description: "Analisa uma tabela específica",
          arguments: [{
            name: "table_name",
            description: "Nome da tabela para analisar",
            required: true,
          }],
        },
        {
          name: "find_large_tables",
          description: "Encontra tabelas com mais registros",
        },
        {
          name: "database_overview",
          description: "Visão geral do banco de dados",
        },
      ],
    };
  }

  static getPrompt(name: string, args?: any) {
    const prompts = {
      analyze_table: (tableName: string) => ({
        description: `Análise da tabela ${tableName}`,
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analise a tabela "${tableName}":\n1. Descreva a estrutura da tabela\n2. Mostre alguns dados de exemplo\n3. Calcule estatísticas básicas (contagem de registros)\n4. Identifique possíveis problemas ou oportunidades de otimização`,
          },
        }],
      }),
      find_large_tables: () => ({
        description: "Encontrar tabelas com mais registros",
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Liste todas as tabelas do banco atual:\n1. Número de registros de cada tabela\n2. Ordene por quantidade (maior para menor)\n3. Identifique as 5 maiores tabelas\n4. Sugira estratégias de otimização se necessário",
          },
        }],
      }),
      database_overview: () => ({
        description: "Visão geral do banco de dados",
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Visão geral completa do banco:\n1. Liste todos os bancos disponíveis\n2. Para o banco atual, mostre todas as tabelas\n3. Identifique relacionamentos entre tabelas\n4. Sugira melhorias na estrutura",
          },
        }],
      }),
    };

    if (name === "analyze_table") {
      const tableName = args?.table_name as string;
      if (!tableName) {
        throw new Error("table_name é obrigatório");
      }
      return prompts.analyze_table(tableName);
    }

    if (name in prompts) {
      return (prompts as any)[name]();
    }

    throw new Error(`Prompt não encontrado: ${name}`);
  }
}

export class MySQLMCPServer {
  private server: Server;
  private db: DatabaseConnection;
  private toolsHandler: ToolsHandler;
  private resourcesHandler: ResourcesHandler;

  constructor() {
    const config = DatabaseConfig.create();
    this.db = new DatabaseConnection(config);
    this.toolsHandler = new ToolsHandler(this.db);
    this.resourcesHandler = new ResourcesHandler(this.db);

    this.server = new Server(
      { name: "mysql-mcp-server", version: "1.1.0" },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    const tools = [
      {
        name: "execute_query",
        description: "Executa uma query SQL no banco MySQL",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "A query SQL para executar" },
            database: { type: "string", description: "Banco de dados opcional" },
          },
          required: ["query"],
        },
      },
      {
        name: "describe_table",
        description: "Descreve a estrutura de uma tabela",
        inputSchema: {
          type: "object",
          properties: {
            table_name: { type: "string", description: "Nome da tabela para descrever" },
            database: { type: "string", description: "Nome do banco de dados" },
          },
          required: ["table_name"],
        },
      },
    ];

    const resources = [
      { uri: "mysql://databases", name: "Lista de Bancos de Dados", description: "Lista todos os bancos de dados disponíveis", mimeType: "application/json" },
      { uri: "mysql://tables", name: "Lista de Tabelas", description: "Lista todas as tabelas do banco atual", mimeType: "application/json" },
      { uri: "mysql://schema", name: "Schema do Banco", description: "Schema completo do banco de dados atual", mimeType: "application/json" },
    ];

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => PromptsHandler.getPrompts());
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return PromptsHandler.getPrompt(name, args);
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "execute_query":
            return await this.toolsHandler.executeQuery(args?.query as string, args?.database as string);
          case "describe_table":
            return await this.toolsHandler.describeTable(args?.table_name as string, args?.database as string);
          default:
            return ResponseFormatter.error(`Tool desconhecido: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return ResponseFormatter.error(`Erro ao executar ${name}: ${message}`);
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case "mysql://databases":
            return await this.resourcesHandler.getDatabases();
          case "mysql://tables":
            return await this.resourcesHandler.getTables();
          case "mysql://schema":
            return await this.resourcesHandler.getSchema();
          default:
            throw new Error(`Resource não encontrado: ${uri}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Erro ao ler resource ${uri}: ${message}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Servidor MCP MySQL iniciado! Aguardando conexões...");
  }

  async shutdown(): Promise<void> {
    await this.db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MySQLMCPServer();
  
  process.on('SIGINT', async () => {
    console.error("\n🔄 Encerrando servidor...");
    await server.shutdown();
    process.exit(0);
  });

  server.run().catch((error) => {
    console.error("❌ Falha ao iniciar servidor:", error);
    process.exit(1);
  });
}