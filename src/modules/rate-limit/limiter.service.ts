import { Injectable, Inject } from '@nestjs/common';
import { IStorage } from '../storage/interface';

@Injectable()
export class LimiterService {
  constructor(
    @Inject('IStorage') private readonly storage: IStorage
  ) {}

  /**
   * 指定したキーに対してレートリミットをカウントし、制限を超えていればエラーを発生
   * @param key レートリミット用のキー
   * @returns void
   * @throws Error レート制限を超えた場合
   */
  async hit(key: string): Promise<void> {
    await this.storage.hitRate(key);
  }
}
