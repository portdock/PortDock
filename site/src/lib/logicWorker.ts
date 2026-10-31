// 로직 분석기 캡처 해석기의 Web Worker — 파일을 조각으로 읽어(logicCapture.ts) 진행률과 결과만 돌려준다(네트워크 요청 없음).
// 취소는 화면 쪽에서 worker.terminate().
import { createParser, CaptureError, type Capture, type ParseOpts } from "./logicCapture.ts";

export type WorkerIn = { file: Blob; opts: ParseOpts };
export type WorkerOut = { type: "progress"; f: number } | { type: "done"; capture: Capture } | { type: "error"; code: string; message: string };

const post = (m: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  try {
    const { file, opts } = e.data;
    const p = createParser(opts);
    const dec = new TextDecoder("utf-8");
    const rd = file.stream().getReader();
    let got = 0;
    let last = 0;
    for (;;) {
      const r = await rd.read();
      if (r.done) break;
      got += r.value.byteLength;
      p.push(dec.decode(r.value, { stream: true }));
      const f = file.size ? got / file.size : 1;
      if (f - last >= 0.01) {
        last = f;
        post({ type: "progress", f });
      }
    }
    p.push(dec.decode());
    const capture = p.finish();
    post({ type: "done", capture }, capture.channels.map((c) => c.t.buffer));
  } catch (err) {
    post({ type: "error", code: err instanceof CaptureError ? err.code : "internal", message: String((err as Error)?.message ?? err) });
  }
};
