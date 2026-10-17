import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ISSUES_URL,
  REPORT_EMAIL,
  autoSend,
  autoSendAvailable,
  autoSendCrashes,
  buildReport,
  configSnapshot,
  frameLines,
  issueUrl,
  mailtoUrl,
  recentErrors,
  reportApi,
  type CrashReport,
  type EnvInfo,
  type ReportFrame,
} from "./report";

const LOG_LINES = 200;

const UI = {
  ko: {
    button: "문제 보고 — 개발자에게 오류·버그 보내기",
    title: "문제 보고",
    intro: "이 PC 에서 보고서를 만들어 아래에 보여 줍니다. 자동으로 보내지 않습니다. 내용을 확인한 뒤 보내는 방법을 고르세요.",
    what: "무슨 일이 있었나요? (하던 작업, 누른 버튼, 기대한 결과와 실제 결과)",
    whatPh: "예) TCP 서버로 듣는 중에 상대 3개가 붙자 화면이 멈췄습니다.",
    env: "프로그램·윈도우 버전 (항상 넣음)",
    errors: "이번 실행의 오류 {n}개",
    crashes: "오류로 꺼진 기록 {n}개",
    config: "연결·화면 설정 (IP·포트·속도 등 — 명령 목록·규칙은 넣지 않음)",
    log: "최근 통신 기록 {n}줄",
    logWarn: "통신 기록에는 회사·장비 데이터가 들어 있을 수 있습니다. 보내도 되는 경우에만 켜세요.",
    preview: "보낼 내용 (미리보기)",
    copy: "복사",
    copied: "복사했습니다",
    saveFile: "파일로 저장",
    saved: "저장했습니다: {a}",
    email: "이메일로 보내기",
    emailHint: "메일 프로그램이 열립니다. 길면 잘리므로 «파일로 저장» 한 파일을 첨부하세요.",
    issue: "GitHub 이슈로 보내기",
    issueHint: "GitHub 에 공개로 올라갑니다(계정 필요). 회사 정보가 없는지 확인하세요.",
    offline: "인터넷이 없는 PC 라면 «파일로 저장» 한 뒤 USB 로 옮겨 이메일·GitHub 로 보내 주세요.",
    close: "닫기",
    crashTitle: "지난번에 오류로 꺼졌습니다",
    crashBody: "{a} 이(가) 지난번에 예기치 않게 꺼졌습니다. 원인 기록이 남아 있습니다. 개발자에게 보내 주시면 고치는 데 큰 도움이 됩니다.",
    crashOpen: "보고서 보기",
    crashLater: "나중에",
    crashDiscard: "보내지 않고 지우기",
    noTarget: "보낼 곳이 아직 정해지지 않았습니다. «파일로 저장» 을 쓰세요.",
    sendNow: "지금 바로 보내기",
    sendNowHint: "위 미리보기 내용 그대로 개발자에게 바로 보냅니다(인터넷 필요, 계정 필요 없음).",
    sending: "보내는 중…",
    sentOk: "보냈습니다. 고맙습니다!",
    sendFail: "보내지 못했습니다(인터넷 연결 확인). «파일로 저장» 해 두었다가 나중에 보내 주세요.",
    crashSend: "지금 보내기",
    crashAlways: "앞으로는 묻지 않고 자동으로 보내기",
  },
  en: {
    button: "Report a problem — send errors and bugs to the developer",
    title: "Report a problem",
    intro: "A report is built on this PC and shown below. Nothing is sent automatically. Review it, then choose how to send it.",
    what: "What happened? (what you were doing, what you clicked, expected vs. actual result)",
    whatPh: "e.g. The window froze when a third peer connected to the TCP server.",
    env: "Program and Windows version (always included)",
    errors: "{n} error(s) in this session",
    crashes: "{n} crash record(s)",
    config: "Connection and display settings (IP, port, baud … — commands and rules are not included)",
    log: "Last {n} traffic lines",
    logWarn: "Traffic may contain company or device data. Include it only if that is allowed.",
    preview: "Report preview",
    copy: "Copy",
    copied: "Copied",
    saveFile: "Save to file",
    saved: "Saved: {a}",
    email: "Send by email",
    emailHint: "Your mail program opens. Long reports are cut, so attach the file from «Save to file».",
    issue: "Open a GitHub issue",
    issueHint: "Posted publicly on GitHub (account required). Make sure it has no company data.",
    offline: "On an offline PC, «Save to file», move it by USB and send it from another PC.",
    close: "Close",
    crashTitle: "The program crashed last time",
    crashBody: "{a} closed unexpectedly last time and left a crash record. Sending it to the developer helps a lot.",
    crashOpen: "View report",
    crashLater: "Later",
    crashDiscard: "Discard without sending",
    noTarget: "No destination is configured yet. Use «Save to file».",
    sendNow: "Send now",
    sendNowHint: "Sends the preview above directly to the developer (internet required, no account needed).",
    sending: "Sending…",
    sentOk: "Sent. Thank you!",
    sendFail: "Could not send (check the internet connection). «Save to file» and send it later.",
    crashSend: "Send now",
    crashAlways: "From now on, send automatically without asking",
  },
};
type Lang = "ko" | "en";
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

