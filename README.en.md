# Codex MCP Wrapper – Setup Guide

---

## 📌 Quick Links

| Link | Description |
| ---- | ----------- |
| [📘 Codex CLI Installation Guide](how_to_install_codex_en.md) | How to install Codex CLI (prerequisite) |
| [🔧 MCP Server Setup](README.en.md#mcp-server-setup) | How to configure MCP Server |
| [🚀 Quick Start](README.en.md#2-get-the-source) | How to get started quickly |

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
* **RATE_LIMIT_RPM** – max requests per minute per agent (default 60)

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
git clone https://github.com/StarBoze/codex-mcp-wrapper.git
cd codex-mcp-wrapper
```

### Launch via GitHub shorthand

```bash
# -y skips all prompts
PORT=8130 npx -y github:StarBoze/codex-mcp-wrapper
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
        "github:StarBoze/codex-mcp-wrapper"
      ],
      "env": { "PORT": "8130" },
      "tools": ["codex", "bootstrap", "diff", "testgen", "secure", "sql-explain", "migrate", "ci-opt", "i18n", "feature_implementation", "api_migration", "microservice_decomposition", "performance_optimization", "saas_application_build", "legacy_system_modernization"]
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
REDIS_URL=redis://localhost:6379
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

## MCP Server Setup

To use this MCP server with your editors or IDEs (Cursor or VSCode), you need the following configuration:

### Cursor MCP Configuration

To use this server with Cursor, edit your `~/.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "github:StarBoze/codex-mcp-wrapper"
      ],
      "env": { "PORT": "8130" },
      "tools": ["codex", "bootstrap", "diff", "testgen", "secure", "sql-explain", "migrate", "ci-opt", "i18n", "feature_implementation", "api_migration", "microservice_decomposition", "performance_optimization", "saas_application_build", "legacy_system_modernization"]
    }
  }
}
```

### Connecting to an Already Running Server

If you already have the server running, you can configure it as follows:

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "curl",
      "args": [
        "-N", 
        "http://localhost:8123/mcp?sessionId={sessionId}"
      ],
      "tools": ["codex", "bootstrap", "diff", "testgen", "secure", "sql-explain", "migrate", "ci-opt", "i18n", "feature_implementation", "api_migration", "microservice_decomposition", "performance_optimization", "saas_application_build", "legacy_system_modernization"]
    }
  }
}
```

Note: The `tools` section should specify the available tool names defined in the capabilities.json file as shown above.

---

## 🎯 Codex-1 Usage Examples: From Simple to Ultra-Advanced

Examples of complex tasks you can delegate entirely to Codex-1, presented with progressive complexity.

### 🚀 **Moderate Complexity**

#### 1. **Full-Stack Feature Implementation**
```bash
# Tool: feature_implementation
```

**Example Instructions:**
> "Add user authentication functionality. Use React frontend, Node.js backend, PostgreSQL database. Include JWT token authentication, password hashing, login/logout UI, session management, and comprehensive tests."

**Expected Deliverables:**
- Frontend: Login/signup components
- Backend: Authentication API endpoints
- Database: User table design
- Security: JWT implementation, password hashing
- Testing: Unit tests & integration tests

#### 2. **API Migration**
```bash
# Tool: api_migration
```

**Example Instructions:**
> "Migrate REST API to GraphQL. Convert all existing endpoints to GraphQL schema, implement resolvers, and create REST compatibility wrapper for existing clients."

**Expected Deliverables:**
- GraphQL schema definition
- Resolver implementations
- REST compatibility layer
- Client migration guide

### 🔥 **Advanced Complexity**

#### 3. **Microservice Decomposition**
```bash
# Tool: microservice_decomposition
```

**Example Instructions:**
> "Break down monolithic e-commerce app into 4 microservices:
> 1. User Management Service
> 2. Product Catalog Service  
> 3. Order Processing Service
> 4. Payment Service
> 
> Implement each service as independent Docker containers with gRPC communication, Redis shared cache, Kubernetes configuration files, integration tests, CI/CD pipelines, and API Gateway setup."

**Expected Deliverables:**
- 4 independent microservices
- Docker & Kubernetes configurations
- gRPC communication implementation
- API Gateway setup
- Integration test suite
- CI/CD pipeline configuration

#### 4. **Performance Optimization Project**
```bash
# Tool: performance_optimization
```

**Example Instructions:**
> "Improve web application performance by 50%.
> 
> **Optimization Targets:**
> - Database queries (N+1 problem resolution, index additions)
> - Frontend (Code splitting, image optimization, caching strategy)
> - Backend (Redis integration, connection pooling)
> - Infrastructure (CDN setup, load balancing)
> 
> **Required Work:**
> - Performance measurement tool implementation
> - Bottleneck analysis and report generation
> - Optimization implementation and benchmarking
> - Monitoring dashboard creation"

### 🌟 **Ultra-Advanced Complexity**

#### 5. **Full-Stack SaaS Application Build**
```bash
# Tool: saas_application_build
```

**Example Instructions:**
> "Build complete project management SaaS from scratch.
> 
> **Requirements:**
> - Multi-tenant architecture
> - 3 pricing tiers (Free/Pro/Enterprise)
> - Real-time collaboration features
> - Slack/GitHub/Jira integrations
> - GDPR/SOC2 compliance
> - Mobile PWA support
> 
> **Tech Stack:**
> - Frontend: Next.js + TypeScript
> - Backend: Node.js + GraphQL
> - Database: PostgreSQL + Redis
> - Infrastructure: AWS + Terraform
> 
> **Include:**
> - Authentication & authorization system
> - Payment processing (Stripe)
> - Email notification system
> - Monitoring & logging
> - Automated testing (90% coverage)
> - Documentation (API/User)
> - Deployment pipeline"

#### 6. **Legacy System Modernization**
```bash
# Tool: legacy_system_modernization
```

**Example Instructions:**
> "Completely migrate 20-year-old VB.NET + SQL Server system to modern architecture.
> 
> **Current Analysis & Migration Plan:**
> - Existing code analysis and business logic extraction
> - Data structure analysis and normalization proposals
> - Phased migration strategy planning
> 
> **New System Build:**
> - React + .NET Core Web API
> - PostgreSQL + Entity Framework
> - Azure Container Apps deployment
> - Lossless existing data migration
> - Parallel operation synchronization
> - User training materials creation
> - Rollback plan"

### 📝 **Effective Instruction Tips**

#### ✅ **Specific and Detailed Instructions**
- Clearly specify tech stack
- List expected deliverables
- Define quality standards (test coverage, performance targets)

#### ✅ **Progressive Complexity Building**
```
1. "Add XX feature"
2. "Add XX feature, considering YY"  
3. "Add XX feature, considering YY, meeting ZZ quality standards"
```

#### ✅ **Clear Constraint Definition**
- Security requirements
- Performance requirements
- Existing system compatibility
- Budget & time constraints

Codex-1 has the capability to understand and progressively implement these complex tasks. The key is providing clear and specific instructions.

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
capabilities.json   # list of tools for `listTools`
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
