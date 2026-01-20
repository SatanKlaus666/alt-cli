# TanStack CLI

CLI for scaffolding TanStack Start projects with integrations.

## Quick Start

```bash
# Create a new project
npx @tanstack/cli create my-app

# Or with integrations
npx @tanstack/cli create my-app --integrations tanstack-query,clerk,drizzle
```

## Features

- **Interactive scaffolding** - Guided project creation with prompts
- **30+ integrations** - Auth, database, deployment, and more
- **Custom templates** - Create and share project presets
- **MCP server** - AI agent support for Claude and others

## Documentation

- [Overview](./docs/overview.md)
- [CLI Reference](./docs/cli-reference.md)
- [Available Integrations](./docs/integrations.md)
- [Custom Templates](./docs/templates.md)
- [Creating Integrations](./docs/creating-integrations.md)
- [MCP Server](./docs/mcp/overview.md)
- [Contributing](./CONTRIBUTING.md)

## Integrations

| Category | Integrations |
|----------|-------------|
| TanStack | Query, Form, Table, Store, Virtual, AI, DB, Pacer |
| Auth | Clerk, Better Auth, WorkOS |
| Database | Neon, Convex |
| ORM | Drizzle, Prisma |
| Deployment | Vercel, Netlify, Cloudflare, Nitro |
| Tooling | ESLint, Biome, shadcn/ui, Storybook |
| API | tRPC, oRPC |
| Monitoring | Sentry |
| i18n | Paraglide |
| CMS | Strapi |

## License

MIT