export function ReportDialog({
  app,
  lang,
  frames,
  onClose,
}: {
  app: string;
  lang: Lang;
  /** 최근 통신 기록 — 없으면 그 칸은 안 보인다 */
  frames?: () => ReportFrame[];
  onClose: () => void;
}) {
  const u = UI[lang];
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [crashes, setCrashes] = useState<CrashReport[]>([]);
  const [desc, setDesc] = useState("");
  const [incErrors, setIncErrors] = useState(true);
  const [incCrashes, setIncCrashes] = useState(true);
  const [incConfig, setIncConfig] = useState(true);
  const [incLog, setIncLog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const handled = useRef(false);
  // 열 때 한 번만 찍어 둔다 — 보는 동안 내용이 바뀌지 않게
  const errors = useMemo(() => recentErrors(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const logs = useMemo(() => (frames ? frameLines(frames(), LOG_LINES) : []), []);
  const config = useMemo(() => configSnapshot(), []);

  useEffect(() => {
    reportApi.env().then(setEnv);
    reportApi.pending().then(setCrashes);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const report = buildReport({
    app,
    env,
    description: desc,
    errors: incErrors ? errors : null,
    crashes: incCrashes ? crashes : null,
    config: incConfig ? config : null,
    log: incLog ? logs : null,
  });

  /** 보냈거나 저장한 오류 종료 기록은 닫을 때 지운다(다음에 또 묻지 않게) */
  function close() {
    if (handled.current && incCrashes) for (const c of crashes) reportApi.dismiss(c.name);
    onClose();
  }
  function done(m: string) {
    handled.current = true;
    setErr(null);
    setMsg(m);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      done(u.copied);
    } catch (e) {
      setErr(String(e));
    }
  }
  async function saveFile() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const name = app.toLowerCase().replace(/\s+/g, "-");
    const path = await save({ defaultPath: `${name}-report-${stamp}.md`, filters: [{ name: "Report", extensions: ["md", "txt"] }] });
    if (!path) return;
    try {
      await invoke("write_text", { path, text: report });
      done(fill(u.saved, { a: path }));
    } catch (e) {
      setErr(String(e));
    }
  }
  async function open(url: string, hint: string) {
    try {
      await openUrl(url);
      done(hint);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function sendNow() {
    setSending(true);
    setMsg(null);
    const title = desc.trim().split("\n")[0].slice(0, 120) || "user report";
    const ok = await autoSend({ source: "user", title, detail: report, level: incCrashes && crashes.length ? "fatal" : "info" });
    setSending(false);
    if (ok) done(u.sentOk);
    else setErr(u.sendFail);
  }

  const check = (on: boolean, set: (v: boolean) => void, label: string, disabled = false) => (
    <label className="inline">
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => set(e.target.checked)} /> {label}
    </label>
  );

  return (
    <div className="modal-back" onClick={close}>
      <div className="modal report" role="dialog" aria-label={u.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>
            {app} · {u.title}
          </b>
          <button className="btn small ghost" onClick={close} title={u.close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="hint">{u.intro}</div>
          <label>
            {u.what}
            <textarea rows={3} value={desc} placeholder={u.whatPh} onChange={(e) => setDesc(e.target.value)} autoFocus />
          </label>
          <div className="report-parts">
            {check(true, () => {}, u.env, true)}
            {check(incErrors, setIncErrors, fill(u.errors, { n: errors.length }), errors.length === 0)}
            {crashes.length > 0 && check(incCrashes, setIncCrashes, fill(u.crashes, { n: crashes.length }))}
            {check(incConfig, setIncConfig, u.config)}
            {frames && check(incLog, setIncLog, fill(u.log, { n: logs.length }), logs.length === 0)}
            {incLog && <div className="interlock">{u.logWarn}</div>}
          </div>
          <label>
            {u.preview}
            <textarea className="mono report-preview" readOnly value={report} />
          </label>
          <div className="row2 wrap">
            {autoSendAvailable() && (
              <button className="btn small primary" data-tip={u.sendNowHint} onClick={sendNow} disabled={sending}>
                {sending ? u.sending : u.sendNow}
              </button>
            )}
            <button className="btn small" onClick={copy}>
              {u.copy}
            </button>
            <button className="btn small" onClick={saveFile}>
              {u.saveFile}
            </button>
            {REPORT_EMAIL && (
              <button className="btn small" data-tip={u.emailHint} onClick={() => open(mailtoUrl(app, report), u.emailHint)}>
                {u.email}
              </button>
            )}
            {ISSUES_URL && (
              <button className="btn small" data-tip={u.issueHint} onClick={() => open(issueUrl(app, desc, report), u.issueHint)}>
                {u.issue}
              </button>
            )}
          </div>
          {!autoSendAvailable() && !REPORT_EMAIL && !ISSUES_URL && <div className="hint">{u.noTarget}</div>}
          <div className="hint">{u.offline}</div>
          {msg && <div className="ok-msg">{msg}</div>}
          {err && <div className="error">{err}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * 머리줄의 «!» 버튼 + 문제 보고 창 + 시작할 때 «지난번에 오류로 꺼졌습니다» 안내.
 * 각 프로그램은 이것 하나만 머리줄에 둔다. 자동 전송을 켰으면 묻지 않고 보낸다.
 */
export function ReportButton({
  app,
  lang,
  frames,
  autoReport,
  setAutoReport,
}: {
  app: string;
  lang: Lang;
  frames?: () => ReportFrame[];
  autoReport: "ask" | "on" | "off";
  setAutoReport: (v: "ask" | "on" | "off") => void;
}) {
  const u = UI[lang];
  const [open, setOpen] = useState(false);
  const [crashes, setCrashes] = useState<CrashReport[]>([]);
  const [prompt, setPrompt] = useState(false);
  const [always, setAlways] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mode = useRef(autoReport);
  mode.current = autoReport;

  useEffect(() => {
    (async () => {
      let list = await reportApi.pending();
      if (list.length && autoSendAvailable() && mode.current === "on") {
        await autoSendCrashes(list);
        list = await reportApi.pending(); // 못 보낸 것만 남는다 — 다음 실행 때 다시
        setCrashes(list);
        return;
      }
      setCrashes(list);
      setPrompt(list.length > 0 && mode.current !== "off");
    })();
  }, []);

  const discard = () => {
    for (const c of crashes) reportApi.dismiss(c.name);
    setCrashes([]);
    setPrompt(false);
  };
  async function sendCrashes() {
    setBusy(true);
    setFailed(false);
    if (always) setAutoReport("on");
    const left = await autoSendCrashes(crashes);
    setBusy(false);
    if (left) {
      setFailed(true);
      setCrashes(await reportApi.pending());
    } else {
      setCrashes([]);
      setPrompt(false);
    }
  }

  return (
    <>
      <button className={crashes.length ? "icon-btn alert" : "icon-btn"} onClick={() => setOpen(true)} title={u.button} aria-label={u.button}>
        !
      </button>
      {prompt && !open && (
        <div className="modal-back">
          <div className="modal" role="alertdialog" aria-label={u.crashTitle}>
            <div className="modal-head">
              <b>{u.crashTitle}</b>
            </div>
            <div className="modal-body">
              <div>{fill(u.crashBody, { a: app })}</div>
              {autoSendAvailable() && (
                <label className="inline">
                  <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} /> {u.crashAlways}
                </label>
              )}
              <div className="row2 wrap">
                {autoSendAvailable() && (
                  <button className="btn small primary" onClick={sendCrashes} disabled={busy} autoFocus>
                    {busy ? u.sending : u.crashSend}
                  </button>
                )}
                <button className="btn small" onClick={() => setOpen(true)} disabled={busy}>
                  {u.crashOpen}
                </button>
                <button className="btn small" onClick={() => setPrompt(false)} disabled={busy}>
                  {u.crashLater}
                </button>
                <button className="btn small" onClick={discard} disabled={busy}>
                  {u.crashDiscard}
                </button>
              </div>
              {failed && <div className="error">{u.sendFail}</div>}
            </div>
          </div>
        </div>
      )}
      {open && (
        <ReportDialog
          app={app}
          lang={lang}
          frames={frames}
          onClose={() => {
            setOpen(false);
            setPrompt(false); // 이번 실행에선 다시 묻지 않는다
            reportApi.pending().then(setCrashes);
          }}
        />
      )}
    </>
  );
}
