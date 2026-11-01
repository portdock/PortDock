// 연결 시험(루프백·두 포트·2선 RS-485 에코) — Port Inspector 와 Serial «연결 점검…» 이 함께 쓴다.
// 시작 전에 «선에서 장비를 떼었나» 를 한 번 더 묻는다(시험 바이트가 장비에 명령으로 들어갈 수 있다).
// 0.10.0: 두 포트 시험(변환기 두 개를 서로 이음), 무늬(0x00~0xFF·0x55/0xAA)·길이 고르기, 잇는 법 그림, 전체 판정.
import { dicts } from "./lang.ts";
import { txt } from "./textLang.ts";
import { useEffect, useRef, useState } from "react";
import {
  busyHint,
  echoVerdict,
  LEVEL_TEXT,
  LOOP_BAUDS,
  LOOP_OVERALL_TEXT,
  loopOverall,
  loopVerdict,
  type BaudResult,
  type EchoResult,
  type Lang,
  type LoopConfig,
  type LoopEvent,
  type LoopPattern,
} from "./portinfo";
import "./portcheck.css";
import { JA_LOOP, JA_WIRING } from "./ja/dialogs.ts";
import { PT_LOOP, PT_WIRING } from "./pt/dialogs.ts";
import { FR_LOOP, FR_WIRING } from "./fr/dialogs.ts";
import { IT_LOOP, IT_WIRING } from "./it/dialogs.ts";

const MORE_BAUDS = [1200, 2400, 4800, 230400, 460800, 921600];
const LENGTHS = [64, 256, 1024, 4096];

export interface LoopApi {
  start: (config: LoopConfig, onEvent: (e: LoopEvent) => void) => Promise<void>;
  cancel: () => Promise<void>;
  /** 두 포트 시험(0.10.0)에 고를 다른 포트 이름들 — 없으면 두 포트 시험을 숨긴다 */
  ports?: () => Promise<string[]>;
}

/** 화면의 시험 방식 — two 는 코어에 loopback + peer 로 보낸다 */
type UiMode = "loopback" | "two" | "echo";

