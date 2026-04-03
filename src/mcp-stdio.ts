import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { loadTokensFromFile } from "./auth";
import { registerWorkerTools } from "./tools/workers";

dotenv.config();

async function main() {
  // Load saved tokens from file (set by HTTP server after browser auth)
  const loaded = loadTokensFromFile();
  if (!loaded) {
    process.stderr.write(
      "⚠️  No saved Workday tokens found.\n" +
      "   Please authenticate first by visiting: http://localhost:3001/auth\n" +
      "   Then restart Flowise or re-fetch the MCP tools.\n"
    );
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
