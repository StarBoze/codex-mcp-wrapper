# Codex MCP Wrapper – セットアップガイド
*English version available in [README.en.md](README.en.md)*

---

## 1. 前提環境

| 要件        | バージョン              | 備考                             |
| --------- | ------------------ | ------------------------------ |
| Node.js   | **v22.x**          | Codex CLI が要求するバージョン |
| npm       | 10 以上              | Node.js 22 には npm 10 が同梱 |
| Redis     | 7 系 (任意)         | SQLite を利用する場合は不要       |
| Codex CLI | `@openai/codex` 最新 | `npm i -g @openai/codex`       |
| Git       | 任意                 | プロジェクト管理用                      |

### 必要な API キー / Secrets

* **OPENAI\_API\_KEY** – Codex 用 OpenAI キー
* **JWT\_SECRET** – JWT 署名用シークレット（任意文字列）

### ストレージについて
デフォルトでは Redis を使用しますが、軽量な用途では SQLite も選択可能です。
Redis を利用する場合は以下 2 点のために必要です。

BullMQ のジョブキュー — Codex CLI 実行を非同期ワーカーにオフロードし、再試行・バックオフ・並列度制御を行うためのキュー／スケジューラストレージとして Redis を利用します。

レートリミットカウンタ — Agent ごとの RPM カウントを Redis のインメモリキーで高速・原子的に管理します。

⚠️ 軽量開発用途で Redis を外したい 場合は、BullMQ を @bull-board/express のローカルメモリストアや in-memory キューに差し替え、レートリミットも Map 管理に変更可能です。ただしマルチプロセス・水平スケール時の整合性保証が失われる点に注意してください。

## アーキテクチャ概要

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
│  │          認証ミドルウェア           │  │
│  └────────────────┬─────────────────┘  │
│                   │                    │
│  ┌────────────────▼─────────────────┐  │
│  │           Codex Service          │  │
│  └────────────────┬─────────────────┘  │
│                   │                    │
│  ┌────────────────▼─────────────────┐  │
│  │        抽象ストレージレイヤー        │  │
│  └────────┬─────────────────┬───────┘  │
│           │                 │          │
│  ┌────────▼────┐    ┌───────▼────────┐ │
│  │   Redis     │    │    SQLite      │ │
│  │  (BullMQ)   │    │(ファイルベース)  │ │
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

## 2. ソース取得

```bash
git clone https://github.com/StarBoze/codex-mcp.git
cd codex-mcp
```

### GitHub ショートハンドで起動

```bash
# -y は「すべて Yes」を意味し対話をスキップ
npx -y github:StarBoze/codex-mcp --port 8130
```

初回のみリポジトリを tarball で取得→キャッシュされるため２回目以降は高速

MCP 設定に組み込む例（Cursor）

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

## 3. ローカル実行 (ホスト Redis 利用)

```bash
# 1) 依存インストール
$ npm install

# 2) 必要環境変数を .env に定義
$ cat <<EOF > .env
OPENAI_API_KEY=sk-...
JWT_SECRET=mywrappersecret
STORAGE_DRIVER=redis       # redis または sqlite
REDIS_URL=redis://localhost:6380
SQLITE_DB=./wrapper.sqlite
RATE_LIMIT_RPM=60
CAPABILITIES_FILE=./capabilities.json
EOF

# 3) ビルド & 起動
$ npm run start:prod
# → 8123 番で HTTP/WS サーバが起動
```

> **Redis 未インストールの場合**: `brew install redis` (mac) or `docker run -p 6379:6379 redis:7-alpine` で即席サーバを起動。

---

## 4. Docker Compose でワンライナー起動

```bash
# .env ファイル準備 (上と同じ)
$ docker compose up -d --build
# wrapper_1 と redis_1 が起動
```

* ログ確認: `docker compose logs -f wrapper`
* サーバ停止: `docker compose down`

---

## 5. 動作確認クイックテスト

### 5.1 WebSocket 取得
wscatをインストールしてください。
npm install -g wscat

```bash
# wsId を取得
$ wscat -c ws://localhost:8123/ws
< {"wsId":"123e4567-..."}
```

### 5.2 RPC で GenerateCode
mywrappersecretを.envで設定した値にして実行。

codex-1の場合
```bash
curl -X POST http://localhost:8123/rpc \
  -H "Authorization: Bearer $(node -e 'console.log(require("jsonwebtoken").sign({role:"code"},"mywrappersecret"))')" \
  -H "Content-Type: application/json" \
  -d '{"id":"1","method":"GenerateCode","params":{"args":["--model","codex-1","console.log(\"hi\")"],"wsId":"<上で得た wsId>"}}'
```

