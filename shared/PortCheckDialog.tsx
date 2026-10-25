// Serial «연결 점검…» — 지금 고른 포트의 장치·드라이버·문제 코드·지연 타이머·절전 요약과 연결 시험(루프백·에코).
// Port Inspector 와 같은 코어(crates/core portinfo·loopback)와 같은 판정(shared/portinfo.ts)을 쓴다. 읽기만 한다.
import { useEffect, useState, type ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useRestoreFocus } from "./restoreFocus";
import { LoopbackPanel, type LoopApi, type LoopState } from "./LoopbackPanel";
import {
  bundleText,
  CANNOT_SEE,
  deviceVerdict,
  fmtTime,
  GUIDES,
  guideUrl,
  hex4,
  LEVEL_TEXT,
  powerVerdict,
  settingsVerdict,
  type Lang,
  type PortReport,
  type Verdict,
} from "./portinfo";
import "./portcheck.css";

const T = {
  ko: {
    title: "연결 점검",
    close: "닫기 (Esc)",
    reading: "읽는 중…",
    readFail: "읽지 못함",
    device: "장치·드라이버",
    settings: "설정",
    power: "절전",
    test: "연결 시험",
    cannot: "PC 가 볼 수 없는 것",
    guides: "가이드:",
    name: "이름",
    chip: "VID:PID · 칩",
    driver: "드라이버",
    problem: "문제 코드",
    action: "해 볼 것",
    latency: "FTDI 지연 타이머",
    suspend: "USB 선택적 절전",
    canOff: "PC 가 끌 수 있음",
    on: "켜짐",
    off: "꺼짐",
    connected: "연결을 끊은 뒤에 시험할 수 있습니다(시험은 포트를 따로 엽니다).",
    copy: "텍스트 복사",
    copied: "복사했습니다",
    more: "드라이버 기록·COM 번호 예약·숨은 장치까지 보려면 PortDock Port Inspector 를 씁니다.",
    readOnly: "관리자 권한 없이 읽기만 합니다.",
  },
  en: {
    title: "Check connection",
    close: "Close (Esc)",
    reading: "Reading…",
    readFail: "Could not read",
    device: "Device and driver",
    settings: "Settings",
    power: "Power saving",
    test: "Connection test",
    cannot: "What the PC cannot see",
    guides: "Guides:",
    name: "Name",
    chip: "VID:PID · chip",
    driver: "Driver",
    problem: "Problem code",
    action: "What to try",
    latency: "FTDI latency timer",
    suspend: "USB selective suspend",
    canOff: "PC may turn it off",
    on: "on",
    off: "off",
    connected: "Disconnect first to run the test (it opens the port itself).",
    copy: "Copy text",
    copied: "Copied",
    more: "For driver history, COM number reservations and hidden devices, use PortDock Port Inspector.",
    readOnly: "Read-only, without administrator rights.",
  },
};

export interface PortCheckApi extends LoopApi {
  report: (id: string) => Promise<PortReport>;
}

function Head({ title, v, lang }: { title: string; v?: Verdict; lang: Lang }) {
  return (
    <h4>
      {title}
      {v && <span className={`lv lv-${v.level}`}>{LEVEL_TEXT[v.level][lang]}</span>}
    </h4>
  );
}

function Notes({ v, lang }: { v: Verdict; lang: Lang }) {
  return v.notes.length ? (
    <ul className="card-notes">
      {v.notes.map((n, i) => (
        <li key={i}>{n[lang]}</li>
      ))}
    </ul>
  ) : null;
}

