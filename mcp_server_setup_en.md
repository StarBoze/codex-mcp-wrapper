# MCP Server Setup Guide
*Japanese version available in [mcp_server_setup.md](mcp_server_setup.md)*

This guide explains how to run the Codex MCP Wrapper as an MCP server. The recommended approach is launching from a local repository, but we describe five options including how to integrate with Cursor.

## Method 1: Launch from a local repo (recommended)
1. Clone the repo
```bash
cd ~/
git clone https://github.com/StarBoze/codex-mcp-wrapper.git
cd codex-mcp-wrapper

# install dependencies
npm install
```
2. Create a `.env` file
```bash
cat <<'EOF' > .env
OPENAI_API_KEY=sk-your-actual-api-key-here
JWT_SECRET=your-secret-key-minimum-32-chars
STORAGE_DRIVER=sqlite
SQLITE_DB=./wrapper.sqlite
RATE_LIMIT_RPM=60
CAPABILITIES_FILE=./capabilities.json
EOF
```
3. Update Cursor config
Example using node directly
```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "node",
      "args": [
        "/Users/your-username/codex-mcp-wrapper/dist/main.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```
Using an npm script
```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npm",
      "args": ["run", "start:prod"],
      "cwd": "/Users/your-username/codex-mcp-wrapper"
    }
  }
}
```

## Method 2: Embed environment variables in Cursor config
```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "github:StarBoze/codex-mcp-wrapper"
      ],
      "env": {
        "PORT": "8130",
        "OPENAI_API_KEY": "sk-your-actual-api-key-here",
        "JWT_SECRET": "your-secret-key-minimum-32-chars",
        "STORAGE_DRIVER": "sqlite",
        "SQLITE_DB": "./wrapper.sqlite",
        "RATE_LIMIT_RPM": "60",
        "CAPABILITIES_FILE": "./capabilities.json"
      }
    }
  }
}
```

## Method 3: Start via a shell script
1. Create `~/codex-mcp-wrapper/start-mcp.sh`
```bash
#!/bin/bash
cd "$(dirname "$0")"

# load .env
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# start the MCP server
npm run start:prod
```
Give it execute permission
```bash
chmod +x ~/codex-mcp-wrapper/start-mcp.sh
```
2. Cursor config
```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "/Users/your-username/codex-mcp-wrapper/start-mcp.sh"
    }
  }
}
```

## Method 4: Run as a systemd service (Linux/macOS)
1. Create service file `~/.config/systemd/user/codex-mcp.service`
```
[Unit]
Description=Codex MCP Wrapper
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/your-username/codex-mcp-wrapper
EnvironmentFile=/home/your-username/codex-mcp-wrapper/.env
ExecStart=/usr/bin/npm run start:prod
Restart=always

[Install]
WantedBy=default.target
```
2. Enable the service
```bash
systemctl --user enable codex-mcp.service
systemctl --user start codex-mcp.service
```
3. Example Cursor config (HTTP client)
```json
{
  "mcpServers": {
    "codex-mcp": {
      "type": "http",
      "url": "http://localhost:8123",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

## Method 5: Run with Docker Compose (with SSE)
1. Launch the server via Docker Compose
```bash
docker compose up -d --build
```
2. Cursor SSE configuration
```json
{
  "mcpServers": {
    "codex-mcp": {
      "type": "http",
      "baseUrl": "http://localhost:8123/mcp",
      "transport": "sse",
      "auth": {
        "type": "bearer",
        "token": "YOUR_JWT_TOKEN"
      }
    }
  }
}
```

---

## Recommended approach
Using a local repo (method 1) is the simplest and most reliable. Clone the repo, create the `.env`, run `npm install`, and point Cursor to your local path.
