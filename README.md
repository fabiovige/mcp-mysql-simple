# Servidor MCP MySQL Otimizado

Servidor MCP (Model Context Protocol) para MySQL com arquitetura limpa e princípios SOLID.

## 🆕 Melhorias na v1.1.0

### ✨ Arquitetura Otimizada
- **Separação de Responsabilidades**: Classes especializadas para cada função
- **SOLID Principles**: Código mais maintível e extensível
- **Clean Architecture**: Estrutura modular e testável

### 🔒 Segurança Aprimorada
- **Validação de Queries**: Proteção contra operações perigosas
- **Sanitização**: Nomes de tabelas validados
- **SQL Injection Protection**: Parâmetros seguros

### 🚀 Performance e Confiabilidade
- **Conexão Reutilizada**: Gerenciamento eficiente de recursos
- **Tratamento de Erros**: Mensagens consistentes e informativas
- **Shutdown Gracioso**: Encerramento controlado de conexões

## 🏗️ Arquitetura

```
MySQLMCPServer
├── DatabaseConfig (Configurações)
├── DatabaseConnection (Conexão MySQL)
├── QueryValidator (Validação e Segurança)
├── ResponseFormatter (Formatação)
├── ToolsHandler (Ferramentas)
├── ResourcesHandler (Recursos)
└── PromptsHandler (Templates)
```

## 🎯 Conceitos MCP Implementados

### 1. **Tools (Ferramentas)**
- `execute_query`: Executa queries SQL com validação
- `describe_table`: Descreve estrutura de tabelas

### 2. **Resources (Recursos)**
- `mysql://databases`: Lista de bancos disponíveis
- `mysql://tables`: Tabelas do banco atual
- `mysql://schema`: Schema completo

### 3. **Prompts (Templates)**
- `analyze_table`: Análise detalhada de tabela
- `find_large_tables`: Tabelas com mais registros
- `database_overview`: Visão geral do banco

## 🚀 Instalação e Uso

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar MySQL
Crie um arquivo `.env`:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=seu_banco
```

### 3. Compilar e Executar
```bash
# Compilar
npm run build

# Executar
npm start

# Desenvolvimento
npm run dev
```

### 4. Testar Conexão
```bash
npm run test:connection
```

## 🔧 Configuração Claude Desktop

Adicione ao `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mysql-optimized": {
      "command": "node",
      "args": ["/caminho/para/dist/index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "sua_senha",
        "MYSQL_DATABASE": "seu_banco"
      }
    }
  }
}
```

## 🛡️ Segurança

### Validações Implementadas:
- ✅ Bloqueio de `DROP DATABASE/TABLE`
- ✅ Proteção contra `DELETE ... WHERE 1=1`
- ✅ Sanitização de nomes de tabelas
- ✅ Validação de queries vazias
- ✅ Tratamento seguro de parâmetros

### Práticas de Segurança:
- 🔒 Conexões controladas
- 🔒 Logs de erro seguros
- 🔒 Isolamento de responsabilidades
- 🔒 Validação de entrada

## 📊 Exemplo de Uso

```javascript
// Executar query segura
{
  "name": "execute_query",
  "arguments": {
    "query": "SELECT * FROM usuarios LIMIT 5",
    "database": "meu_banco"
  }
}

// Analisar tabela
{
  "name": "describe_table",
  "arguments": {
    "table_name": "usuarios"
  }
}
```

## 🔍 Debug e Logs

O servidor fornece logs informativos:
- ✅ Conexão estabelecida
- 🔄 Queries executadas
- ❌ Erros com detalhes
- 🔚 Shutdown gracioso

## 📈 Roadmap

- [ ] Cache de resultados
- [ ] Métricas de performance  
- [ ] Pool de conexões
- [ ] Suporte a transações
- [ ] Interface web de monitoramento

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Changelog

### v1.1.0 (2025-01-XX)
- ✨ Arquitetura otimizada com SOLID
- 🔒 Validação e segurança aprimoradas
- 🚀 Performance melhorada
- 📚 Documentação expandida

### v1.0.0 (2025-01-XX)
- 🎉 Versão inicial
- 🔧 Implementação básica MCP
- 🗄️ Suporte MySQL completo

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Criado com ❤️ para demonstrar o protocolo MCP da Anthropic**