"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWorkerTools = registerWorkerTools;
const zod_1 = require("zod");
const workday_1 = require("../workday");
function registerWorkerTools(server) {
    // ── List Workers ──────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - MCP SDK deep type inference
    server.tool("list_workers", "List workers from Workday with optional pagination", {
        limit: zod_1.z.number().min(1).max(100).optional().describe("Number of workers to return (max 100), default 10"),
        offset: zod_1.z.number().min(0).optional().describe("Number of records to skip for pagination, default 0"),
    }, async ({ limit, offset }) => {
        try {
            const data = await (0, workday_1.getWorkers)(limit ?? 10, offset ?? 0);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error listing workers: ${message}` }],
                isError: true,
            };
        }
    });
    // ── Get Worker By ID ──────────────────────────────────────────────────────
    server.tool("get_worker", "Get detailed information about a specific Workday worker by their ID", {
        workerId: zod_1.z.string().describe("The Workday worker ID"),
    }, async ({ workerId }) => {
        try {
            const data = await (0, workday_1.getWorkerById)(workerId);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error getting worker: ${message}` }],
                isError: true,
            };
        }
    });
    // ── Search Workers ────────────────────────────────────────────────────────
    server.tool("search_workers", "Search for workers in Workday by name, email, or other keyword", {
        query: zod_1.z.string().describe("Search term such as name or email"),
        limit: zod_1.z.number().min(1).max(50).optional().describe("Number of results to return, default 10"),
    }, async ({ query, limit }) => {
        try {
            const data = await (0, workday_1.searchWorkers)(query, limit ?? 10);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error searching workers: ${message}` }],
                isError: true,
            };
        }
    });
    // ── Get Worker Profile ────────────────────────────────────────────────────
    server.tool("get_worker_profile", "Get the public profile of a Workday worker including their job title and contact info", {
        workerId: zod_1.z.string().describe("The Workday worker ID"),
    }, async ({ workerId }) => {
        try {
            const data = await (0, workday_1.getWorkerProfile)(workerId);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error getting worker profile: ${message}` }],
                isError: true,
            };
        }
    });
    // ── List Organizations ────────────────────────────────────────────────────
    server.tool("list_organizations", "List all organizations in Workday", {
        limit: zod_1.z.number().min(1).max(100).optional().describe("Number of organizations to return, default 20"),
    }, async ({ limit }) => {
        try {
            const data = await (0, workday_1.getOrganizations)(limit ?? 20);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error listing organizations: ${message}` }],
                isError: true,
            };
        }
    });
    // ── List Job Profiles ─────────────────────────────────────────────────────
    server.tool("list_job_profiles", "List all job profiles available in Workday", {
        limit: zod_1.z.number().min(1).max(100).optional().describe("Number of job profiles to return, default 20"),
    }, async ({ limit }) => {
        try {
            const data = await (0, workday_1.getJobProfiles)(limit ?? 20);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error listing job profiles: ${message}` }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=workers.js.map