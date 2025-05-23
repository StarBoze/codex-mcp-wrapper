# Codex MCP Wrapper – Setup Guide

---

## 1. Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | **v22.x** | Required by Codex CLI |
| npm | 10 or newer | Comes with Node.js 22 |
| Redis | v7 (optional) | Not needed when using SQLite |
| Codex CLI | `@openai/codex` latest | `npm i -g @openai/codex` |
| Git | optional | for project management |

### API Keys / Secrets

* **OPENAI_API_KEY** – API key for Codex
* **JWT_SECRET** – secret used for JWT signing
* **CAPABILITIES_FILE** – JSON file describing available tools

### About storage
Default backend is Redis but SQLite can be selected. Redis is used for:

* BullMQ job queue for running Codex CLI asynchronously
* Rate limit counters per agent

## Architecture Overview

```
┌─────────────────────────────────────────┐
│            Codex MCP Wrapper            │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │   RPC   │  │WebSocket│  │  MCP/   │  │
│  │  API    │  │ Gateway │  │  SSE    │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  │
│       │            │            │       │
│  ┌────▼────────────▼────────────▼────┐  │
│  │        Auth Middleware            │  │
│  └────────────────┬─────────────────┘  │
│                   │                    │
│  ┌────────────────▼─────────────────┐  │
│  │           Codex Service          │  │
│  └────────────────┬─────────────────┘  │
│                   │                    │
│  ┌────────────────▼─────────────────┐  │
│  │      Abstract Storage Layer      │  │
│  └────────┬─────────────────┬───────┘  │
│           │                 │          │
│  ┌────────▼────┐    ┌───────▼────────┐ │
│  │   Redis     │    │    SQLite      │ │
│  │  (BullMQ)   │    │ (file-based)   │ │
│  └────────┬────┘    └───────┬────────┘ │
│           │                 │          │
│  ┌────────▼─────────────────▼────────┐ │
│  │          Codex Worker           │ │
│  └────────────────┬─────────────────┘ │
│                   │                   │
│  ┌────────────────▼─────────────────┐ │
│  │           Codex CLI              │ │
│  └─────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

---

## 2. Get the source
```bash
git clone https://github.com/StarBoze/codex-mcp.git
cd codex-mcp
```

### Launch via GitHub shorthand

```bash
# -y skips all prompts
npx -y github:StarBoze/codex-mcp --port 8130
```

Only the first run fetches a tarball of the repo; subsequent launches are cached and faster.

Example MCP config (Cursor)

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "github:StarBoze/codex-mcp",
        "--port", "8130"
      ],
      "tools": ["analyzeCode", "generateReadme", "suggestImprovements"]
    }
  }
}
```

---

## 3. Local run (using host Redis)
```bash
# 1) install dependencies
npm install

# 2) create .env
cat <<EOS > .env
OPENAI_API_KEY=sk-...
JWT_SECRET=mywrappersecret
STORAGE_DRIVER=redis       # redis or sqlite
REDIS_URL=redis://localhost:6380
SQLITE_DB=./wrapper.sqlite
RATE_LIMIT_RPM=60
EOS

# 3) build & start
npm run start:prod
# -> HTTP/WS server on port 8123
```
> **If Redis is not installed**: `brew install redis` (mac) or `docker run -p 6379:6379 redis:7-alpine`.

---

## 4. Run with Docker Compose
```bash
# prepare .env as above
docker compose up -d --build
# wrapper_1 and redis_1 start
```
* logs: `docker compose logs -f wrapper`
* stop: `docker compose down`

---

## 5. Quick test
Follow the same steps as in the Japanese guide to obtain a wsId and call GenerateCode.

### MCP access
Use the `/mcp` endpoint compatible with the MCP TypeScript SDK.

---

## 6. Directory layout and customization
```
src/
  config.ts          # main settings
  modules/           # Nest modules
    codex/           # Codex execution
    mcp/             # MCP implementation
    ws/              # WebSocket server
    rpc/             # RPC API
  utils/             # utilities
capabilities.json   # list of tools for `tools/list`
Dockerfile           # Alpine Node base
package.json         # dependencies & scripts
```
* **Rate limit**: change `max` in `rate-limit/limiter.service.ts`
* **Add roles**: extend `Roles('newrole')` in `roles.guard.ts`
* **Customize MCP**: edit `capabilities.json` to define additional tools

### Monitoring
Access `/monitor/metrics` to check uptime and connection counts.

---

## 7. Deployment tips
1. Use a 32+ character random `JWT_SECRET`.
2. Set `REDIS_URL` to a TLS URL when using managed Redis.
3. Pipe Fastify logs with a pino transport.
4. CI/CD flow: `npm test` -> `npm run build` -> Docker build/push.
5. Tune rate limits along with BullMQ concurrency.

---

## 8. Common errors
| Symptom | Cause | Solution |
| --- | --- | --- |
| `Rate limit exceeded` | RPM exceeded | Increase `RATE_LIMIT_RPM` or adjust workers |
| `Invalid token` | JWT mismatch / expired | Ensure same `JWT_SECRET` and longer `exp` |
| WebSocket disconnects | Network / idle timeout | Set LB idle timeout > 300s |
| `spawn codex ENOENT` | codex CLI missing | `npm i -g @openai/codex` or check `PATH` |
| SSE error | invalid session or token | Use valid session ID and JWT token |

---

## 9. Uninstall
```bash
docker compose down -v
rm -rf node_modules dist
```

---

## 10. References
* OpenAI Codex CLI docs: <https://platform.openai.com/docs/codex>
* NestJS docs: <https://docs.nestjs.com>
* BullMQ docs: <https://docs.bullmq.io>
* Model Context Protocol: <https://modelcontextprotocol.io>

---

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2025 StarBoze
