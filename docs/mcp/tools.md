---
id: mcp-tools
title: MCP Tools Reference
---

## listTanStackIntegrations

Returns available integrations.

**Parameters:** None

**Response:**

```typescript
interface Integration {
  id: string           // e.g., "tanstack-query"
  name: string         // e.g., "TanStack Query"
  description: string
  category: string     // "tanstack", "auth", "database", etc.
  dependsOn: string[]  // Required integrations
  conflicts: string[]  // Incompatible integrations
  hasOptions: boolean  // Has configurable options
}
```

---

## createTanStackApplication

Creates a new project.

**Parameters:**

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `projectName` | string | Yes | - |
| `targetDir` | string | Yes | - |
| `integrations` | string[] | No | `[]` |
| `integrationOptions` | object | No | `{}` |
| `tailwind` | boolean | No | `true` |
| `packageManager` | string | No | `"pnpm"` |

**Example:**

```json
{
  "projectName": "my-app",
  "targetDir": "/Users/me/projects/my-app",
  "integrations": ["tanstack-query", "clerk", "drizzle"],
  "integrationOptions": {
    "drizzle": { "database": "postgres" }
  }
}
```

**Integration Options:**

```json
// Drizzle
{ "drizzle": { "database": "postgres" | "mysql" | "sqlite" } }

// Prisma
{ "prisma": { "database": "postgresql" | "mysql" | "sqlite" | "mongodb" } }
```

**Errors:**
- Invalid project name
- Directory exists
- Unknown integration ID
- Conflicting integrations

---

## Programmatic Usage

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['@tanstack/cli', 'mcp']
})

const client = new Client({ name: 'my-client', version: '1.0.0' }, {})
await client.connect(transport)

// List integrations
const list = await client.callTool('listTanStackIntegrations', {})

// Create project
const result = await client.callTool('createTanStackApplication', {
  projectName: 'my-app',
  targetDir: '/path/to/my-app',
  integrations: ['tanstack-query', 'clerk']
})
```
