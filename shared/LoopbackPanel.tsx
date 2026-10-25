// 연결 시험(루프백·2선 RS-485 에코) — Port Inspector 와 Serial «연결 점검…» 이 함께 쓴다.
// 시작 전에 «선에서 장비를 떼었나» 를 한 번 더 묻는다(시험 바이트가 장비에 명령으로 들어갈 수 있다).
import { useEffect, useRef, useState } from "react";
import { busyHint, echoVerdict, LEVEL_TEXT, LOOP_BAUDS, loopVerdict, type BaudResult, type EchoResult, type Lang, type LoopConfig, type LoopEvent, type LoopMode } from "./portinfo";
import "./portcheck.css";

const MORE_BAUDS = [1200, 2400, 4800, 230400, 460800, 921600];

export interface LoopApi {
  start: (config: LoopConfig, onEvent: (e: LoopEvent) => void) => Promise<void>;
  cancel: () => Promise<void>;
}

export interface LoopState {
  results: BaudResult[];
  echo: EchoResult | null;
  error: string | null;
}

const T = {
  ko: {
    mode: "시험 방식",
    loop: "루프백 — TX·RX 를 이어 둠",
    loopHint: "DB9 는 2번(RX)–3번(TX), TTL 변환기는 TX–RX 를 잇습니다. 속도마다 바이트가 그대로 돌아오는지와 1바이트 왕복 시간을 잽니다.",
    echo: "2선 RS-485 에코",
    echoHint: "버스에서 장비를 뗀 채로, 변환기가 보낸 바이트를 스스로 되받는지 봅니다.",
    bauds: "속도",
    more: "속도 더 보기",
    start: "시험 시작",
    cancel: "멈춤",
    sure: "선·버스에서 장비를 떼었나요? 시험 바이트가 장비에 명령으로 들어갈 수 있습니다.",
    sureYes: "뗐습니다 — 시작",
    sureNo: "취소",
    running: "시험 중",
    noPort: "포트를 먼저 고르세요.",
    colBaud: "속도",
    colResult: "결과",
    colBytes: "보냄 · 같음 · 잃음 · 바뀜",
    colRtt: "1바이트 왕복 ms (중앙 · 최대)",
    colFlags: "오류 표시",
    flagsNone: "없음",
    flagsUnread: "읽지 못함",
    flagsNote: "오류 표시는 드라이버가 올려 줄 때만 보입니다 — «없음» 이 오류가 없었다는 보증은 아닙니다. 왕복 시간은 USB 지연·드라이버·프로그램 시간을 모두 더한 값입니다.",
    echoBack: "돌아온 바이트",
    firstMs: "첫 바이트까지",
  },
  en: {
    mode: "Test",
    loop: "Loopback — TX tied to RX",
    loopHint: "On a DB9 tie pin 2 (RX) to pin 3 (TX); on a TTL adapter tie TX to RX. Checks that bytes come back unchanged at each speed and measures the 1-byte round trip.",
    echo: "2-wire RS-485 echo",
    echoHint: "With no device on the bus, checks whether the adapter receives the bytes it sends.",
    bauds: "Speeds",
    more: "More speeds",
    start: "Start test",
    cancel: "Stop",
    sure: "Is the device disconnected from the line/bus? Test bytes could reach a device as commands.",
    sureYes: "Disconnected — start",
    sureNo: "Cancel",
    running: "Testing",
    noPort: "Pick a port first.",
    colBaud: "Speed",
    colResult: "Result",
    colBytes: "Sent · same · lost · changed",
    colRtt: "1-byte round trip ms (median · max)",
    colFlags: "Error flags",
    flagsNone: "none",
    flagsUnread: "not read",
    flagsNote: "Error flags show only when the driver raises them — «none» does not guarantee there were no errors. Round-trip time includes USB latency, driver and program time.",
    echoBack: "Bytes back",
    firstMs: "First byte after",
  },
};

