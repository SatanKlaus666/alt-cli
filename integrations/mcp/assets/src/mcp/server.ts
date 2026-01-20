import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerHelloTool } from './tools/hello'

export function createMcpServer() {
  const server = new McpServer({
    name: 'tanstack-app',
    version: '1.0.0',
  })

  // Register tools
  registerHelloTool(server)

  return server
}

export async function startMcpServer() {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