function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PortCheckDialog({ lang, app, port, connected, api, onClose }: { lang: Lang; app: string; port: string; connected: boolean; api: PortCheckApi; onClose: () => void }) {
  const x = T[lang];
  const back = useRestoreFocus<HTMLDivElement>();
  const [report, setReport] = useState<PortReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loop, setLoop] = useState<LoopState>({ results: [], echo: null, error: null });
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let stale = false;
    setReport(null);
    setErr(null);
    api
      .report(port)
      .then((r) => !stale && setReport(r))
      .catch((e) => !stale && setErr(String(e)));
    return () => {
      stale = true;
    };
  }, [api, port]);
  const close = () => {
    if (running) void api.cancel();
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  const copy = () =>
    navigator.clipboard
      .writeText(bundleText(lang, { app, version: "0.1.0", report, com: null, events: null, nics: null, loop: loop.results, echo: loop.echo, loopError: loop.error }))
      .then(() => setNote(x.copied))
      .catch((e) => setNote(String(e)));
  const r = report;
  const lat = r?.params.find((p) => p.name === "LatencyTimer");
  return (
    <div className="modal-back" ref={back} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal portcheck-dialog" role="dialog" aria-label={`${x.title} — ${port}`}>
        <div className="modal-head">
          <b>
            {x.title} — {port}
          </b>
          <button type="button" className="btn small ghost" onClick={close} title={x.close} aria-label={x.close} autoFocus>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="hint">{x.readOnly}</div>
          {err && (
            <div className="error">
              {x.readFail}: {err}
            </div>
          )}
          {!r && !err && <div className="hint">{x.reading}</div>}
          {r && (
            <>
              <div className="pc-section">
                <Head title={x.device} v={deviceVerdict(r)} lang={lang} />
                <Notes v={deviceVerdict(r)} lang={lang} />
                <KV
                  rows={[
                    [x.name, r.entry.name],
                    [x.chip, r.entry.vid != null ? `${hex4(r.entry.vid)}:${hex4(r.entry.pid)}${r.chip ? ` · ${r.chip.vendor}${r.chip.chip ? ` ${r.chip.chip}` : ""}` : ""}` : null],
                    [x.driver, [r.driver.provider, r.driver.version, r.driver.date ? `(${fmtTime(r.driver.date, false)})` : null, r.driver.service].filter(Boolean).join(" ") || null],
                    ...(r.status.problem
                      ? ([
                          [x.problem, `${r.status.problem.code} — ${r.status.problem.meaning[lang]}`],
                          [x.action, r.status.problem.action[lang]],
                        ] as [string, ReactNode][])
                      : []),
                  ]}
                />
              </div>
              <div className="pc-section">
                <Head title={x.settings} v={settingsVerdict(r)} lang={lang} />
                <Notes v={settingsVerdict(r)} lang={lang} />
                {lat && <KV rows={[[x.latency, `${lat.value} ms`]]} />}
              </div>
              <div className="pc-section">
                <Head title={x.power} v={powerVerdict(r)} lang={lang} />
                <Notes v={powerVerdict(r)} lang={lang} />
                <KV
                  rows={[
                    [x.suspend, r.power.usbSuspendAc == null ? null : r.power.usbSuspendAc ? x.on : x.off],
                    ...r.power.devices.map((d) => [`${x.canOff} — ${d.name}`, d.canTurnOff ? x.on : x.off] as [string, ReactNode]),
                  ]}
                />
              </div>
            </>
          )}
          <div className="pc-section">
            <Head title={x.test} lang={lang} />
            <LoopbackPanel lang={lang} port={port} api={api} service={r?.driver.service ?? null} disabledReason={connected ? x.connected : null} onState={setLoop} onRunning={setRunning} />
          </div>
          <div className="cannot-see">
            <b>{x.cannot}</b>
            <ul>
              {CANNOT_SEE.map((c) => (
                <li key={c.en}>{c[lang]}</li>
              ))}
            </ul>
            <div className="guide-links">
              <span className="hint">{x.guides}</span>
              {GUIDES.map((g) => (
                <a
                  key={g.slug}
                  href={guideUrl(lang, g.slug)}
                  onClick={(e) => {
                    e.preventDefault();
                    void openUrl(guideUrl(lang, g.slug)).catch(() => {});
                  }}
                >
                  {g.title[lang]}
                </a>
              ))}
            </div>
          </div>
          <div className="hint">{x.more}</div>
          <div className="row-btns">
            <button type="button" className="btn small" onClick={() => void copy()} disabled={!r && !loop.results.length}>
              {x.copy}
            </button>
            {note && <span className="hint">{note}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
