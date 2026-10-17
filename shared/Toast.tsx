// 잠깐 뜨는 알림 — «지웠습니다 [되돌리기]» 처럼 확인 창 대신 쓴다. 5초 뒤(마우스를 올려 두면 그동안 멈춤) 사라진다.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ui, type Lang } from "./uiText";

type Toast = { id: number; text: string; undo?: () => void; kind: "info" | "error"; ms: number };

export function useToast(lang: Lang) {
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string, opts: { undo?: () => void; error?: boolean; ms?: number } = {}) => {
    setToast({ id: ++seq.current, text, undo: opts.undo, kind: opts.error ? "error" : "info", ms: opts.ms ?? (opts.undo ? 5000 : 2500) });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  const node: ReactNode = toast ? <ToastBar key={toast.id} toast={toast} lang={lang} onDone={hide} /> : null;
  return { show, hide, node };
}

export type ToastApi = ReturnType<typeof useToast>;

function ToastBar({ toast, lang, onDone }: { toast: Toast; lang: Lang; onDone: () => void }) {
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold) return;
    const id = setTimeout(onDone, toast.ms);
    return () => clearTimeout(id);
  }, [hold, toast.ms, onDone]);
  return (
    <div className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"} aria-live="polite" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <span className="toast-text">{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          className="btn small toast-undo"
          onClick={() => {
            onDone();
            toast.undo!();
          }}
        >
          {ui(lang, "undo")}
        </button>
      )}
      <button type="button" className="btn small ghost" onClick={onDone} title={ui(lang, "closeNote")} aria-label={ui(lang, "closeNote")}>
        ✕
      </button>
    </div>
  );
}
