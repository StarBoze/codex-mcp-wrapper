# Codex CLI Installation Guide

This document explains how to set up the **Codex CLI** (`@openai/codex`) globally before running Codex MCP Wrapper. It covers macOS, Linux and Windows (PowerShell) environments and includes troubleshooting tips.

---

## 1. Requirements

| Item | Recommended Version | Notes |
| --- | --- | --- |
| Node.js | **v22 or later** | Codex CLI requires Node 22+. Check with `node -v` |
| npm | v10 or later | Comes with Node 22 |
| OpenAI account | – | Obtain from [API Keys](https://platform.openai.com/account/api-keys) |
| Network | 443/TCP | Able to reach api.openai.com |

> If Node.js is below v22 you will see:
> ```
> Codex CLI requires Node.js version 22 or newer.
> You are running Node.js v20.x.x.
> ```
> Use `nvm install 22` or similar to upgrade.

### Unix – nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# restart your shell or source ~/.nvm/nvm.sh
nvm install 22
nvm use 22
node -v   # v22.x.x
```

### Windows – nvs
```powershell
npm install -g nvs
nvs add 22
nvs use 22
node -v  # v22.x.x
```

---

## 2. Global installation

### macOS / Linux
```bash
npm install -g npm@latest   # optional
npm install -g @openai/codex
codex --version   # e.g. codex/0.7.0 node-v22.x
```

### Windows (PowerShell)
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install -g @openai/codex
codex --version
```

---

## 3. API key
The CLI uses the `OPENAI_API_KEY` environment variable.

### bash/zsh
```bash
echo "export OPENAI_API_KEY=sk-..." >> ~/.bashrc
source ~/.bashrc
```

### fish
```fish
set -Ux OPENAI_API_KEY sk-...
```

### PowerShell
```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY","sk-...","User")
```

---

## 4. Test the CLI
```bash
codex --model codex-1 "console.log('Codex ready!')"
```
If `codex` is not found:
1. Check if `$(npm prefix -g)/bin` is in your `PATH`.
2. Restart the terminal.

---

## 5. Update
```bash
npm update -g @openai/codex
```

## 6. Uninstall
```bash
npm uninstall -g @openai/codex
```

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Codex CLI requires Node.js version 22 or newer` | Node version too low | Upgrade Node (`nvm install 22`) |
| `spawn codex ENOENT` | npm bin not in PATH | Add `$(npm bin -g)` to PATH |
| `OpenAIAPIError: 401` | Invalid or missing API key | Check with `echo $OPENAI_API_KEY` |
| Timeout behind proxy | HTTPS proxy unset | `HTTPS_PROXY=http://proxy:port codex ...` |

---

## 8. References
* [OpenAI Codex CLI GitHub](https://github.com/openai/openai-codex-cli)
* [OpenAI Codex Docs](https://platform.openai.com/docs/codex)

Copyright 2025 StarBoze
