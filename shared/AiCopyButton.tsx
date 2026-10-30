// «AI 에게 물어보기용 복사»(0.8.0) — 머리줄 «AI» 단추 → 미리보기 창 → 클립보드. 아무 데도 보내지 않는다.
// 글 만들기·가림·길이 줄이기는 aiCopy.ts(시험 있음).
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AI_MAX_CHARS, aiFrameLines, buildAiCopy, settingsLines, type AiFrame, type AiKind, type HideIp } from "./aiCopy.ts";
import { configSnapshot, envOnce, recentErrors, type EnvInfo } from "./report";
import { useRestoreFocus } from "./restoreFocus";
import { tip } from "./tips";
import { count } from "./usage";

type Lang = "ko" | "en";

const UI = {
  ko: {
    button: "AI 에 묻기 — 복사만, 보내지 않음: 지금 상황을 AI 채팅에 붙여 넣을 글로 클립보드에",
    title: "AI 에게 물어보기용 복사",
    introLog: "프로그램·연결 설정·이번 실행의 오류·최근 통신 기록을 AI 채팅에 붙여 넣기 좋은 글(질문 틀 포함)로 만듭니다.",
    introChecks: "프로그램·이번 실행의 오류·점검 결과를 AI 채팅에 붙여 넣기 좋은 글(질문 틀 포함)로 만듭니다.",
    local: "PortDock 은 아무 데도 보내지 않고 클립보드에만 넣습니다.",
    warn: "붙여 넣는 AI 서비스로 내용이 갑니다. 장비·회사 정보는 확인 후 붙여 넣으세요.",
    hideIp: "사설 IP 도 가리기 (공인 IP 는 늘 가림)",
    incLog: "최근 통신 기록 넣기",
    incChecks: "점검 결과 넣기",
    incFound: "찾은 장비 넣기",
    introFound: "프로그램·이번 실행의 오류·찾은 장비 목록을 AI 채팅에 붙여 넣기 좋은 글(질문 틀 포함)로 만듭니다.",
    preview: "붙여 넣을 내용 (미리보기)",
    size: "{n}자 / 한도 {max}자",
    cut: " · 오래된 줄 {n}개 뺌",
    cutText: " · 긴 글 뒤를 자름",
    copy: "복사",
    copied: "복사했습니다 — AI 채팅 입력칸에 붙여 넣고(Ctrl+V) «상황» 칸을 채워 주세요.",
    copyFail: "복사하지 못했습니다 — 클립보드를 다른 프로그램이 쓰고 있을 수 있습니다",
    close: "닫기",
  },
  en: {
    button: "Ask AI — copy only, nothing is sent: the current situation as text for an AI chat, on the clipboard",
    title: "Copy for asking AI",
    introLog: "Builds text for an AI chat (with a question template): program, connection settings, errors in this session and recent traffic.",
    introChecks: "Builds text for an AI chat (with a question template): program, errors in this session and check results.",
    local: "PortDock sends nothing anywhere — it only goes to the clipboard.",
    warn: "Whatever you paste goes to that AI service. Check device and company details before pasting.",
    hideIp: "Hide private IPs too (public IPs are always hidden)",
    incLog: "Include recent traffic",
    incChecks: "Include check results",
    incFound: "Include devices found",
    introFound: "Builds text for an AI chat (with a question template): program, errors in this session and the devices found.",
    preview: "Text to paste (preview)",
    size: "{n} / {max} characters",
    cut: " · {n} older lines removed",
    cutText: " · long text cut",
    copy: "Copy",
    copied: "Copied — paste it into the AI chat (Ctrl+V) and fill in «Situation».",
    copyFail: "Could not copy — another program may be holding the clipboard",
    close: "Close",
  },
};
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** 연결 설정으로 넣을 저장값 — 문제 보고와 같은 허용 목록에서 화면·언어 설정은 뺀다 */
const SKIP_KEYS = new Set(["settings", "view", "trafficView", "format"]);

const HIDE_KEY = "aiCopyHideIp";
function loadHide(): HideIp {
  try {
    return localStorage.getItem(HIDE_KEY) === "all" ? "all" : "public";
  } catch {
    return "public";
  }
}
function saveHide(v: HideIp) {
  try {
    localStorage.setItem(HIDE_KEY, v);
  } catch {
    /* 저장 못 해도 이번 창에서는 그대로 */
  }
}

/** 창 제목(«COM3 115200 8N1 · 연결됨 — PortDock Serial»)에서 상태 부분만 */
function stateFromTitle(app: string) {
  const t = typeof document !== "undefined" ? document.title : "";
  const suffix = ` — ${app}`;
  if (!t || t === app) return null;
  return t.endsWith(suffix) ? t.slice(0, -suffix.length) : t;
}

