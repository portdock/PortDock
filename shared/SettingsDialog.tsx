import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { NumInput } from "./NumInput";
import { exportAll, importAll, LIMITS, type AutoReport, type LogFormat, type Settings, type TimeFormat, type Theme } from "./settings";
import { ENCODINGS, type Encoding } from "./format";
import { io } from "./ioText";
import { tip } from "./tips";
import { autoSendAvailable, type EnvInfo } from "./report";
import { REPO_URL, SPONSOR_URL } from "./links";
import { useRestoreFocus } from "./restoreFocus";
import { usageAvailable } from "./usage";
import { USAGE_TEXT } from "./usageText";

// 정보(About) 칸의 링크 — opener 권한(capabilities/default.json)이 이 주소들만 연다
const REPO = REPO_URL;
const LINKS = {
  license: "https://www.gnu.org/licenses/gpl-3.0.html",
  source: REPO,
  site: "https://portdock.dev",
  notices: `${REPO}/blob/main/THIRD_PARTY_NOTICES.txt`,
  // 누르면 최신 릴리스 페이지만 연다(하루 한 번 묻기는 설정 «새 버전 확인» 을 켰을 때만 — UpdateNotice)
  latest: `${REPO}/releases/latest`,
  // 비어 있으면 «후원» 단추를 숨긴다(links.ts — 값을 넣으면 opener 권한에도 더할 것)
  sponsor: SPONSOR_URL,
};

