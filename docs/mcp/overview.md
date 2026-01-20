---
id: mcp-overview
title: MCP Server
---

MCP server for AI agents to create TanStack Start projects.

## Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "tanstack": {
      "command": "npx",
      "args": ["@tanstack/cli", "mcp"]
    }
  }
}
```

Restart Claude Desktop. Then:

> "Create a TanStack Start project called 'my-app' with Clerk auth and Drizzle ORM"

## Manual Start

```bash
# Stdio (default, for MCP clients)
tanstack mcp

# HTTP/SSE
tanstack mcp --sse --port 8080
```

## Tools

| Tool | Description |
|------|-------------|
| `listTanStackIntegrations` | Get available integrations |
| `createTanStackApplication` | Create a project |

See [Tools Reference](./tools.md) for parameters and examples.
