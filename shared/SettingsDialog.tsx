import { useState } from "react";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { NumInput } from "./NumInput";
import { exportAll, importAll, LIMITS, type Settings, type TimeFormat, type Theme } from "./settings";

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
    elapsed: "첫 줄부터 지난 시간",
    maxLines: "화면에 남길 줄 수",
    maxLinesHint: "넘치면 화면에서만 오래된 줄을 지웁니다(파일 로그는 그대로).",
    autoScroll: "새 줄이 오면 자동 스크롤",
    autoLog: "연결하면 자동으로 파일 로그 시작",
    logFolder: "자동 로그 폴더",
    choose: "고르기",
    noFolder: "폴더를 고르세요",
    confirmExit: "연결·기록 중에 창을 닫으려 하면 묻기",
    backup: "설정 백업",
    exportAll: "설정 내보내기",
    importAll: "설정 가져오기",
    reset: "기본값으로",
    resetAsk: "화면 설정을 기본값으로 되돌릴까요? (명령 목록·규칙은 그대로)",
    importAsk: "가져오면 지금 설정·명령 목록·규칙이 모두 바뀝니다. 계속할까요?",
    close: "닫기",
    about: "정보",
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
    elapsed: "Elapsed since first line",
    maxLines: "Lines kept on screen",
    maxLinesHint: "Older lines are dropped from the screen only (file logs keep everything).",
    autoScroll: "Auto-scroll on new lines",
    autoLog: "Start file logging on connect",
    logFolder: "Auto-log folder",
    choose: "Choose",
    noFolder: "Choose a folder",
    confirmExit: "Ask before closing while connected or logging",
    backup: "Backup",
    exportAll: "Export settings",
    importAll: "Import settings",
    reset: "Reset to defaults",
    resetAsk: "Reset display settings to defaults? (commands and rules are kept)",
    importAsk: "Importing replaces all current settings, commands and rules. Continue?",
    close: "Close",
    about: "About",
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
}: {
  app: string;
  version: string;
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  reset: () => void;
  onClose: () => void;
  writeText: (path: string, text: string) => Promise<void>;
  readText: (path: string) => Promise<string>;
}) {
  const t = T[settings.lang];
  const [err, setErr] = useState<string | null>(null);

  async function doExport() {
    const path = await save({ defaultPath: `${app.replace(/\s+/g, "-").toLowerCase()}-settings.json`, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path) return;
    await writeText(path, exportAll(app)).catch((e) => setErr(String(e)));
  }
  async function doImport() {
    const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return;
    if (!(await ask(t.importAsk, { title: app, kind: "warning" }))) return;
    try {
      importAll(app, await readText(path));
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
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t.title}</b>
          <button className="btn small ghost" onClick={onClose} title={t.close}>
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
          <label className="inline">
            <input type="checkbox" checked={settings.confirmExit} onChange={(e) => update({ confirmExit: e.target.checked })} /> {t.confirmExit}
          </label>
          <hr />
          <label>{t.backup}</label>
          <div className="row2">
            <button className="btn small" onClick={doExport}>
              {t.exportAll}
            </button>
            <button className="btn small" onClick={doImport}>
              {t.importAll}
            </button>
            <button className="btn small" onClick={doReset}>
              {t.reset}
            </button>
          </div>
          {err && <div className="error">{err}</div>}
          <hr />
          <div className="hint">
            {app} {version} · GPL-3.0 · portdock.dev
          </div>
        </div>
      </div>
    </div>
  );
}
