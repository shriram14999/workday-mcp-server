import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_FILE = path.join(
  process.env.USERPROFILE || process.env.HOME || ".",
  ".workday-mcp-tokens.json"
);

const {
  WORKDAY_AUTH_URL,
  WORKDAY_TOKEN_URL,
  WORKDAY_CLIENT_ID,
  WORKDAY_CLIENT_SECRET,
  WORKDAY_REDIRECT_URI,
  WORKDAY_SCOPE,
  WORKDAY_ASOR_CLIENT_ID,
  WORKDAY_ASOR_CLIENT_SECRET,
  WORKDAY_ASOR_TOKEN_URL,
} = process.env;

interface TokenStore {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// In-memory token store — persisted to file so stdio server can reuse it
let oauthTokenStore: TokenStore | null = null;
let asorTokenStore: TokenStore | null = null;

function saveTokensToFile(store: TokenStore): void {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(store, null, 2), "utf-8");
    console.log(`✅ Tokens saved to ${TOKEN_FILE}`);
  } catch (err) {
    console.error("⚠️  Could not save tokens to file:", err);
  }
}

export function loadTokensFromFile(): boolean {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return false;
    const raw = fs.readFileSync(TOKEN_FILE, "utf-8");
    const store = JSON.parse(raw) as TokenStore;
    // Only load if refresh token exists (access token may be expired)
    if (store.refresh_token) {
      oauthTokenStore = store;
      console.log("✅ Tokens loaded from file");
      return true;
    }
  } catch (err) {
    console.error("⚠️  Could not load tokens from file:", err);
  }
  return false;
}

// ─── OAuth 2.0 Auth Code Flow (for user-delegated access) ───────────────────

export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: WORKDAY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: WORKDAY_REDIRECT_URI!,
    scope: WORKDAY_SCOPE || "full",
  });
  return `${WORKDAY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const response = await axios.post(
    WORKDAY_TOKEN_URL!,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: WORKDAY_REDIRECT_URI!,
      client_id: WORKDAY_CLIENT_ID!,
      client_secret: WORKDAY_CLIENT_SECRET!,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  oauthTokenStore = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    expires_at: Date.now() + response.data.expires_in * 1000,
  };
  saveTokensToFile(oauthTokenStore);
  console.log("✅ OAuth tokens stored successfully");
}

export async function getOAuthAccessToken(): Promise<string> {
  if (!oauthTokenStore) {
    throw new Error(
      "Not authenticated. Visit http://localhost:3001/auth to log in with Workday."
    );
  }

  if (Date.now() >= oauthTokenStore.expires_at - 60000) {
    console.log("🔄 Refreshing OAuth access token...");
    const response = await axios.post(
      WORKDAY_TOKEN_URL!,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: oauthTokenStore.refresh_token,
        client_id: WORKDAY_CLIENT_ID!,
        client_secret: WORKDAY_CLIENT_SECRET!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

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

export async function getAsorAccessToken(): Promise<string> {
  if (
    asorTokenStore &&
    Date.now() < asorTokenStore.expires_at - 60000
  ) {
    return asorTokenStore.access_token;
  }

  console.log("🔄 Getting ASOR access token...");
  const response = await axios.post(
    WORKDAY_ASOR_TOKEN_URL!,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: WORKDAY_ASOR_CLIENT_ID!,
      client_secret: WORKDAY_ASOR_CLIENT_SECRET!,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  asorTokenStore = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token || "",
    expires_at: Date.now() + (response.data.expires_in || 3600) * 1000,
  };
  console.log("✅ ASOR token obtained");
  return asorTokenStore.access_token;
}

export function isOAuthAuthenticated(): boolean {
  return oauthTokenStore !== null;
}

export function injectRefreshToken(refreshToken: string): void {
  oauthTokenStore = {
    access_token: "",
    refresh_token: refreshToken,
    expires_at: 0, // Force refresh on first use
  };
}
