"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkers = getWorkers;
exports.getWorkerById = getWorkerById;
exports.searchWorkers = searchWorkers;
exports.getWorkerProfile = getWorkerProfile;
exports.getOrganizations = getOrganizations;
exports.getJobProfiles = getJobProfiles;
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./auth");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const WORKDAY_API_BASE = process.env.WORKDAY_API_BASE;
async function workdayGet(path) {
    const token = await (0, auth_1.getOAuthAccessToken)();
    try {
        const response = await axios_1.default.get(`${WORKDAY_API_BASE}${path}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (err) {
        const error = err;
        const status = error.response?.status;
        const data = error.response?.data;
        throw new Error(`Workday API error [${status}]: ${JSON.stringify(data) || error.message}`);
    }
}
// ─── Worker APIs ──────────────────────────────────────────────────────────────
async function getWorkers(limit = 10, offset = 0) {
    return workdayGet(`/workers?limit=${limit}&offset=${offset}`);
}
async function getWorkerById(workerId) {
    return workdayGet(`/workers/${workerId}`);
}
async function searchWorkers(query, limit = 10) {
    return workdayGet(`/workers?search=${encodeURIComponent(query)}&limit=${limit}`);
}
async function getWorkerProfile(workerId) {
    return workdayGet(`/workers/${workerId}/publicProfile`);
}
// ─── Organization APIs ────────────────────────────────────────────────────────
async function getOrganizations(limit = 20) {
    return workdayGet(`/organizations?limit=${limit}`);
}
// ─── Job Profile APIs ─────────────────────────────────────────────────────────
async function getJobProfiles(limit = 20) {
    return workdayGet(`/jobProfiles?limit=${limit}`);
}
//# sourceMappingURL=workday.js.map