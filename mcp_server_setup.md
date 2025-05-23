# MCPサーバー設定ガイド
*English version available in [mcp_server_setup_en.md](mcp_server_setup_en.md)*

Codex MCP Wrapper を MCP サーバーとして利用するための設定例をまとめたドキュメントです。
ローカルリポジトリからの起動が推奨方法ですが、Cursor 設定への組み込み例を含め、5 つの方法を詳細に説明します。

## 方法1: ローカルリポジトリから起動（推奨）
1. リポジトリをクローン
```bash
cd ~/
git clone https://github.com/StarBoze/codex-mcp-wrapper.git
cd codex-mcp-wrapper

# 依存関係をインストール
npm install
```
2. `.env`ファイルを作成
```bash
cat <<EOF > .env
OPENAI_API_KEY=sk-your-actual-api-key-here
JWT_SECRET=your-secret-key-minimum-32-chars
STORAGE_DRIVER=sqlite
SQLITE_DB=./wrapper.sqlite
RATE_LIMIT_RPM=60
CAPABILITIES_FILE=./capabilities.json
EOF
```
3. Cursorの設定を更新
Node直接使用の例
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
`npm` スクリプトを使う場合
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

## 方法2: 環境変数を直接Cursor設定に記述
`.env`の内容をCursor設定に含める方法
```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "github:StarBoze/codex-mcp-wrapper",
        "--port", "8130"
      ],
      "env": {
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

## 方法3: シェルスクリプトを経由して起動
1. 起動スクリプトを作成 `~/codex-mcp-wrapper/start-mcp.sh`
```bash
#!/bin/bash
cd "$(dirname "$0")"

# .envファイルを読み込む
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# MCPサーバーを起動
npm run start:prod
```
実行権限を付与
```bash
chmod +x ~/codex-mcp-wrapper/start-mcp.sh
```
2. Cursorの設定
```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "/Users/your-username/codex-mcp-wrapper/start-mcp.sh"
    }
  }
}
```

## 方法4: systemdサービスとして実行（Linux/macOS）
より安定した運用のため、バックグラウンドサービスとして実行
1. サービスファイルを作成 `~/.config/systemd/user/codex-mcp.service`
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
2. サービスを有効化
```bash
systemctl --user enable codex-mcp.service
systemctl --user start codex-mcp.service
```
3. Cursorの設定例（HTTPクライアントとして接続）
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

## 方法5: Docker Compose で起動（SSE付き）
1. Docker Compose でサーバーを起動
```bash
docker compose up -d --build
```
2. Cursor から SSE で接続する設定例
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

## 推奨設定
最も簡単で確実な方法は方法1です：

- ローカルにリポジトリをクローン
- `.env`ファイルを作成
- `npm install`で依存関係をインストール
- Cursorの設定でローカルパスを指定
