import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

import { MCP_URL } from "./runtime-paths"

type ToolResult = {
  content?: Array<{
    type?: string
    text?: string
  }>
}

export async function createMcpClient() {
  const client = new Client(
    { name: "synod-frontend-e2e", version: "1.0.0" },
    { capabilities: {} },
  )

  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_URL}/mcp`))
  await client.connect(transport)

  return {
    client,
    async close() {
      await client.close()
    },
  }
}

export async function callMcpTool<T>(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const result = (await client.callTool({
    name,
    arguments: args,
  })) as ToolResult

  const text = result.content?.find((entry) => entry.type === "text")?.text
  if (!text) {
    throw new Error(`Tool ${name} did not return a text payload`)
  }

  return JSON.parse(text) as T
}
