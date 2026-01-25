import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'
import { z } from 'zod'
import { fetchIntegrations, fetchManifest } from '../api/fetch.js'
import { compile } from '../engine/compile.js'
import { registerDocTools } from '../mcp/tools.js'
import type { RouterMode } from '../engine/types.js'

interface McpOptions {
  sse?: boolean
  port?: string
}

function createServer() {
  const server = new McpServer({
    name: 'TanStack CLI',
    version: '0.0.1',
  })

  server.tool(
    'listTanStackIntegrations',
    'List available integrations for creating TanStack applications',
    {},
    async () => {
      try {
        const manifest = await fetchManifest()
        const integrations = manifest.integrations
          .filter((a) => a.modes.includes('file-router'))
          .map((integration) => ({
            id: integration.id,
            name: integration.name,
            description: integration.description,
            category: integration.category,
            dependsOn: integration.dependsOn,
            exclusive: integration.exclusive,
            hasOptions: integration.hasOptions,
          }))

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(integrations, null, 2),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching integrations: ${error}`,
            },
          ],
        }
      }
    },
  )

  // Register documentation/ecosystem tools
  registerDocTools(server)

  server.tool(
    'createTanStackApplication',
    'Create a new TanStack Start application',
    {
      projectName: z
        .string()
        .describe('The name of the project (will be the directory name)'),
      targetDir: z
        .string()
        .describe('Absolute path where the project should be created'),
      integrations: z
        .array(z.string())
        .optional()
        .describe(
          'Array of integration IDs to include. Use listTanStackIntegrations to see available options.',
        ),
      integrationOptions: z
        .record(z.record(z.unknown()))
        .optional()
        .describe(
          'Configuration for integrations. Format: {"integrationId": {"optionName": "value"}}',
        ),
      tailwind: z.boolean().optional().describe('Include Tailwind CSS (default: true)'),
      packageManager: z
        .enum(['npm', 'pnpm', 'yarn', 'bun', 'deno'])
        .optional()
        .describe('Package manager to use (default: pnpm)'),
    },
    async ({ projectName, targetDir, integrations, integrationOptions, tailwind, packageManager }) => {
      try {
        const { mkdirSync, writeFileSync } = await import('node:fs')
        const { resolve } = await import('node:path')
        const { BINARY_PREFIX } = await import('../api/fetch.js')
        const { execSync } = await import('node:child_process')

        // Fetch integration definitions if needed
        let chosenIntegrations: Array<Awaited<ReturnType<typeof fetchIntegrations>>[number]> = []
        if (integrations?.length) {
          chosenIntegrations = await fetchIntegrations(integrations)
        }

        // Compile project
        const output = compile({
          projectName,
          framework: 'react',
          mode: 'file-router' as RouterMode,
          typescript: true,
          tailwind: tailwind ?? true,
          packageManager: packageManager ?? 'pnpm',
          chosenIntegrations,
          integrationOptions: integrationOptions ?? {},
        })

        // Create directory and write files
        mkdirSync(targetDir, { recursive: true })

        for (const [filePath, content] of Object.entries(output.files)) {
          const fullPath = resolve(targetDir, filePath)
          const dir = resolve(fullPath, '..')
          mkdirSync(dir, { recursive: true })
          
          // Handle binary files (base64 encoded with prefix)
          if (content.startsWith(BINARY_PREFIX)) {
            const base64Data = content.slice(BINARY_PREFIX.length)
            writeFileSync(fullPath, Buffer.from(base64Data, 'base64'))
          } else {
            writeFileSync(fullPath, content, 'utf-8')
          }
        }

        // Initialize git
        try {
          execSync('git init', { cwd: targetDir, stdio: 'ignore' })
        } catch {
          // Git init failed, continue anyway
        }

        // Build response
        const envVarList =
          output.envVars.length > 0
            ? `\n\nRequired environment variables:\n${output.envVars.map((e) => `- ${e.name}: ${e.description}`).join('\n')}`
            : ''

        const warnings =
          output.warnings.length > 0
            ? `\n\nWarnings:\n${output.warnings.map((w) => `- ${w}`).join('\n')}`
            : ''

        return {
          content: [
            {
              type: 'text' as const,
              text: `Project "${projectName}" created successfully at ${targetDir}

Files created: ${Object.keys(output.files).length}
Integrations included: ${chosenIntegrations.map((a) => a.name).join(', ') || 'none'}${envVarList}${warnings}

Next steps:
1. cd ${targetDir}
2. ${packageManager ?? 'pnpm'} install
3. ${packageManager ?? 'pnpm'} dev`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating application: ${error}`,
            },
          ],
        }
      }
    },
  )

  return server
}

export async function runMcp(options: McpOptions): Promise<void> {
  const server = createServer()

  if (options.sse) {
    const app = express()
    let transport: SSEServerTransport | null = null

    app.get('/sse', (_req, res) => {
      transport = new SSEServerTransport('/messages', res)
      server.connect(transport)
    })

    app.post('/messages', (req, res) => {
      if (transport) {
        transport.handlePostMessage(req, res)
      }
    })

    const port = parseInt(options.port ?? '8080', 10)
    app.listen(port, () => {
      console.log(`MCP server running at http://localhost:${port}/sse`)
    })
  } else {
    const transport = new StdioServerTransport()
    await server.connect(transport)
  }
}