function flagText(lang: Lang, r: { flags: BaudResult["flags"] }) {
  const f = r.flags;
  if (!f.read) return T[lang].flagsUnread;
  const on = [f.frame && (lang === "ko" ? "프레임" : "framing"), f.parity && (lang === "ko" ? "패리티" : "parity"), f.overrun && (lang === "ko" ? "넘침" : "overrun"), f.rxOver && (lang === "ko" ? "버퍼 넘침" : "buffer overflow"), f.break && "break"].filter(Boolean);
  return on.length ? on.join(", ") : T[lang].flagsNone;
}

export function LoopbackPanel({
  lang,
  port,
  api,
  service,
  disabledReason,
  onState,
  onRunning,
}: {
  lang: Lang;
  port: string | null;
  api: LoopApi;
  /** 드라이버 서비스 이름 — «사용 중» 안내에 */
  service?: string | null;
  /** 시험할 수 없는 까닭(포트를 다른 곳에서 쓰는 중 등) */
  disabledReason?: string | null;
  onState?: (s: LoopState) => void;
  onRunning?: (running: boolean) => void;
}) {
  const x = T[lang];
  const [mode, setMode] = useState<LoopMode>("loopback");
  const [bauds, setBauds] = useState<number[]>(LOOP_BAUDS);
  const [echoBaud, setEchoBaud] = useState(9600);
  const [showMore, setShowMore] = useState(false);
  const [asking, setAsking] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ baud: number; pct: number } | null>(null);
  const [state, setState] = useState<LoopState>({ results: [], echo: null, error: null });
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => onState?.(state), [state, onState]);
  useEffect(() => onRunning?.(running), [running, onRunning]);
  // 포트를 바꾸면 결과를 지운다
  useEffect(() => {
    setState({ results: [], echo: null, error: null });
    setBusy(false);
    setAsking(false);
  }, [port]);

  const list = [...LOOP_BAUDS, ...MORE_BAUDS].sort((a, b) => a - b);
  const shown = showMore ? list : LOOP_BAUDS;
  const toggle = (b: number) => setBauds((old) => (old.includes(b) ? old.filter((v) => v !== b) : [...old, b].sort((p, q) => p - q)));
  const canStart = !!port && !running && !disabledReason && (mode === "echo" || bauds.length > 0);

  async function go() {
    if (!port) return;
    setAsking(false);
    setRunning(true);
    setBusy(false);
    setProgress(null);
    setState({ results: [], echo: null, error: null });
    const onEvent = (e: LoopEvent) => {
      if (e.type === "progress") setProgress({ baud: e.baud, pct: e.total ? Math.round((e.done / e.total) * 100) : 0 });
      else if (e.type === "baud") setState((s) => ({ ...s, results: [...s.results, e.result] }));
      else if (e.type === "echo") setState((s) => ({ ...s, echo: e.result }));
      else if (e.type === "error") {
        setBusy(e.busy);
        setState((s) => ({ ...s, error: e.message }));
      } else if (e.type === "done") {
        setRunning(false);
        setProgress(null);
      }
    };
    try {
      await api.start({ port, mode, bauds: mode === "echo" ? [echoBaud] : bauds }, onEvent);
    } catch (e) {
      setState((s) => ({ ...s, error: String(e) }));
      setRunning(false);
    }
  }

  return (
    <div className="loop-panel">
      <div className="loop-modes" role="radiogroup" aria-label={x.mode}>
        <label className="inline">
          <input type="radio" name="loop-mode" checked={mode === "loopback"} disabled={running} onChange={() => setMode("loopback")} /> {x.loop}
        </label>
        <label className="inline">
          <input type="radio" name="loop-mode" checked={mode === "echo"} disabled={running} onChange={() => setMode("echo")} /> {x.echo}
        </label>
      </div>
      <div className="hint">{mode === "loopback" ? x.loopHint : x.echoHint}</div>
      {mode === "loopback" ? (
        <div className="loop-bauds" role="group" aria-label={x.bauds}>
          {shown.map((b) => (
            <label key={b} className="inline chip-check">
              <input type="checkbox" checked={bauds.includes(b)} disabled={running} onChange={() => toggle(b)} /> {b}
            </label>
          ))}
          <button type="button" className="link-btn" onClick={() => setShowMore(!showMore)} disabled={running}>
            {showMore ? "−" : x.more}
          </button>
        </div>
      ) : (
        <label className="inline">
          {x.bauds}
          <select value={echoBaud} disabled={running} onChange={(e) => setEchoBaud(Number(e.target.value))} aria-label={x.bauds}>
            {list.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="loop-actions">
        {running ? (
          <button type="button" className="btn danger small" onClick={() => void api.cancel()}>
            {x.cancel}
          </button>
        ) : (
          <button type="button" className="btn primary small" disabled={!canStart} onClick={() => setAsking(true)}>
            {x.start}
          </button>
        )}
        {running && (
          <span className="hint">
            {x.running}
            {progress ? ` — ${progress.baud} bps ${progress.pct}%` : "…"}
          </span>
        )}
        {!port && <span className="hint">{x.noPort}</span>}
        {disabledReason && <span className="hint warn">{disabledReason}</span>}
      </div>
      {asking && (
        <div className="notice warn loop-sure" role="alertdialog" aria-label={x.sure}>
          <span>{x.sure}</span>
          <span className="row-btns">
            <button type="button" className="btn small primary" autoFocus onClick={() => void go()}>
              {x.sureYes}
            </button>
            <button type="button" className="btn small" onClick={() => setAsking(false)}>
              {x.sureNo}
            </button>
          </span>
        </div>
      )}
      {state.error && (
        <div className="error loop-error">
          {state.error}
          {busy && <div className="hint">{busyHint(lang, service ?? null)}</div>}
        </div>
      )}
      {state.results.length > 0 && (
        <table className="grid loop-table">
          <thead>
            <tr>
              <th>{x.colBaud}</th>
              <th>{x.colResult}</th>
              <th>{x.colBytes}</th>
              <th>{x.colRtt}</th>
              <th>{x.colFlags}</th>
            </tr>
          </thead>
          <tbody>
            {state.results.map((r) => {
              const v = loopVerdict(r);
              return (
                <tr key={r.baud}>
                  <td className="mono">{r.baud}</td>
                  <td>
                    <span className={`lv lv-${v.level}`}>{LEVEL_TEXT[v.level][lang]}</span>
                    {v.notes.map((n, i) => (
                      <div key={i} className="hint">
                        {n[lang]}
                      </div>
                    ))}
                  </td>
                  <td className="mono">
                    {r.sent} · {r.same} · {r.lost} · {r.changed}
                    {r.extra ? ` (+${r.extra})` : ""}
                  </td>
                  <td className="mono">{r.rtt ? `${r.rtt.median.toFixed(1)} · ${r.rtt.max.toFixed(1)}${r.rtt.lost ? ` (−${r.rtt.lost})` : ""}` : "—"}</td>
                  <td>{flagText(lang, r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {state.echo &&
        (() => {
          const v = echoVerdict(state.echo);
          return (
            <div className="loop-echo">
              <span className={`lv lv-${v.level}`}>{LEVEL_TEXT[v.level][lang]}</span> {v.notes.map((n) => n[lang]).join(" ")}
              <div className="hint mono">
                {state.echo.baud} bps · {x.echoBack} {state.echo.received}/{state.echo.sent}
                {state.echo.firstMs != null ? ` · ${x.firstMs} ${state.echo.firstMs.toFixed(1)} ms` : ""} · {x.colFlags}: {flagText(lang, state.echo)}
              </div>
            </div>
          );
        })()}
      {(state.results.length > 0 || state.echo) && <div className="hint">{x.flagsNote}</div>}
    </div>
  );
}
