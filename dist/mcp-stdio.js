"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./auth");
const workers_1 = require("./tools/workers");
dotenv_1.default.config();
async function main() {
    // Load saved tokens from file (set by HTTP server after browser auth)
    const loaded = (0, auth_1.loadTokensFromFile)();
    if (!loaded) {
        process.stderr.write("⚠️  No saved Workday tokens found.\n" +
            "   Please authenticate first by visiting: http://localhost:3001/auth\n" +
            "   Then restart Flowise or re-fetch the MCP tools.\n");
    }
    const server = new mcp_js_1.McpServer({
        name: "workday-asor-mcp",
        version: "1.0.0",
    });
    (0, workers_1.registerWorkerTools)(server);
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=mcp-stdio.js.map