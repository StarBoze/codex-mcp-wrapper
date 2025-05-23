# Codex CLI インストール手順 (整理版)
*English version available in [how_to_install_codex_en.md](how_to_install_codex_en.md)*

Codex MCP Wrapper を利用する前に、**Codex CLI**（`@openai/codex`）をグローバル環境にセットアップします。本手順書では macOS / Linux / Windows（PowerShell）をカバーし、トラブルシューティングも記載しています。

---

## 1. 必要条件

| 要件           | 推奨バージョン    | 備考                                                           |
| ------------ | ---------- | ------------------------------------------------------------ |
| Node.js      | **v22 以上** | Codex CLI は Node.js 22 以降が必須。`node -v` で確認                   |
| npm          | v10 以上     | Node.js 22 には npm 10 が同梱                                     |
| OpenAI アカウント | ―          | [API Keys](https://platform.openai.com/account/api-keys) 発行可 |
| ネットワーク       | 443/TCP    | api.openai.com へ到達可能であること                                    |

> **Node.js が v22 未満の場合**、以下エラーが表示されます：
>
> ```
> Codex CLI requires Node.js version 22 or newer.
> You are running Node.js v20.x.x.
> ```
>
> `nvm install 22` などでアップグレードするかnvmやnを使ってバージョンを切り替えてください。

### Unix 系 — nvm (Node Version Manager)
nvm はユーザー空間で Node.js バージョンを切り替えられる定番ツールです。

# 1. nvm インストール (curl)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# シェルを再起動 or source ~/.nvm/nvm.sh

# 2. Node.js v22 を追加 & 使用
nvm install 22
nvm use 22
node -v   # v22.x.x

PATH 競合解消: nvm use 後に hash -r を実行すると、シェルのキャッシュされた node パスが更新されます。

Windows — nvs (Node Version Switcher)

npm install -g nvs
nvs add 22
nvs use 22
node -v  # v22.x.x

nvm-windows を使用している場合は nvm install 22 && nvm use 22 でも可。

---

## 2. グローバルインストール

### macOS / Linux (bash/zsh)

```bash
# 1. npm を最新化（推奨）
npm install -g npm@latest

# 2. Codex CLI をグローバルに追加
npm install -g @openai/codex

# 3. バージョン確認
codex --version   # 例: codex/0.7.0 node-v22.x
```

### Windows (PowerShell)

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install -g @openai/codex
codex --version
```

---

## 3. API キー設定

Codex CLI は環境変数 `OPENAI_API_KEY` を参照します。

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

> **セキュリティ Tip**: シェルプロファイルを Git 管理しないでください。

---

## 4. 動作テスト

```bash
codex --model codex-1 "console.log('Codex ready!')"
# => snippet.js が生成されコードが出力されます
```

`codex` が見つからない場合：

1. `npm prefix -g` のパスが `$PATH` に含まれているか確認。
2. ターミナルを再起動。

---

## 5. アップデート方法

```bash
npm update -g @openai/codex
```

---

## 6. アンインストール

```bash
npm uninstall -g @openai/codex
```

---

## 7. トラブルシューティング

| 症状                                               | 原因                    | 解決策                                       |
| ------------------------------------------------ | --------------------- | ----------------------------------------- |
| `Codex CLI requires Node.js version 22 or newer` | Node.js が v22 未満      | Node.js 22 以上へアップグレード (`nvm install 22`)  |
| `spawn codex ENOENT`                             | `$PATH` に npm bin が無い | `echo $(npm bin -g)` を PATH に追加           |
| `OpenAIAPIError: 401`                            | API キー不正 / 未設定        | `echo $OPENAI_API_KEY` で値を確認、再生成          |
| Proxy 環境でタイムアウト                                  | HTTPS プロキシ未設定         | `HTTPS_PROXY=http://proxy:port codex ...` |

---

## 8. 参考リンク

* OpenAI Codex CLI GitHub: [https://github.com/openai/openai-codex-cli](https://github.com/openai/openai-codex-cli)
* OpenAI Codex Docs: [https://platform.openai.com/docs/codex](https://platform.openai.com/docs/codex)

Copyright 2025 StarBoze All rights reserved.