# TanStack CLI

Scaffolds TanStack Start projects by composing integrations (auth, db, deploy, etc). Powers the Builder feature on tanstack.com (usually `../tanstack.com`).

## Commands

```bash
pnpm build:cli    # Build
pnpm test         # Test
```

## Responsibilities

- **Engine**: Compiles selected integrations into a project. Uses EJS templating. See `packages/cli/src/engine/types.ts` for integration schema.
- **API**: Fetches integration definitions from GitHub (`integrations/` folder in this repo).
- **Integrations**: Each integration defines hooks (provider, vite-plugin, devtools), dependencies, and asset files to inject.
