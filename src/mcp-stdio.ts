import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { loadTokensFromFile, injectRefreshToken } from "./auth";
import { registerWorkerTools } from "./tools/workers";

dotenv.config();

async function main() {
  // Try loading refresh token from environment variable first (for cloud/Flowise Cloud use)
  const envRefreshToken = process.env.WORKDAY_REFRESH_TOKEN;
  if (envRefreshToken) {
    process.stderr.write("✅ Using refresh token from environment variable\n");
    injectRefreshToken(envRefreshToken);
  } else {
    // Fall back to file-based token (for local use)
    const loaded = loadTokensFromFile();
    if (!loaded) {
      process.stderr.write(
        "⚠️  No Workday tokens found.\n" +
        "   Set WORKDAY_REFRESH_TOKEN env var or authenticate at: http://localhost:3001/auth\n"
      );
    }
  }

  const server = new McpServer({
    name: "workday-asor-mcp",
    version: "1.0.0",
  });

  registerWorkerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
