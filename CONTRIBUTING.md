# Contributing

Guide for contributing to TanStack CLI.

## Questions

If you have questions about implementation details, help or support, please use our dedicated community forum at [GitHub Discussions](https://github.com/tanstack/cli/discussions). Issues opened for questions will be closed and redirected to the forum.

## Reporting Issues

If you have found what you think is a bug, please [file an issue](https://github.com/tanstack/cli/issues/new). Issues identified as implementation questions or non-issues will be closed and redirected to [GitHub Discussions](https://github.com/tanstack/cli/discussions).

## Suggesting New Features

To suggest a feature, first create an issue if it doesn't already exist. We'll discuss use-cases and then how it could be implemented.

---

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+

### Clone and Install

```bash
git clone https://github.com/TanStack/cli.git
cd cli
pnpm install
```

### Build

```bash
# Build the CLI package
pnpm build:cli

# Or watch mode
cd packages/cli && pnpm build --watch
```

### Run Tests

```bash
# Type checking
pnpm test:types

# Unit tests
pnpm test:lib

# All tests
pnpm test
```

---

## Project Structure

```
cli/
├── packages/cli/         # Main CLI package (@tanstack/cli)
│   ├── src/
│   │   ├── bin.ts       # CLI entry point
│   │   ├── api/         # Integration fetching
│   │   ├── commands/    # CLI commands
│   │   ├── engine/      # Compilation engine
│   │   └── templates/   # Base templates
│   └── package.json
│
├── integrations/         # Integration definitions
│   ├── manifest.json    # Integration catalog
│   └── {id}/            # Individual integrations
│
└── docs/                # Documentation
```

---

## Development Workflow

Before proceeding with development, ensure you match one of the following criteria:

- Fixing a small bug
- Fixing a larger issue that has been previously discussed and agreed-upon by maintainers
- Adding a new feature that has been previously discussed and agreed-upon by maintainers

### Testing CLI Changes

```bash
# Build the CLI
cd packages/cli && pnpm build

# Run directly
node dist/bin.mjs create test-app

# Or link globally
pnpm link --global
tanstack create test-app
```

### Testing with Local Integrations

```bash
# Use the integrations/ folder directly
tanstack create test-app --integrations-path ./integrations

# Or test a specific integration
tanstack create test-app --integrations my-integration --integrations-path ./integrations
```

### Testing MCP Server

```bash
# Start in stdio mode
node packages/cli/dist/bin.mjs mcp

# Start in SSE mode
node packages/cli/dist/bin.mjs mcp --sse --port 3000
```

---

## Adding a New Integration

1. Create the integration folder:

```bash
mkdir -p integrations/my-integration/assets/src/integrations/my-feature
```

2. Create `info.json`:

```json
{
  "name": "My Integration",
  "description": "What it does",
  "type": "integration",
  "phase": "integration",
  "category": "tooling",
  "modes": ["file-router"]
}
```

3. Add asset files to `assets/`

4. Add dependencies to `package.json` (optional)

5. Update `integrations/manifest.json`:

```json
{
  "integrations": [
    {
      "id": "my-integration",
      "name": "My Integration",
      "description": "What it does",
      "type": "integration",
      "category": "tooling",
      "modes": ["file-router"],
      "dependsOn": [],
      "conflicts": [],
      "hasOptions": false
    }
  ]
}
```

6. Test:

```bash
tanstack create test-app --integrations my-integration --integrations-path ./integrations
```

---

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- No `any` types (use `unknown` and narrow)
- Prefer functional patterns

### Formatting

```bash
pnpm format
```

### Linting

```bash
pnpm test:eslint
```

---

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Document your changes in the appropriate documentation markdown pages
6. Create a changeset for your changes: `pnpm changeset`
7. Commit and push
8. Open a pull request

### PR Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Types check (`pnpm test:types`)
- [ ] Lint passes (`pnpm test:eslint`)
- [ ] Documentation updated (if needed)
- [ ] Changeset added (if user-facing change)

---

## Creating a Changeset

For user-facing changes, create a changeset:

```bash
pnpm changeset
```

Select the packages affected and describe the change.

---

## Getting Help

- [GitHub Discussions](https://github.com/TanStack/cli/discussions) - Questions and ideas
- [GitHub Issues](https://github.com/TanStack/cli/issues) - Bug reports
- [Discord](https://tlinz.com/discord) - Real-time chat