const T = {
  ko: {
    title: "설정",
    lang: "언어",
    theme: "테마",
    system: "윈도우 설정 따름",
    light: "밝게",
    dark: "어둡게",
    fontSize: "글자 크기(px)",
    timeFormat: "로그 시각 표시",
    local: "시:분:초.밀리초",
    localDate: "날짜 + 시각",
    utc: "UTC",
    elapsed: "시작부터 지난 시간 (지우면 다시)",
    maxLines: "화면에 남길 줄 수",
    maxLinesHint: "넘치면 화면에서만 오래된 줄을 지웁니다(파일 로그는 그대로).",
    autoScroll: "새 줄이 오면 자동 스크롤(위로 굴리면 멈춤)",
    alwaysOnTop: "항상 위 — 이 창을 다른 창 위에 늘 보이게(머리줄 📌)",
    expandAll: "모두 펼치기(전문가 화면) — 접어 둔 칸(고급 연결·받기 설정·장애 주입·통계 등)을 늘 펼쳐 보이기",
    autoLog: "연결하면 자동으로 파일 로그 시작",
    logFolder: "자동 로그 폴더",
    choose: "고르기",
    noFolder: "폴더를 고르세요",
    confirmExit: "연결·기록 중에 창을 닫으려 하면 묻기",
    lostAlert: "연결이 끊기면 작업 표시줄 깜빡임(창이 뒤에 있을 때)",
    keepAwake: "연결·기록 중 절전 막기(화면은 꺼져도 됨)",
    autoConnect: "켤 때 마지막 연결 다시 열기",
    autoReport: "오류 자동 전송",
    arAsk: "오류로 꺼지면 묻기",
    arOn: "묻지 않고 자동으로 보내기",
    arOff: "보내지 않기",
    autoReportHint: "프로그램 오류(예외·비정상 종료)의 원인과 프로그램·윈도우 버전만 개발자에게 보냅니다. 통신 내용·명령 목록·규칙·IP 는 보내지 않습니다. 인터넷이 없으면 다음에 다시 시도합니다.",
    backup: "설정 백업",
    exportAll: "설정 내보내기",
    importAll: "설정 가져오기",
    reset: "기본값으로",
    resetAsk: "화면 설정을 기본값으로 되돌릴까요? (명령 목록·규칙은 그대로)",
    importAsk: "가져오면 지금 설정·명령 목록·규칙이 모두 바뀝니다. 계속할까요?",
    importBusy: "연결·기록 중에는 가져올 수 없습니다. 먼저 멈추세요.",
    noFolderWarn: "폴더를 고르지 않으면 자동 로그가 시작되지 않습니다.",
    close: "닫기",
    about: "정보",
    copyright: "Copyright (C) 2026 PortDock",
    gpl: "이 프로그램은 자유 소프트웨어이며 GNU GPL v3 에 따라 배포됩니다. 어떠한 보증도 없습니다.",
    license: "라이선스 전문",
    source: "소스 코드",
    site: "홈페이지",
    notices: "제3자 고지",
    sponsor: "후원",
    checkUpdate: "새 버전 확인",
    checkUpdateHint: "최신 릴리스 페이지를 브라우저로 엽니다.",
    updateCheck: "새 버전 확인(하루 한 번)",
    updateCheckHint: "켜면 하루 한 번 GitHub(api.github.com)에 최신 릴리스만 묻고, 새 버전이면 창 아래에 알립니다. 보내는 데이터는 없고 내려받기·설치는 하지 않습니다.",
  },
  en: {
    title: "Settings",
    lang: "Language",
    theme: "Theme",
    system: "Follow Windows",
    light: "Light",
    dark: "Dark",
    fontSize: "Font size (px)",
    timeFormat: "Log timestamp",
    local: "hh:mm:ss.ms",
    localDate: "Date + time",
    utc: "UTC",
    elapsed: "Elapsed since start (Clear resets)",
    maxLines: "Lines kept on screen",
    maxLinesHint: "Older lines are dropped from the screen only (file logs keep everything).",
    autoScroll: "Auto-scroll on new lines (pauses when you scroll up)",
    alwaysOnTop: "Always on top — keep this window above others (📌 in the header)",
    expandAll: "Expand all (expert view) — always show collapsed groups (advanced connection, receive settings, fault injection, statistics …) open",
    autoLog: "Start file logging on connect",
    logFolder: "Auto-log folder",
    choose: "Choose",
    noFolder: "Choose a folder",
    confirmExit: "Ask before closing while connected or logging",
    lostAlert: "Flash the taskbar button when the connection drops (while the window is in the background)",
    keepAwake: "Keep the PC awake while connected or logging (the screen may still turn off)",
    autoConnect: "Reopen the last connection at startup",
    autoReport: "Automatic error reports",
    arAsk: "Ask after a crash",
    arOn: "Send automatically",
    arOff: "Never send",
    autoReportHint: "Sends only the cause of program errors (exceptions, crashes) and the program/Windows version. Traffic, commands, rules and IP settings are never sent. Offline PCs retry next time.",
    backup: "Backup",
    exportAll: "Export settings",
    importAll: "Import settings",
    reset: "Reset to defaults",
    resetAsk: "Reset display settings to defaults? (commands and rules are kept)",
    importAsk: "Importing replaces all current settings, commands and rules. Continue?",
    importBusy: "Stop the connection and logging before importing.",
    noFolderWarn: "Automatic logging will not start until a folder is chosen.",
    close: "Close",
    about: "About",
    copyright: "Copyright (C) 2026 PortDock",
    gpl: "This program is free software, distributed under the GNU GPL v3. It comes with ABSOLUTELY NO WARRANTY.",
    license: "License text",
    source: "Source code",
    site: "Website",
    notices: "Third-party notices",
    sponsor: "Sponsor",
    checkUpdate: "Check for updates",
    checkUpdateHint: "Opens the latest release page in your browser.",
    updateCheck: "Check for new versions (once a day)",
    updateCheckHint: "When on, asks GitHub (api.github.com) once a day for the latest release only and shows a notice at the bottom of the window if a newer version exists. No data is sent; nothing is downloaded or installed.",
  },
};

