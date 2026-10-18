// 파일 보내기 — 바이트 그대로, 덩어리·줄 단위, 문자 간·줄 간 지연, 진행·취소. Serial·TCP 공통.
// 경로는 열기 대화상자에서 고른 것만 백엔드로 넘긴다(write_text·read_text 와 같은 약속).
import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { load, store } from "./framing";
import { NumInput } from "./NumInput";
import { useRestoreFocus } from "./restoreFocus";
import { tip } from "./tips";
import { io } from "./ioText";
import { ui, type Lang } from "./uiText";
import "./io.css";

/** 백엔드 codec::Pace 와 같은 모양 */
export interface Pace {
  charDelayMs: number;
  lineDelayMs: number;
  byLine: boolean;
  chunk: number;
}

/** 진행(백엔드 event::Progress·TCP FileProgress) */
export interface Progress {
  id: number;
  sent: number;
  total: number;
  done: boolean;
  cancelled: boolean;
  error?: string;
}

/** 화면이 들고 있는 파일 보내기 상태 */
export interface FileJob extends Progress {
  name: string;
}

export const DEFAULT_PACE: Pace = { charDelayMs: 0, lineDelayMs: 0, byLine: false, chunk: 256 };

const pct = (j: Progress) => (j.total ? Math.floor((j.sent * 100) / j.total) : 0);

