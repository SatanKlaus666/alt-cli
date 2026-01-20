#!/usr/bin/env node

import { resolve } from 'node:path'
import { Command } from 'commander'
import { runCreate } from './commands/create.js'
import { runMcp } from './commands/mcp.js'
import { compileIntegration, initIntegration } from './engine/custom-addons/integration.js'
import { compileTemplate, initTemplate } from './engine/custom-addons/template.js'

const program = new Command()

program
  .name('tanstack')
  .description('TanStack CLI for scaffolding and tooling')
  .version('0.0.1')

program
  .command('create')
  .argument('[project-name]', 'name of the project')
  .option('--template <template>', 'URL to a custom template JSON file')
  .option('--package-manager <pm>', 'package manager (npm, pnpm, yarn, bun)')
  .option('--integrations <integrations>', 'comma-separated list of integration IDs')
  .option('--no-install', 'skip installing dependencies')
  .option('--no-git', 'skip initializing git repository')
  .option('--no-tailwind', 'skip tailwind CSS')
  .option('-y, --yes', 'skip prompts and use defaults')
  .option('--target-dir <path>', 'target directory for the project')
  .option('--integrations-path <path>', 'local path to integrations directory (for development)')
  .description('Create a new TanStack Start project')
  .action(runCreate)

program
  .command('mcp')
  .option('--sse', 'run in SSE mode (for HTTP transport)')
  .option('--port <port>', 'port for SSE server', '8080')
  .description('Start the MCP server for AI agents')
  .action(runMcp)

// Integration commands
const integrationCommand = program.command('integration')

integrationCommand
  .command('init')
  .option('--integrations-path <path>', 'local path to integrations directory (for development)')
  .description('Initialize an integration from the current project')
  .action(async (options: { integrationsPath?: string }) => {
    try {
      await initIntegration(resolve(process.cwd()), options.integrationsPath)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An error occurred')
      process.exit(1)
    }
  })

integrationCommand
  .command('compile')
  .option('--integrations-path <path>', 'local path to integrations directory (for development)')
  .description('Compile/update the integration from the current project')
  .action(async (options: { integrationsPath?: string }) => {
    try {
      await compileIntegration(resolve(process.cwd()), options.integrationsPath)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An error occurred')
      process.exit(1)
    }
  })

// Custom template commands
const templateCommand = program.command('template')

templateCommand
  .command('init')
  .description('Initialize a custom template from the current project')
  .action(async () => {
    try {
      await initTemplate(resolve(process.cwd()))
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An error occurred')
      process.exit(1)
    }
  })

templateCommand
  .command('compile')
  .description('Compile/update the custom template from the current project')
  .action(async () => {
    try {
      await compileTemplate(resolve(process.cwd()))
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An error occurred')
      process.exit(1)
    }
  })

program.parse()