export function SettingsDialog({
  app,
  version,
  settings,
  update,
  reset,
  onClose,
  writeText,
  readText,
  busy,
  ioOptions,
  conn,
  run,
}: {
  app: string;
  version: string;
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  reset: () => void;
  onClose: () => void;
  writeText: (path: string, text: string) => Promise<void>;
  readText: (path: string) => Promise<string>;
  /** 연결·기록 중 — 가져오기(새로 고침)를 하면 실행 중인 세션이 화면과 끊긴다 */
  busy: boolean;
  /** 글자 인코딩·파일 로그 형식·나누기 칸을 보일지(Serial·TCP·UDP) */
  ioOptions?: boolean;
  /** 연결이 끊길 수 있는 프로그램 — «끊기면 작업 표시줄 깜빡임» 칸을 보일지 */
  conn?: boolean;
  /** 연결(시작)이 있는 프로그램 — «절전 막기»·«켤 때 마지막 연결 다시 열기» 칸을 보일지 */
  run?: boolean;
}) {
  const t = T[settings.lang];
  const [err, setErr] = useState<string | null>(null);
  const back = useRestoreFocus<HTMLDivElement>();
  // 실제 실행 파일의 버전(Cargo) — 못 받으면 화면이 받은 version 을 쓴다
  const [realVersion, setRealVersion] = useState(version);
  useEffect(() => {
    let alive = true;
    invoke<EnvInfo>("report_env")
      .then((e) => alive && e?.version && e.version !== "?" && setRealVersion(e.version))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const link = (url: string) => openUrl(url).catch((e) => setErr(String(e)));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function doExport() {
    const path = await save({ defaultPath: `${app.replace(/\s+/g, "-").toLowerCase()}-settings.json`, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path) return;
    await writeText(path, exportAll(app)).catch((e) => setErr(String(e)));
  }
  async function doImport() {
    if (busy) {
      setErr(t.importBusy);
      return;
    }
    const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return;
    if (!(await ask(t.importAsk, { title: app, kind: "warning" }))) return;
    try {
      importAll(app, await readText(path), settings.lang);
      location.reload();
    } catch (e) {
      setErr(String(e));
    }
  }
  async function doReset() {
    if (await ask(t.resetAsk, { title: app, kind: "warning" })) reset();
  }
  async function chooseFolder() {
    const dir = await open({ directory: true });
    if (dir && !Array.isArray(dir)) update({ logFolder: dir });
  }

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t.title}</b>
          <button className="btn small ghost" onClick={onClose} title={t.close} aria-label={t.close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <label>
            {t.lang}
            <select value={settings.lang} onChange={(e) => update({ lang: e.target.value as Settings["lang"] })}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {t.theme}
            <select value={settings.theme} onChange={(e) => update({ theme: e.target.value as Theme })}>
              <option value="system">{t.system}</option>
              <option value="light">{t.light}</option>
              <option value="dark">{t.dark}</option>
            </select>
          </label>
          <label>
            {t.fontSize}
            <NumInput min={LIMITS.fontSize[0]} max={LIMITS.fontSize[1]} value={settings.fontSize} onValue={(n) => update({ fontSize: n })} />
          </label>
          <label>
            {t.timeFormat}
            <select value={settings.timeFormat} onChange={(e) => update({ timeFormat: e.target.value as TimeFormat })}>
              <option value="local">{t.local}</option>
              <option value="local-date">{t.localDate}</option>
              <option value="utc">{t.utc}</option>
              <option value="elapsed">{t.elapsed}</option>
            </select>
          </label>
          <label>
            {t.maxLines}
            <NumInput min={LIMITS.maxLines[0]} max={LIMITS.maxLines[1]} value={settings.maxLines} onValue={(n) => update({ maxLines: n })} />
            <span className="hint">{t.maxLinesHint}</span>
          </label>
          <label className="inline">
            <input type="checkbox" checked={settings.autoScroll} onChange={(e) => update({ autoScroll: e.target.checked })} /> {t.autoScroll}
          </label>
          <label className="inline">
            <input type="checkbox" checked={settings.alwaysOnTop} onChange={(e) => update({ alwaysOnTop: e.target.checked })} /> {t.alwaysOnTop}
          </label>
          <label className="inline expand-all" data-tip={tip(settings.lang, "expandAll")}>
            <input type="checkbox" checked={settings.expandAll} onChange={(e) => update({ expandAll: e.target.checked })} /> {t.expandAll}
          </label>
          <label className="inline">
            <input type="checkbox" checked={settings.autoLog} onChange={(e) => update({ autoLog: e.target.checked })} /> {t.autoLog}
          </label>
          {settings.autoLog && (
            <div className="row2">
              <input readOnly value={settings.logFolder} placeholder={t.noFolder} title={settings.logFolder} className={settings.logFolder ? "" : "bad"} />
              <button className="btn small" onClick={chooseFolder}>
                {t.choose}
              </button>
            </div>
          )}
          {settings.autoLog && !settings.logFolder && <div className="interlock">{t.noFolderWarn}</div>}
          <label className="inline">
            <input type="checkbox" checked={settings.confirmExit} onChange={(e) => update({ confirmExit: e.target.checked })} /> {t.confirmExit}
          </label>
          {conn && (
            <label className="inline" data-tip={tip(settings.lang, "lostAlert")}>
              <input type="checkbox" checked={settings.lostAlert} onChange={(e) => update({ lostAlert: e.target.checked })} /> {t.lostAlert}
            </label>
          )}
          {run && (
            <>
              <label className="inline" data-tip={tip(settings.lang, "keepAwake")}>
                <input type="checkbox" checked={settings.keepAwake} onChange={(e) => update({ keepAwake: e.target.checked })} /> {t.keepAwake}
              </label>
              <label className="inline" data-tip={tip(settings.lang, "autoConnect")}>
                <input type="checkbox" checked={settings.autoConnect} onChange={(e) => update({ autoConnect: e.target.checked })} /> {t.autoConnect}
              </label>
            </>
          )}
          {ioOptions && (
            <>
              <hr />
              <label>{io(settings.lang, "ioSection")}</label>
              <label data-tip={tip(settings.lang, "encoding")}>
                {io(settings.lang, "encoding")}
                <select value={settings.encoding} onChange={(e) => update({ encoding: e.target.value as Encoding })}>
                  {ENCODINGS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <span className="hint">{io(settings.lang, "encodingHint")}</span>
              </label>
              <label data-tip={tip(settings.lang, "logFormat")}>
                {io(settings.lang, "logFormat")}
                <select value={settings.logFormat} onChange={(e) => update({ logFormat: e.target.value as LogFormat })}>
                  <option value="hex">{io(settings.lang, "fmtHex")}</option>
                  <option value="ascii">{io(settings.lang, "fmtAscii")}</option>
                  <option value="hex-ascii">{io(settings.lang, "fmtHexAscii")}</option>
                  <option value="csv">{io(settings.lang, "fmtCsv")}</option>
                </select>
              </label>
              <div className="grid2">
                <label>
                  {io(settings.lang, "splitMb")}
                  <NumInput min={LIMITS.logSplitMb[0]} max={LIMITS.logSplitMb[1]} value={settings.logSplitMb} onValue={(n) => update({ logSplitMb: n })} />
                </label>
                <label>
                  {io(settings.lang, "splitHours")}
                  <NumInput min={LIMITS.logSplitHours[0]} max={LIMITS.logSplitHours[1]} value={settings.logSplitHours} onValue={(n) => update({ logSplitHours: n })} />
                </label>
              </div>
              <span className="hint">{io(settings.lang, "logFmtHint")}</span>
            </>
          )}
          {autoSendAvailable() && (
            <>
              <label>
                {t.autoReport}
                <select value={settings.autoReport} onChange={(e) => update({ autoReport: e.target.value as AutoReport })}>
                  <option value="ask">{t.arAsk}</option>
                  <option value="on">{t.arOn}</option>
                  <option value="off">{t.arOff}</option>
                </select>
              </label>
              <span className="hint">{t.autoReportHint}</span>
            </>
          )}
          {usageAvailable() && (
            <>
              <label className="inline">
                <input type="checkbox" checked={settings.usageStats} onChange={(e) => update({ usageStats: e.target.checked, usageAsked: true })} />{" "}
                {USAGE_TEXT[settings.lang].setting}
              </label>
              <span className="hint">{USAGE_TEXT[settings.lang].hint}</span>
            </>
          )}
          <hr />
          <label>{t.backup}</label>
          <div className="row2">
            <button className="btn small" onClick={doExport}>
              {t.exportAll}
            </button>
            <button className="btn small" onClick={doImport} disabled={busy} title={busy ? t.importBusy : ""}>
              {t.importAll}
            </button>
            <button className="btn small" onClick={doReset}>
              {t.reset}
            </button>
          </div>
          {err && <div className="error">{err}</div>}
          <hr />
          <label>{t.about}</label>
          <div className="hint">
            <b>{app}</b> {realVersion}
            <br />
            {t.copyright}
            <br />
            {t.gpl}
          </div>
          <div className="row2">
            <button className="btn small ghost" onClick={() => link(LINKS.license)}>
              {t.license}
            </button>
            <button className="btn small ghost" onClick={() => link(LINKS.source)}>
              {t.source}
            </button>
            <button className="btn small ghost" onClick={() => link(LINKS.site)}>
              {t.site}
            </button>
            <button className="btn small ghost" onClick={() => link(LINKS.notices)}>
              {t.notices}
            </button>
            {LINKS.sponsor && (
              <button className="btn small ghost" onClick={() => link(LINKS.sponsor)}>
                {t.sponsor}
              </button>
            )}
          </div>
          <div className="row2">
            <button className="btn small" onClick={() => link(LINKS.latest)} title={t.checkUpdateHint}>
              {t.checkUpdate}
            </button>
          </div>
          <label className="inline" data-tip={t.updateCheckHint}>
            <input type="checkbox" checked={settings.updateCheck} onChange={(e) => update({ updateCheck: e.target.checked })} /> {t.updateCheck}
          </label>
          <span className="hint">{t.updateCheckHint}</span>
        </div>
      </div>
    </div>
  );
}
