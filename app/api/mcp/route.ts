import { createMcpServer } from "@/lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export async function POST(request: Request) {
  // Create a fresh server + transport per request (stateless mode).
  // WebStandardStreamableHTTPServerTransport uses Web Standard Request/Response,
  // which is what Next.js App Router provides.
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function GET() {
  return new Response("GudCal MCP Server. Use POST with MCP protocol.", {
    status: 200,
  });
}

export async function DELETE() {
  // Stateless mode does not support session termination
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed in stateless mode.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
