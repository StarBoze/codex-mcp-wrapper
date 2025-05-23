import * as dotenv from 'dotenv';

dotenv.config();

/**
 * 環境変数を読み込み、設定オブジェクトを生成
 * パフォーマンス最適化のため、一度だけ生成して再利用する
 */
let cachedConfig: any;

function loadConfig() {
  return {
    port: parseInt(process.env.PORT || '8123', 10),
    jwtSecret: process.env.JWT_SECRET || 'change-me',
    // ストレージ設定（Redis/SQLite）
    storage: {
      driver: process.env.STORAGE_DRIVER || 'redis', // 'redis' または 'sqlite'
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      sqliteFile: process.env.SQLITE_DB || './wrapper.sqlite'
    },
    redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
    codex: { model: 'codex-1', apiKey: process.env.OPENAI_API_KEY },
    rateLimit: { rpm: 60 },
    capabilitiesFile: process.env.CAPABILITIES_FILE || './capabilities.json'
  };
}

export default function config() {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