o4-miniの場合
```bash
curl -X POST http://localhost:8123/rpc \
  -H "Authorization: Bearer $(node -e 'console.log(require("jsonwebtoken").sign({role:"code"},"mywrappersecret"))')" \
  -H "Content-Type: application/json" \
  -d '{"id":"1","method":"GenerateCode","params":{"args":["--model","o4-mini","console.log(\"hi\")"],"wsId":"<上で得た wsId>"}}'
```

WebSocket 側に生成コードチャンクがストリーミングされます。

### 5.3 MCP (Model Context Protocol) でアクセス

MCP TypeScript SDK の仕様に準拠した SSE (Server-Sent Events) インターフェースを `/mcp` エンドポイントで提供しています。

#### セッション作成
```bash
# セッションIDを取得
$ curl -X POST http://localhost:8123/mcp/sessions \
  -H "Authorization: Bearer $(node -e 'console.log(require("jsonwebtoken").sign({role:"code"},"mywrappersecret"))')" \
  -H "Content-Type: application/json"

# レスポンス例
{"sessionId":"f47ac10b-58cc-4372-a567-0e02b2c3d479","status":"created"}
```

#### SSE接続
```bash
# 別ターミナルで SSE ストリームを監視
$ curl -N http://localhost:8123/mcp?sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479
```

#### ツール呼び出し
```bash
# Codex ツールを呼び出し
$ curl -X POST http://localhost:8123/mcp?sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $(node -e 'console.log(require("jsonwebtoken").sign({role:"code"},"mywrappersecret"))')" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req-1",
    "method": "callTool",
    "params": {
      "name": "codex",
      "arguments": {
        "args": ["--model", "codex-1", "console.log(\"Hello from MCP!\")"]
      }
    }
  }'

# レスポンス例
{"id":"req-1","jobId":"123"}
```

SSE ストリームに実行結果がリアルタイムで流れてきます。

---

## 6. ディレクトリ探索 & カスタマイズ

```
src/
  config.ts          # 主要設定
  modules/           # Nest モジュール群
    codex/           # Codex 実行関連
    mcp/             # MCP プロトコル実装
    ws/              # WebSocket 実装
    rpc/             # RPC API 実装
  utils/             # ユーティリティ
capabilities.json   # tools/list 用の定義
Dockerfile           # Alpine Node ベース
package.json         # 依存・スクリプト
```

* **レート制限**: `rate-limit/limiter.service.ts` の `max` 値を変更
* **ロール追加**: `roles.guard.ts` → `Roles('newrole')` を拡張
* **MCP カスタマイズ**: `capabilities.json` を編集してツールを追加

### モニタリング
`/monitor/metrics` へアクセスすると、稼働時間や接続数などの簡易メトリクスを取得できます。

---

## 7. 本番デプロイ Tips

1. **JWT\_SECRET** は 32 文字以上のランダム文字列を推奨。
2. **Redis** を外部マネージドにする場合、`REDIS_URL` を TLS URL へ設定。
3. **ログ収集**: Fastify ログを pino transport で外部へ送信可。
4. **CI/CD**: `npm test` → `npm run build` → Docker build/push → コンテナランタイム。
5. **RateLimit チューニング**: BullMQ の並列度と合わせて RPM を調整。

---

## 8. よくあるエラー

| 症状                    | 原因                            | 解決策                                         |
| --------------------- | ----------------------------- | ------------------------------------------- |
| `Rate limit exceeded` | 同一 Agent が RPM 超過             | `.env` で RATE\_LIMIT\_RPM を増やす or ワーカー並列度調整 |
| `Invalid token`       | JWT 署名不一致 / 期限切れ              | `JWT_SECRET` を統一、`exp` を長めに設定               |
| WebSocket 途切れ         | ネットワーク / Idle Timeout         | LB の Idle Timeout を 300 秒以上に拡張              |
| `spawn codex ENOENT`  | codex CLI 未インストール or PATH 不整合 | `npm i -g @openai/codex` を実行 or `PATH` を確認  |
| SSE 接続エラー            | セッション ID 不正 / 認証トークン不正        | 有効なセッション ID と JWT トークンを使用                 |

---

## 9. アンインストール

```bash
docker compose down -v    # ボリュームを含め削除
rm -rf node_modules dist  # 手動ビルドの場合
```

---

## 10. 参考
* OpenAI Codex CLI docs: [https://platform.openai.com/docs/codex](https://platform.openai.com/docs/codex)
* NestJS docs: [https://docs.nestjs.com](https://docs.nestjs.com)
* BullMQ docs: [https://docs.bullmq.io](https://docs.bullmq.io)
* Model Context Protocol: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE)の下で公開されています。

Copyright (c) 2025 StarBoze