/** «12초», «3분 20초», «1시간 5분» */
export function fmtDuration(ms: number, lang: Lang) {
  const s = Math.ceil(ms / 1000);
  const ko = lang === "ko";
  if (s < 60) return ko ? `${s}초` : `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return ko ? `${m}분 ${s % 60}초` : `${m} min ${s % 60} s`;
  return ko ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** 진행 한 줄(보내기 칸 아래·대화상자 안) */
export function jobText(lang: Lang, j: FileJob) {
  const v = { p: pct(j), a: j.sent.toLocaleString(), b: j.total.toLocaleString(), e: j.error ?? "" };
  if (!j.done) return io(lang, "fileSending", v);
  if (j.error) return io(lang, "fileFailed", v);
  if (j.cancelled) return io(lang, "fileCancelled", v);
  return io(lang, "fileDone", v);
}

export function JobBar({ lang, job, onCancel, onOpen, noCancel }: { lang: Lang; job: FileJob; onCancel: () => void; onOpen?: () => void; noCancel?: boolean }) {
  return (
    <div className={`file-job${job.done && (job.error || job.cancelled) ? " warn" : ""}`} role="status">
      <progress max={job.total || 1} value={job.sent} />
      <span className="file-job-text" title={job.name}>
        {job.name} · {jobText(lang, job)}
      </span>
      {!job.done ? (
        !noCancel && (
          <button type="button" className="btn small danger" onClick={onCancel}>
            {io(lang, "fileCancel")}
          </button>
        )
      ) : (
        onOpen && (
          <button type="button" className="btn small ghost" onClick={onOpen}>
            {io(lang, "fileSend")}…
          </button>
        )
      )}
    </div>
  );
}

/**
 * 파일 보내기 대화상자. `start` 는 고른 경로·속도로 보내기를 시작한다(백엔드 send_file).
 * `byteMs` 는 한 바이트 송신 시간 추정(시리얼: 비트 수/속도, TCP: 0) — 예상 시간에 쓴다.
 */
export function FileSendDialog({
  lang,
  job,
  canSend,
  why,
  byteMs,
  target,
  start,
  cancel,
  sizeOf,
  onClose,
}: {
  lang: Lang;
  job: FileJob | null;
  canSend: boolean;
  why?: string;
  byteMs: number;
  target?: string;
  start: (path: string, name: string, pace: Pace) => Promise<void>;
  cancel: () => void;
  /** 고른 파일 크기(백엔드 file_size) — 예상 시간에 쓴다 */
  sizeOf?: (path: string) => Promise<number>;
  onClose: () => void;
}) {
  const back = useRestoreFocus<HTMLDivElement>();
  const [path, setPath] = useState<string | null>(() => load("filePath", null));
  const [pace, setPace] = useState<Pace>(() => ({ ...DEFAULT_PACE, ...load<Partial<Pace>>("filePace", {}) }));
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    setSize(null);
    if (path && sizeOf)
      sizeOf(path)
        .then((n) => alive && setSize(n))
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path, sizeOf]);
  useEffect(() => store("filePace", pace), [pace]);
  useEffect(() => store("filePath", path), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const name = path ? (path.split(/[\\/]/).pop() ?? path) : "";
  const busy = !!job && !job.done;
  // 예상 시간 — 고른 파일 크기(모르면 보내는 중인 진행의 크기)로
  const total = size ?? (job && job.name === name ? job.total : null);
  const est = total != null ? total * (byteMs + pace.charDelayMs) + Math.max(0, (pace.byLine ? Math.ceil(total / 40) : Math.ceil(total / Math.max(1, pace.chunk))) - 1) * pace.lineDelayMs : null;

  async function pick() {
    setErr(null);
    const p = await open({ multiple: false, directory: false }).catch(() => null);
    if (!p || Array.isArray(p)) return;
    setPath(p);
  }
  async function go() {
    if (!path) return;
    setErr(null);
    try {
      await start(path, name, pace);
    } catch (e) {
      setErr(String(e));
    }
  }
  return (
    <div className="modal-back" ref={back} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal file-dialog" role="dialog" aria-label={io(lang, "fileTitle")}>
        <div className="modal-head">
          <b>{io(lang, "fileTitle")}</b>
          <button type="button" className="btn small ghost" onClick={onClose} title={ui(lang, "closeNote")} aria-label={ui(lang, "closeNote")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="row2">
            <input readOnly value={path ?? ""} placeholder={io(lang, "fileNone")} title={path ?? ""} className={path ? "" : "bad"} />
            <button type="button" className="btn small" onClick={pick} disabled={busy} autoFocus>
              {io(lang, "filePick")}
            </button>
          </div>
          {target && <span className="hint">{io(lang, "fileTargetTcp", { a: target })}</span>}
          <label data-tip={tip(lang, "fileMode")}>
            {io(lang, "fileMode")}
            <select value={pace.byLine ? "line" : "chunk"} disabled={busy} onChange={(e) => setPace({ ...pace, byLine: e.target.value === "line" })}>
              <option value="chunk">{io(lang, "fileChunk")}</option>
              <option value="line">{io(lang, "fileLine")}</option>
            </select>
          </label>
          <div className="file-grid">
            {!pace.byLine && (
              <label>
                {io(lang, "fileChunkSize")}
                <NumInput min={1} max={65536} value={pace.chunk || 256} disabled={busy} onValue={(n) => setPace({ ...pace, chunk: n })} />
              </label>
            )}
            <label>
              {io(lang, "fileCharDelay")}
              <NumInput min={0} max={10000} value={pace.charDelayMs} disabled={busy} onValue={(n) => setPace({ ...pace, charDelayMs: n })} />
            </label>
            <label>
              {io(lang, "fileLineDelay")}
              <NumInput min={0} max={600000} value={pace.lineDelayMs} disabled={busy} onValue={(n) => setPace({ ...pace, lineDelayMs: n })} />
            </label>
          </div>
          <span className="hint">{io(lang, "fileHint")}</span>
          {total != null && (
            <span className="hint">
              {io(lang, "fileSize", { n: total.toLocaleString() })}
              {est != null && est > 0 ? ` · ${io(lang, "fileEst", { t: fmtDuration(est, lang) })}` : ""}
            </span>
          )}
          {total != null && total > 32 * 1024 * 1024 && <div className="interlock">{io(lang, "fileTooBig")}</div>}
          {job && <JobBar lang={lang} job={job} onCancel={cancel} noCancel />}
          {!canSend && why && !busy && <div className="interlock">{why}</div>}
          {err && <div className="error">{err}</div>}
          <div className="row2">
            <span className="grow" />
            {busy ? (
              <button type="button" className="btn small danger" onClick={cancel}>
                {io(lang, "fileCancel")}
              </button>
            ) : (
              <button type="button" className="btn small primary" onClick={go} disabled={!path || !canSend}>
                {io(lang, "fileStart")}
              </button>
            )}
            <button type="button" className="btn small" onClick={onClose}>
              {ui(lang, "closeNote")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
