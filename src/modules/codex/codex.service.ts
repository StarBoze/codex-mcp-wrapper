import { Injectable, Logger, Inject } from '@nestjs/common';
import { IStorage } from '../storage/interface';

@Injectable()
export class CodexService {
  private readonly logger = new Logger(CodexService.name);

  constructor(
    @Inject('IStorage') private readonly storage: IStorage
  ) {}

  /**
   * ジョブをキューに追加
   * @param job ジョブ名
   * @param data ジョブデータ
   * @returns ジョブIDを含むオブジェクト
   */
  async enqueue(job: string, data: any) {
    try {
      const jobId = await this.storage.enqueue(job, data);
      return { id: jobId };
    } catch (error: any) {
      this.logger.error(`Failed to enqueue job '${job}': ${error.message}`, error.stack);
      throw error;
    }
  }
}
