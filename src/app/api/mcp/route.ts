import crypto from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMockExamMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const configuredKey = process.env.MOCKEXAM_API_KEY?.trim();
  if (!configuredKey) return false;

  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const providedKey = match[1].trim();
  const a = Buffer.from(configuredKey, "utf8");
  const b = Buffer.from(providedKey, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function unauthorizedResponse(): Response {
  const configured = Boolean(process.env.MOCKEXAM_API_KEY?.trim());
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: configured
          ? "Unauthorized: Invalid or missing Bearer token."
          : "Server misconfigured: MOCKEXAM_API_KEY is not set.",
      },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="MockExam Pro MCP"',
      },
    }
  );
}

async function handleMcpRequest(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return unauthorizedResponse();
  }

  const server = createMockExamMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    return response;
  } finally {
    // Stateless per-request lifecycle: clean up transport/server once response finishes or fails
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed: stateless MCP server does not expose a standalone GET SSE stream.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST",
      },
    }
  );
}

export async function DELETE() {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed: stateless MCP server does not maintain sessions.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST",
      },
    }
  );
}