export function AiCopyDialog({
  app,
  lang,
  frames,
  checks,
  kind,
  onClose,
}: {
  app: string;
  lang: Lang;
  frames?: () => AiFrame[];
  checks?: () => string | null;
  /** 질문 틀 종류 — 비우면 통신 앱(장비·배선) */
  kind?: AiKind;
  onClose: () => void;
}) {
  const u = UI[lang];
  const back = useRestoreFocus<HTMLDivElement>();
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [hideIp, setHideIp] = useState<HideIp>(loadHide);
  const [incLog, setIncLog] = useState(true);
  const [incChecks, setIncChecks] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // 열 때 한 번만 찍어 둔다 — 보는 동안 내용이 바뀌지 않게
  /* eslint-disable react-hooks/exhaustive-deps */
  const log = useMemo(() => (frames ? aiFrameLines(frames()) : null), []);
  const checkText = useMemo(() => (checks ? checks() : null), []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const state = useMemo(() => stateFromTitle(app), [app]);
  const errors = useMemo(() => recentErrors().slice(-10).map((e) => `[${e.source}]${e.count > 1 ? ` ×${e.count}` : ""} ${e.message.slice(0, 500)}`), []);
  const settings = useMemo(() => {
    const cfg = configSnapshot();
    for (const k of SKIP_KEYS) delete cfg[k];
    return settingsLines(cfg);
  }, []);

  useEffect(() => {
    let live = true;
    envOnce().then((e) => live && setEnv(e));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const result = buildAiCopy({
    lang,
    app,
    version: env?.version,
    os: env ? `${env.os} ${env.arch}` : null,
    state,
    settings,
    errors,
    checks: checkText && incChecks ? checkText : null,
    log: log && incLog ? log : undefined,
    hideIp,
    kind,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.text);
      count("ai_copy");
      setErr(null);
      setMsg(u.copied);
    } catch {
      setMsg(null);
      setErr(u.copyFail);
    }
  }

  const status =
    fill(u.size, { n: result.text.length.toLocaleString("en-US"), max: AI_MAX_CHARS.toLocaleString("en-US") }) +
    (result.cutLines ? fill(u.cut, { n: result.cutLines }) : "") +
    (result.cutText ? u.cutText : "");

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal report ai-copy" role="dialog" aria-label={u.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>
            {app} · {u.title}
          </b>
          <button className="btn small ghost" onClick={onClose} title={u.close} aria-label={u.close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="hint">
            {checks && !frames ? (kind === "scan" ? u.introFound : u.introChecks) : u.introLog} {u.local}
          </div>
          <div className="interlock">{u.warn}</div>
          <div className="report-parts">
            <label className="inline" data-tip={tip(lang, "aiHideIp")}>
              <input
                type="checkbox"
                checked={hideIp === "all"}
                onChange={(e) => {
                  const v: HideIp = e.target.checked ? "all" : "public";
                  setHideIp(v);
                  saveHide(v);
                }}
              />{" "}
              {u.hideIp}
            </label>
            {log && (
              <label className="inline">
                <input type="checkbox" checked={incLog} onChange={(e) => setIncLog(e.target.checked)} /> {u.incLog}
              </label>
            )}
            {checkText && (
              <label className="inline">
                <input type="checkbox" checked={incChecks} onChange={(e) => setIncChecks(e.target.checked)} /> {kind === "scan" ? u.incFound : u.incChecks}
              </label>
            )}
          </div>
          <label>
            {u.preview}
            <textarea className="report-preview" readOnly value={result.text} />
          </label>
          <div className="hint ai-copy-size">{status}</div>
          <div className="row2 wrap">
            <button className="btn small primary" onClick={() => void copy()} data-tip={tip(lang, "aiCopy")} autoFocus>
              {u.copy}
            </button>
            <button className="btn small" onClick={onClose}>
              {u.close}
            </button>
          </div>
          {msg && <div className="ok-msg">{msg}</div>}
          {err && <div className="error">{err}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * 머리줄 «AI» 단추 — 문제 보고(!) 옆. 통신 앱은 `frames`(최근 기록), Port Inspector·Hardware Tester 는 `checks`(점검 결과 글)
 */
export function AiCopyButton({ app, lang, frames, checks, kind }: { app: string; lang: Lang; frames?: () => AiFrame[]; checks?: () => string | null; kind?: AiKind }) {
  const u = UI[lang];
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="icon-btn ai-copy-btn" onClick={() => setOpen(true)} title={u.button} aria-label={u.button}>
        AI
      </button>
      {/* body 에 그린다 — 좁은 창에서는 이 단추가 접힌 칸 안에 있을 수 있다(문제 보고와 같음) */}
      {open && createPortal(<AiCopyDialog app={app} lang={lang} frames={frames} checks={checks} kind={kind} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
