// pcap 해석기의 Web Worker — 파일을 화면 밖에서 읽고 풀어, 진행률과 결과만 돌려준다(네트워크 요청 없음).
// 취소는 화면 쪽에서 worker.terminate().
import { analyzeCapture, type AnalyzeOpts } from "./pcapAnalyze.ts";
import { CaptureError } from "./pcapRead.ts";

export type WorkerIn = { file: Blob; opts: AnalyzeOpts };
export type WorkerOut = { type: "progress"; phase: "read" | "parse"; f: number } | { type: "done"; result: ReturnType<typeof analyzeCapture> } | { type: "error"; code: string; message: string };

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  try {
    post({ type: "progress", phase: "read", f: 0 });
    const buf = new Uint8Array(await e.data.file.arrayBuffer());
    let last = 0;
    const result = analyzeCapture(buf, e.data.opts, (f) => {
      if (f - last >= 0.01) {
        last = f;
        post({ type: "progress", phase: "parse", f });
      }
    });
    post({ type: "done", result });
  } catch (err) {
    post({ type: "error", code: err instanceof CaptureError ? err.code : "internal", message: String((err as Error)?.message ?? err) });
  }
};
