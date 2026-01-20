import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerHelloTool(server: McpServer) {
  server.tool(
    'hello',
    'Say hello to someone',
    {
      name: z.string().describe('Name to greet'),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: 'text',
            text: `Hello, ${name}! Welcome to your TanStack app.`,
          },
        ],
      }
    },
  )
}
