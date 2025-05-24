/**
 * ストレージバックエンドの抽象インターフェース
 * Redis または SQLite を使用した実装を提供
 */
export interface IStorage {
  /**
   * ストレージを初期化
   * Redis接続の確立やSQLiteテーブル作成などを行う
   */
  init(): Promise<void>;
  
  /**
   * ジョブをキューに追加
   * @param jobType - ジョブの種類
   * @param data - ジョブデータ
   * @returns ジョブID
   */
  enqueue(jobType: string, data: any): Promise<string>;
  
  /**
   * レートリミットのヒットカウント
   * 指定されたキーに対するヒット数をカウントし、制限を超える場合はエラーを発生
   * @param key - レートリミット用のキー
   * @throws Error - レート制限を超えた場合
   */
  hitRate(key: string): Promise<void>;

  /**
   * 指定したジョブIDの情報を取得
   * @param id - ジョブID
   * @returns ジョブ情報、存在しない場合は null
   */
  getJob(id: string): Promise<any | null>;
}
