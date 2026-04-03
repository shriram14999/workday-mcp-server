import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  isOAuthAuthenticated,
  injectRefreshToken,
} from "./auth";
import { registerWorkerTools } from "./tools/workers";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Load Workday refresh token from env var at startup (for Render/cloud deployment)
const envRefreshToken = process.env.WORKDAY_REFRESH_TOKEN;
if (envRefreshToken) {
  injectRefreshToken(envRefreshToken);
  process.stderr.write("✅ Workday refresh token loaded from environment\n");
}

// ─── MCP Server Setup ─────────────────────────────────────────────────────────
const server = new McpServer({
  name: "workday-asor-mcp",
  version: "1.0.0",
});

registerWorkerTools(server);

// ─── SSE Transport Map (one per connected client) ─────────────────────────────
const transports = new Map<string, SSEServerTransport>();

// ─── OAuth Routes ─────────────────────────────────────────────────────────────

// Step 1: Visit this to start Workday login
app.get("/auth", (_req: Request, res: Response) => {
  const url = getAuthorizationUrl();
  console.log("🔐 Redirecting to Workday auth...");
  res.redirect(url);
});

// Step 2: Workday calls this after user logs in
app.get("/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send("❌ No authorization code received from Workday.");
    return;
  }
  try {
    await exchangeCodeForTokens(code);
    res.send(buildSuccessPage(String(process.env.PORT || 3001)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Auth callback error:", message);
    res.status(500).send(`Authentication failed: ${message}`);
  }
});

// Manual exchange — use when Workday redirect URI is https://www.google.com
// After Workday redirects to Google, copy the ?code= from the URL bar
// Then visit: http://localhost:3001/exchange?code=PASTE_CODE_HERE
app.get("/exchange", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.send(`
      <html>
        <body style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto;">
          <h2>🔑 Paste Your Authorization Code</h2>
          <p>1. Visit <a href="/auth">/auth</a> to log in to Workday</p>
          <p>2. After login, you land on Google — copy the <strong>code=</strong> value from the URL bar</p>
          <p>3. Paste it below and click Exchange:</p>
          <form method="GET" action="/exchange">
            <input name="code" placeholder="Paste code here..." style="width:100%;padding:10px;font-size:14px;margin-bottom:12px;" />
            <br/>
            <button type="submit" style="padding:12px 24px;background:#0078d4;color:white;border:none;cursor:pointer;font-size:16px;border-radius:4px;">
              Exchange for Tokens
            </button>
          </form>
        </body>
      </html>
    `);
    return;
  }
  try {
    await exchangeCodeForTokens(code);
    res.send(buildSuccessPage(String(process.env.PORT || 3001)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Exchange error:", message);
    res.status(500).send(`
      <html>
        <body style="font-family:sans-serif;padding:40px;">
          <h2>❌ Exchange Failed</h2>
          <p><strong>Error:</strong> ${message}</p>
          <p>⚠️ Codes expire in ~30 seconds — please <a href="/auth">authenticate again</a> and paste the code quickly.</p>
        </body>
      </html>
    `);
  }
});

function buildSuccessPage(port: string): string {
  return `
    <html>
      <body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h1>✅ Workday Authentication Successful!</h1>
        <p>Tokens saved. Your MCP server is connected to Workday.</p>
        <p>Go back to Flowise and test your agent!</p>
        <p><strong>SSE endpoint:</strong> <code>http://localhost:${port}/sse</code></p>
      </body>
    </html>
  `;
}

// ─── MCP SSE Routes (used by Flowise / Cursor) ────────────────────────────────

app.get("/sse", async (req: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// ─── MCP Streamable HTTP Route (used by Flowise Cloud) ───────────────────────

app.all("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = new McpServer({ name: "workday-asor-mcp", version: "1.0.0" });
  registerWorkerTools(mcpServer);
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ─── Health & Status Routes ───────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: "workday-asor-mcp",
    version: "1.0.0",
    workday_authenticated: isOAuthAuthenticated(),
    endpoints: {
      auth: "/auth",
      callback: "/callback",
      sse: "/sse",
      messages: "/messages",
    },
  });
});

app.get("/", (_req: Request, res: Response) => {
  const authenticated = isOAuthAuthenticated();
  res.send(`
    <html>
      <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto;">
        <h1>🏢 Workday ASOR MCP Server</h1>
        <p><strong>Status:</strong> Running</p>
        <p><strong>Workday Auth:</strong> ${authenticated ? "✅ Authenticated" : '❌ Not authenticated — <a href="/auth">Click here to authenticate</a>'}</p>
        <hr/>
        <h3>Available Endpoints:</h3>
        <ul>
          <li><a href="/auth">/auth</a> — Start Workday OAuth login</li>
          <li><a href="/health">/health</a> — Health check</li>
          <li>/sse — MCP SSE endpoint (for Flowise/Cursor)</li>
        </ul>
        <hr/>
        <h3>MCP Tools Available:</h3>
        <ul>
          <li>list_workers — List all workers</li>
          <li>get_worker — Get worker by ID</li>
          <li>search_workers — Search workers by name/email</li>
          <li>get_worker_profile — Get worker public profile</li>
          <li>list_organizations — List all organizations</li>
          <li>list_job_profiles — List all job profiles</li>
        </ul>
      </body>
    </html>
  `);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`\n🚀 Workday ASOR MCP Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Next Steps:`);
  console.log(`   1. Visit http://localhost:${PORT}/auth to authenticate with Workday`);
  console.log(`   2. Point Flowise to: http://localhost:${PORT}/sse`);
  console.log(`   3. Check status at: http://localhost:${PORT}/health\n`);
});
