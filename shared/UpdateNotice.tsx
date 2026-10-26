// 새 버전 확인(0.3.0, 선택·기본 꺼짐) — 설정 «새 버전 확인(하루 한 번)» 을 켜면 하루 한 번 GitHub API 의 최신 릴리스 하나만 묻고,
// 새 버전이면 창 아래에 작은 알림줄 «새 버전 0.3.1 이 있습니다 [릴리스 페이지] ✕». 내려받기·설치는 하지 않는다(페이지만 연다).
// 보내는 것은 그 요청 하나(주소·User-Agent 등 브라우저 기본 머리)뿐이고 쿠키·식별자는 없다. 실패하면 조용히 다음 날.
// main.tsx 가 그린다(앱 화면과 따로) — 설정은 localStorage 를 읽고, 이 창에서 바꾸면 SETTINGS_EVENT 로 다시 읽는다.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { VERSION } from "./version";
import { load, store } from "./framing";
import { SETTINGS_EVENT } from "./settings";
import { checkDue, LATEST_API, parseLatest, shouldNotify } from "./updateRule";

type Lang = "ko" | "en";

const T = {
  ko: { msg: "새 버전 {a} 이 있습니다(지금 {b}).", open: "릴리스 페이지", later: "이 버전은 그만 알리기", close: "닫기(다음에 켤 때 다시)" },
  en: { msg: "Version {a} is available (you have {b}).", open: "Release page", later: "Don't remind me about this version", close: "Close (shown again next start)" },
};

function readSettings(): { on: boolean; lang: Lang } {
  try {
    const s = JSON.parse(localStorage.getItem("settings") ?? "{}") as { updateCheck?: unknown; lang?: unknown };
    return { on: s.updateCheck === true, lang: s.lang === "en" ? "en" : "ko" };
  } catch {
    return { on: false, lang: "ko" };
  }
}

interface Latest {
  version: string;
  url: string;
}

/** 하루에 한 번 묻는다 — 마지막 확인 시각·결과는 이 프로그램 저장소에(앱마다 따로) */
async function checkOnce(): Promise<Latest | null> {
  const last = load<number>("updateCheckedAt", 0);
  const cached = load<Latest | null>("updateLatest", null);
  if (!checkDue(last, Date.now())) return cached;
  if (!navigator.onLine) return cached;
  store("updateCheckedAt", Date.now());
  try {
    const r = await fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" }, credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return cached;
    const latest = parseLatest(await r.json());
    store("updateLatest", latest);
    return latest;
  } catch {
    return cached;
  }
}

export function UpdateNotice() {
  const [cfg, setCfg] = useState(readSettings);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(() => load<string | null>("updateDismissed", null));
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const re = () => setCfg(readSettings());
    window.addEventListener(SETTINGS_EVENT, re);
    window.addEventListener("storage", re);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, re);
      window.removeEventListener("storage", re);
    };
  }, []);
  useEffect(() => {
    if (!cfg.on) return;
    let alive = true;
    // 켤 때 화면을 붙잡지 않게 조금 뒤에
    const id = setTimeout(() => void checkOnce().then((l) => alive && setLatest(l)), 4000);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [cfg.on]);
  const dismiss = useCallback(() => {
    if (!latest) return;
    store("updateDismissed", latest.version);
    setDismissed(latest.version);
  }, [latest]);
  if (!cfg.on || hidden || !latest || !shouldNotify(VERSION, latest.version, dismissed)) return null;
  const t = T[cfg.lang];
  return createPortal(
    <div className="update-note" role="status">
      <span>{t.msg.replace("{a}", latest.version).replace("{b}", VERSION)}</span>
      <button type="button" className="btn small" onClick={() => void openUrl(latest.url).catch(() => {})}>
        {t.open}
      </button>
      <button type="button" className="btn small ghost" onClick={dismiss}>
        {t.later}
      </button>
      <button type="button" className="btn small ghost" onClick={() => setHidden(true)} aria-label={t.close} title={t.close}>
        ✕
      </button>
    </div>,
    document.body,
  );
}
