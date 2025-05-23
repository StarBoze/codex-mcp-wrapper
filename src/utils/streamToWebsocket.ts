
import { ChildProcessWithoutNullStreams } from 'child_process';
import WebSocket from 'ws';

export function streamChildToWS(child: ChildProcessWithoutNullStreams, ws: WebSocket, jobId: string) {
  child.stdout.on('data', chunk => {
    ws.send(JSON.stringify({ id: jobId, chunk: chunk.toString() }));
  });
  child.stderr.on('data', chunk => {
    ws.send(JSON.stringify({ id: jobId, error: chunk.toString() }));
  });
}