/** 잇는 법 그림(글자로) */
const WIRING: Record<UiMode, { ko: string; en: string }> = {
  loopback: {
    ko: ["RS-232 (DB9 암·수 어느 쪽이든)", "  2번(RX) ──┐", "  3번(TX) ──┘   2번과 3번 핀을 잇는다", "", "TTL 변환기", "  TX ──┐", "  RX ──┘   TX 와 RX 를 잇는다", "", "RS-485 는 한 포트로 할 수 없습니다 — «두 포트» 를 고르세요."].join("\n"),
    en: ["RS-232 (DB9, either gender)", "  pin 2 (RX) ──┐", "  pin 3 (TX) ──┘   tie pin 2 to pin 3", "", "TTL adapter", "  TX ──┐", "  RX ──┘   tie TX to RX", "", "RS-485 cannot loop on one port — choose «Two ports»."].join("\n"),
  },
  two: {
    ko: ["RS-232 (널 모뎀으로 엇갈려)", "  포트 A        포트 B", "  2번 RX ────── 3번 TX", "  3번 TX ────── 2번 RX", "  5번 GND ───── 5번 GND", "", "RS-485 (2선)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
    en: ["RS-232 (crossed, null modem)", "  port A        port B", "  pin 2 RX ──── pin 3 TX", "  pin 3 TX ──── pin 2 RX", "  pin 5 GND ─── pin 5 GND", "", "RS-485 (2-wire)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  },
  echo: {
    ko: ["RS-485 변환기 하나 — 버스에서 장비를 뗀 채로", "  A(D+)  B(D−)  아무것도 잇지 않음"].join("\n"),
    en: ["One RS-485 adapter — with the device removed from the bus", "  A(D+)  B(D−)  nothing connected"].join("\n"),
  },
};

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
    two: "두 포트 — 변환기 두 개를 서로 이음",
    twoHint: "변환기·케이블 두 개를 서로 이어 두고, 속도마다 이 포트 → 다른 포트, 다른 포트 → 이 포트로 보내 받은 것과 비교합니다. RS-485 변환기 점검에 씁니다.",
    peer: "다른 포트",
    peerNone: "다른 포트가 없습니다",
    pattern: "무늬",
    patRandom: "섞인 바이트",
    patRamp: "0x00~0xFF 차례로",
    patAlt: "0x55·0xAA 번갈아",
    length: "길이(바이트)",
    wiring: "잇는 법",
    overall: "전체",
    colDir: "방향",
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
    flagFrame: "프레임",
    flagParity: "패리티",
    flagOverrun: "넘침",
    flagRxOver: "버퍼 넘침",
    flagsNote: "오류 표시는 드라이버가 올려 줄 때만 보입니다 — «없음» 이 오류가 없었다는 보증은 아닙니다. 왕복 시간은 USB 지연·드라이버·프로그램 시간을 모두 더한 값입니다.",
    echoBack: "돌아온 바이트",
    firstMs: "첫 바이트까지",
  },
  en: {
    mode: "Test",
    loop: "Loopback — TX tied to RX",
    loopHint: "On a DB9 tie pin 2 (RX) to pin 3 (TX); on a TTL adapter tie TX to RX. Checks that bytes come back unchanged at each speed and measures the 1-byte round trip.",
    two: "Two ports — two adapters wired to each other",
    twoHint: "With two adapters/cables wired to each other, sends this port → the other and the other → this port at each speed and compares what arrives. Useful for checking RS-485 adapters.",
    peer: "Other port",
    peerNone: "No other port",
    pattern: "Pattern",
    patRandom: "Mixed bytes",
    patRamp: "0x00–0xFF in order",
    patAlt: "0x55/0xAA alternating",
    length: "Length (bytes)",
    wiring: "How to wire",
    overall: "Overall",
    colDir: "Direction",
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
    flagFrame: "framing",
    flagParity: "parity",
    flagOverrun: "overrun",
    flagRxOver: "buffer overflow",
    flagsNote: "Error flags show only when the driver raises them — «none» does not guarantee there were no errors. Round-trip time includes USB latency, driver and program time.",
    echoBack: "Bytes back",
    firstMs: "First byte after",
  },
};

export type LoopTextKey = keyof typeof T.ko;
const TL = dicts(T.ko, T.en, { ja: JA_LOOP, pt: PT_LOOP, fr: FR_LOOP, it: IT_LOOP });
const wiringOf = (k: "ko" | "en") => ({ loopback: WIRING.loopback[k], two: WIRING.two[k], echo: WIRING.echo[k] });
const WIRING_T = dicts(wiringOf("ko"), wiringOf("en"), { ja: JA_WIRING, pt: PT_WIRING, fr: FR_WIRING, it: IT_WIRING });

function flagText(lang: Lang, r: { flags: BaudResult["flags"] }) {
  const f = r.flags;
  const x = TL[lang];
  if (!f.read) return x.flagsUnread;
  const on = [f.frame && x.flagFrame, f.parity && x.flagParity, f.overrun && x.flagOverrun, f.rxOver && x.flagRxOver, f.break && "break"].filter(Boolean);
  return on.length ? on.join(", ") : x.flagsNone;
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
  const x = TL[lang];
  const [mode, setMode] = useState<UiMode>("loopback");
  const [pattern, setPattern] = useState<LoopPattern>("random");
  const [bytes, setBytes] = useState(256);
  const [peers, setPeers] = useState<string[] | null>(null);
  const [peer, setPeer] = useState("");
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
  // 지금 시험의 번호 — 포트를 바꾸거나 닫은 뒤 늦게 온 앞 시험의 사건은 버린다
  const runRef = useRef(0);
  const runningRef = useRef(running);
  runningRef.current = running;
  const apiRef = useRef(api);
  apiRef.current = api;
  const onRunningRef = useRef(onRunning);
  onRunningRef.current = onRunning;
  useEffect(() => onState?.(state), [state, onState]);
  useEffect(() => onRunning?.(running), [running, onRunning]);
  // 포트를 바꾸면 결과를 지우고, 돌던 시험은 멈춘다(앞 포트 결과가 새 포트 표에 들어오지 않게)
  useEffect(() => {
    setState({ results: [], echo: null, error: null });
    setBusy(false);
    setAsking(false);
    if (runningRef.current) {
      runRef.current++;
      void apiRef.current.cancel().catch(() => {});
      setRunning(false);
      setProgress(null);
    }
  }, [port]);
  // 패널이 사라지면(다른 포트를 골라 카드가 바뀜·대화상자 닫힘) 돌던 시험을 멈추고 «시험 중» 을 푼다
  useEffect(
    () => () => {
      if (!runningRef.current) return;
      runRef.current++;
      void apiRef.current.cancel().catch(() => {});
      onRunningRef.current?.(false);
    },
    [],
  );

  // 두 포트 시험을 고르면 다른 포트 목록을 읽는다
  useEffect(() => {
    if (mode !== "two" || !api.ports) return;
    let live = true;
    api
      .ports()
      .then((l) => {
        if (!live) return;
        const others = l.filter((p) => p.toUpperCase() !== (port ?? "").toUpperCase());
        setPeers(others);
        setPeer((cur) => (others.includes(cur) ? cur : (others[0] ?? "")));
      })
      .catch(() => live && setPeers([]));
    return () => {
      live = false;
    };
  }, [mode, port, api]);

  const list = [...LOOP_BAUDS, ...MORE_BAUDS].sort((a, b) => a - b);
  const shown = showMore ? list : LOOP_BAUDS;
  const toggle = (b: number) => setBauds((old) => (old.includes(b) ? old.filter((v) => v !== b) : [...old, b].sort((p, q) => p - q)));
  const canStart = !!port && !running && !disabledReason && (mode === "echo" || bauds.length > 0) && (mode !== "two" || !!peer);
  const overall = loopOverall(state.results);
  const hasDir = state.results.some((r) => r.dir);

  async function go() {
    if (!port) return;
    setAsking(false);
    setRunning(true);
    setBusy(false);
    setProgress(null);
    setState({ results: [], echo: null, error: null });
    const id = ++runRef.current;
    const onEvent = (e: LoopEvent) => {
      if (id !== runRef.current) return;
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
      const cfg: LoopConfig =
        mode === "echo"
          ? { port, mode: "echo", bauds: [echoBaud] }
          : { port, mode: "loopback", bauds, bytes, pattern, peer: mode === "two" ? peer : null };
      await api.start(cfg, onEvent);
    } catch (e) {
      if (id !== runRef.current) return;
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
        {api.ports && (
          <label className="inline">
            <input type="radio" name="loop-mode" checked={mode === "two"} disabled={running} onChange={() => setMode("two")} /> {x.two}
          </label>
        )}
      </div>
      <div className="hint">{mode === "loopback" ? x.loopHint : mode === "two" ? x.twoHint : x.echoHint}</div>
      <details className="loop-wiring">
        <summary>{x.wiring}</summary>
        <pre className="mono">{WIRING_T[lang][mode]}</pre>
      </details>
      {mode === "two" && (
        <label className="inline loop-peer">
          {x.peer}
          {peers && peers.length === 0 ? (
            <span className="hint warn">{x.peerNone}</span>
          ) : (
            <select value={peer} disabled={running || !peers} onChange={(e) => setPeer(e.target.value)} aria-label={x.peer}>
              {(peers ?? []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </label>
      )}
      {mode !== "echo" ? (
        <>
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
          <div className="loop-opts">
            <label className="inline">
              {x.pattern}
              <select value={pattern} disabled={running} onChange={(e) => setPattern(e.target.value as LoopPattern)} aria-label={x.pattern}>
                <option value="random">{x.patRandom}</option>
                <option value="ramp">{x.patRamp}</option>
                <option value="alt">{x.patAlt}</option>
              </select>
            </label>
            <label className="inline">
              {x.length}
              <select value={bytes} disabled={running} onChange={(e) => setBytes(Number(e.target.value))} aria-label={x.length}>
                {LENGTHS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
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
      {overall && !running && (
        <div className="loop-overall">
          {x.overall}: <span className={`lv lv-${overall}`}>{txt(LOOP_OVERALL_TEXT[overall], lang)}</span>
        </div>
      )}
      {state.results.length > 0 && (
        <table className="grid loop-table">
          <thead>
            <tr>
              <th>{x.colBaud}</th>
              {hasDir && <th>{x.colDir}</th>}
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
                <tr key={`${r.baud}${r.dir ?? ""}`}>
                  <td className="mono">{r.baud}</td>
                  {hasDir && <td className="mono">{r.dir ?? ""}</td>}
                  <td>
                    <span className={`lv lv-${v.level}`}>{txt(LEVEL_TEXT[v.level], lang)}</span>
                    {v.notes.map((n, i) => (
                      <div key={i} className="hint">
                        {txt(n, lang)}
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
              <span className={`lv lv-${v.level}`}>{txt(LEVEL_TEXT[v.level], lang)}</span> {v.notes.map((n) => txt(n, lang)).join(" ")}
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
