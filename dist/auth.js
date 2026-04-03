"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTokensFromFile = loadTokensFromFile;
exports.getAuthorizationUrl = getAuthorizationUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.getOAuthAccessToken = getOAuthAccessToken;
exports.getAsorAccessToken = getAsorAccessToken;
exports.isOAuthAuthenticated = isOAuthAuthenticated;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TOKEN_FILE = path_1.default.join(process.env.USERPROFILE || process.env.HOME || ".", ".workday-mcp-tokens.json");
const { WORKDAY_AUTH_URL, WORKDAY_TOKEN_URL, WORKDAY_CLIENT_ID, WORKDAY_CLIENT_SECRET, WORKDAY_REDIRECT_URI, WORKDAY_SCOPE, WORKDAY_ASOR_CLIENT_ID, WORKDAY_ASOR_CLIENT_SECRET, WORKDAY_ASOR_TOKEN_URL, } = process.env;
// In-memory token store — persisted to file so stdio server can reuse it
let oauthTokenStore = null;
let asorTokenStore = null;
function saveTokensToFile(store) {
    try {
        fs_1.default.writeFileSync(TOKEN_FILE, JSON.stringify(store, null, 2), "utf-8");
        console.log(`✅ Tokens saved to ${TOKEN_FILE}`);
    }
    catch (err) {
        console.error("⚠️  Could not save tokens to file:", err);
    }
}
function loadTokensFromFile() {
    try {
        if (!fs_1.default.existsSync(TOKEN_FILE))
            return false;
        const raw = fs_1.default.readFileSync(TOKEN_FILE, "utf-8");
        const store = JSON.parse(raw);
        // Only load if refresh token exists (access token may be expired)
        if (store.refresh_token) {
            oauthTokenStore = store;
            console.log("✅ Tokens loaded from file");
            return true;
        }
    }
    catch (err) {
        console.error("⚠️  Could not load tokens from file:", err);
    }
    return false;
}
// ─── OAuth 2.0 Auth Code Flow (for user-delegated access) ───────────────────
function getAuthorizationUrl() {
    const params = new URLSearchParams({
        client_id: WORKDAY_CLIENT_ID,
        response_type: "code",
        redirect_uri: WORKDAY_REDIRECT_URI,
        scope: WORKDAY_SCOPE || "full",
    });
    return `${WORKDAY_AUTH_URL}?${params.toString()}`;
}
async function exchangeCodeForTokens(code) {
    const response = await axios_1.default.post(WORKDAY_TOKEN_URL, new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: WORKDAY_REDIRECT_URI,
        client_id: WORKDAY_CLIENT_ID,
        client_secret: WORKDAY_CLIENT_SECRET,
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    oauthTokenStore = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: Date.now() + response.data.expires_in * 1000,
    };
    saveTokensToFile(oauthTokenStore);
    console.log("✅ OAuth tokens stored successfully");
}
async function getOAuthAccessToken() {
    if (!oauthTokenStore) {
        throw new Error("Not authenticated. Visit http://localhost:3001/auth to log in with Workday.");
    }
    if (Date.now() >= oauthTokenStore.expires_at - 60000) {
        console.log("🔄 Refreshing OAuth access token...");
        const response = await axios_1.default.post(WORKDAY_TOKEN_URL, new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: oauthTokenStore.refresh_token,
            client_id: WORKDAY_CLIENT_ID,
            client_secret: WORKDAY_CLIENT_SECRET,
        }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        oauthTokenStore = {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || oauthTokenStore.refresh_token,
            expires_at: Date.now() + response.data.expires_in * 1000,
        };
        saveTokensToFile(oauthTokenStore);
        console.log("✅ OAuth token refreshed");
    }
    return oauthTokenStore.access_token;
}
// ─── ASOR Client Credentials Flow (for system-to-system API access) ──────────
async function getAsorAccessToken() {
    if (asorTokenStore &&
        Date.now() < asorTokenStore.expires_at - 60000) {
        return asorTokenStore.access_token;
    }
    console.log("🔄 Getting ASOR access token...");
    const response = await axios_1.default.post(WORKDAY_ASOR_TOKEN_URL, new URLSearchParams({
        grant_type: "client_credentials",
        client_id: WORKDAY_ASOR_CLIENT_ID,
        client_secret: WORKDAY_ASOR_CLIENT_SECRET,
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    asorTokenStore = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || "",
        expires_at: Date.now() + (response.data.expires_in || 3600) * 1000,
    };
    console.log("✅ ASOR token obtained");
    return asorTokenStore.access_token;
}
function isOAuthAuthenticated() {
    return oauthTokenStore !== null;
}
//# sourceMappingURL=auth.js.map