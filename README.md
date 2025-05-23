# Codex MCP Wrapper – セットアップガイド
*English version available in [README.en.md](README.en.md)*

---

## 📌 クイックリンク

| リンク | 説明 |
| ----- | ---- |
| [📘 Codex CLIインストールガイド](how_to_install_codex.md) | Codex CLIのインストール方法（前提条件） |
| [🔧 MCP Server セットアップ](README.md#mcp-server-セットアップ) | MCP Serverの設定方法 |
| [🚀 クイックスタート](README.md#2-ソース取得) | 素早く始める方法 |

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
* **RATE_LIMIT_RPM** – 1 分あたりの最大リクエスト数 (デフォルト 60)

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
git clone https://github.com/StarBoze/codex-mcp-wrapper.git
cd codex-mcp-wrapper
```

### GitHub ショートハンドで起動

```bash
# -y は「すべて Yes」を意味し対話をスキップ
PORT=8130 npx -y github:StarBoze/codex-mcp-wrapper
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
        "github:StarBoze/codex-mcp-wrapper"
      ],
      "env": { "PORT": "8130" },
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
REDIS_URL=redis://localhost:6379
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

## MCP Server セットアップ

エディタやIDE（CursorやVSCode）などからこのMCPサーバーを利用するには、下記の設定が必要です。

### Cursor用MCP設定

Cursorでこのサーバーを使用するには、`~/.cursor/mcp.json`ファイルを編集します：

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

### 起動済みサーバーへの接続

既にサーバーを起動済みの場合は、以下のように設定できます：

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

※ `tools`セクションには上記のようにcapabilities.jsonファイルで定義されている利用可能なツール名を指定します。

---

## 🎯 Codex-1 使用例：シンプルから超高度まで

Codex-1に丸投げできる複雑なタスクの例を、段階的な複雑さで紹介します。

### 🚀 **中程度の複雑さ**

#### 1. **フルスタック機能追加**
```bash
# ツール: feature_implementation
```

**指示例：**
> "ユーザー認証機能を追加してください。React フロントエンド、Node.js バックエンド、PostgreSQL データベースを使用。JWT トークン認証、パスワードハッシュ化、ログイン/ログアウト UI、セッション管理、テストも含めて完全に実装してください。"

**期待される成果物：**
- フロントエンド：ログイン/サインアップコンポーネント
- バックエンド：認証API エンドポイント
- データベース：ユーザーテーブル設計
- セキュリティ：JWT実装、パスワードハッシュ化
- テスト：ユニットテスト & 統合テスト

#### 2. **APIマイグレーション**
```bash
# ツール: api_migration
```

**指示例：**
> "REST API を GraphQL に移行してください。既存の全エンドポイントを GraphQL スキーマに変換し、リゾルバーを実装し、既存クライアントとの後方互換性を保つ REST ラッパーも作成してください。"

**期待される成果物：**
- GraphQL スキーマ定義
- リゾルバー実装
- 既存RESTエンドポイントとの互換レイヤー
- クライアントマイグレーションガイド

### 🔥 **高度な複雑さ**

#### 3. **マイクロサービス分割**
```bash
# ツール: microservice_decomposition
```

**指示例：**
> "モノリスの e-commerce アプリを 4つのマイクロサービスに分割してください：
> 1. ユーザー管理サービス
> 2. 商品カタログサービス  
> 3. 注文処理サービス
> 4. 決済サービス
> 
> 各サービスを独立したDockerコンテナとして実装し、gRPC通信、Redis共有キャッシュ、Kubernetes設定ファイル、統合テスト、CI/CDパイプライン、API Gateway設定も含めて完全に構築してください。"

**期待される成果物：**
- 4つの独立したマイクロサービス
- Docker & Kubernetes設定
- gRPC通信実装
- API Gateway設定
- 統合テストスイート
- CI/CDパイプライン設定

#### 4. **パフォーマンス最適化プロジェクト**
```bash
# ツール: performance_optimization
```

**指示例：**
> "Webアプリケーションのパフォーマンスを50%向上させてください。
> 
> **最適化対象：**
> - データベースクエリ（N+1問題解決、インデックス追加）
> - フロントエンド（Code splitting、画像最適化、キャッシュ戦略）
> - バックエンド（Redis導入、コネクションプーリング）
> - インフラ（CDN設定、負荷分散）
> 
> **必要な作業：**
> - パフォーマンス測定ツールの実装
> - ボトルネック分析とレポート生成
> - 最適化実装とベンチマーク
> - 監視ダッシュボードの作成"

### 🌟 **超高度な複雑さ**

#### 5. **フルスタック SaaS アプリケーション構築**
```bash
# ツール: saas_application_build
```

**指示例：**
> "プロジェクト管理 SaaS を完全構築してください。
> 
> **要件：**
> - マルチテナント アーキテクチャ
> - 3つの料金プラン（Free/Pro/Enterprise）
> - リアルタイム コラボレーション機能
> - Slack/GitHub/Jira 統合
> - GDPR/SOC2 コンプライアンス
> - モバイル PWA 対応
> 
> **技術スタック：**
> - Frontend: Next.js + TypeScript
> - Backend: Node.js + GraphQL
> - Database: PostgreSQL + Redis
> - Infrastructure: AWS + Terraform
> 
> **含めるもの：**
> - 認証・認可システム
> - 決済処理（Stripe）
> - メール通知システム
> - 監視・ロギング
> - 自動テスト（90%カバレッジ）
> - ドキュメント（API/ユーザー）
> - デプロイメント パイプライン"

#### 6. **レガシーシステム現代化**
```bash
# ツール: legacy_system_modernization
```

**指示例：**
> "20年前のVB.NET + SQL Server システムを現代的なアーキテクチャに完全移行してください。
> 
> **現状分析と移行計画：**
> - 既存コード解析とビジネスロジック抽出
> - データ構造分析と正規化提案
> - 段階的移行戦略の立案
> 
> **新システム構築：**
> - React + .NET Core Web API
> - PostgreSQL + Entity Framework
> - Azure Container Apps デプロイ
> - 既存データの無損失マイグレーション
> - 並行運用期間の同期機能
> - ユーザートレーニング資料作成
> - ロールバック計画"

### 📝 **効果的な指示のコツ**

#### ✅ **具体的で詳細な指示**
- 技術スタックを明確に指定
- 期待する成果物を列挙
- 品質基準（テストカバレッジ、パフォーマンス目標）を明記

#### ✅ **段階的な複雑さの構築**
```
1. 「○○機能を追加して」
2. 「○○機能を追加し、△△も考慮して」  
3. 「○○機能を追加し、△△も考慮し、××の品質基準も満たして」
```

#### ✅ **制約条件の明示**
- セキュリティ要件
- パフォーマンス要件
- 既存システムとの互換性
- 予算・時間制約

Codex-1は、これらの複雑なタスクを理解し、段階的に実装していく能力を持っています。重要なのは、明確で具体的な指示を出すことです。

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