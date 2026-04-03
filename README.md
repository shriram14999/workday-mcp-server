# Workday ASOR MCP Server

An MCP (Model Context Protocol) server that connects to Workday via ASOR OAuth 2.0, exposing Workday HR data as AI-callable tools for use with Flowise, Cursor, and Claude Desktop.

## Tools Available

| Tool | Description |
|------|-------------|
| `list_workers` | List workers with pagination |
| `get_worker` | Get worker details by ID |
| `search_workers` | Search workers by name/email |
| `get_worker_profile` | Get worker public profile |
| `list_organizations` | List all organizations |
| `list_job_profiles` | List all job profiles |

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Workday credentials
```

### 3. Build
```bash
npm run build
```

### 4. Start
```bash
npm start
# Server runs on http://localhost:3001
```

### 5. Authenticate with Workday
Open your browser and visit:
```
http://localhost:3001/auth
```
Log in with your Workday credentials. You'll be redirected back after success.

### 6. Connect Flowise
In Flowise, use this SSE endpoint:
```
http://localhost:3001/sse
```
Or import `flowise-flow.json` directly into Flowise.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server home page |
| `GET /auth` | Start Workday OAuth login |
| `GET /callback` | OAuth callback (set as redirect URI) |
| `GET /sse` | MCP SSE endpoint for AI clients |
| `POST /messages` | MCP message handler |
| `GET /health` | Health check |

## Deployment (Phase 2 - Render)

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables in Render dashboard
4. Update `WORKDAY_REDIRECT_URI` to `https://your-app.onrender.com/callback`
5. Visit `https://your-app.onrender.com/auth` to authenticate
