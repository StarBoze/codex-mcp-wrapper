import { Body, Controller, Post } from '@nestjs/common';
import { CodexService } from '../codex/codex.service';
import { LimiterService } from '../rate-limit/limiter.service';

interface RpcRequest {
  method: string;
  params: {
    args: string[];
    wsId: string;
  };
  id: string;
}

@Controller('rpc')
export class RpcController {
  constructor(
    private readonly codex: CodexService,
    private readonly limiter: LimiterService
  ) {}

  @Post()
  async handleRpc(@Body() body: RpcRequest) {
    const { method, params, id } = body;
    const key = `codex_calls:${method}`;
    await this.limiter.hit(key);
    const job = await this.codex.enqueue(method, { args: params.args, wsId: params.wsId });
    return { id, jobId: job.id };
  }
}
