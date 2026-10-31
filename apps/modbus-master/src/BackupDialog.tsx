// 장비 설정 백업·비교·복원 창(0.10.0) — 장비 교체·유지보수용.
// 백업: 범위 목록(여러 줄, 장비 프로필로 채우기)을 한 번에 읽어 JSON·CSV 로. 125개(비트 2000개)를 넘으면 나눠 읽고 실패한 범위는 따로 보인다.
// 비교: 백업 ↔ 지금 장비(다시 읽기) 또는 다른 백업 파일. 복원: 고른 칸만(기본 없음) 미리보기 → 두 번 눌러 쓰기 → 다시 읽어 맞는지 확인.
// 계산은 backup.ts(시험 있음), 읽기·쓰기는 App 이 넘겨준 함수로(일꾼 하나 — 폴링과 같은 줄에 차례로 들어간다).
import { useEffect, useMemo, useRef, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { DEVICES } from "@shared/deviceData";
import { deviceName } from "@shared/devices";
import { count } from "@shared/usage";
import { outcomeText, type Outcome } from "./api";
import {
  backupCsv,
  backupFileName,
  backupJson,
  backupSummary,
  compareBlocks,
  diffText,
  makeBackup,
  parseBackup,
  planReads,
  rangeProblem,
  rangesFromDevice,
  readBackRanges,
  restoreRows,
  verifyRows,
  writePlan,
  RANGE_MAX,
  type Backup,
  type BackupBlock,
  type BackupComm,
  type BackupRange,
  type BlockReason,
  type DiffRow,
  type RestoreRow,
  type VerifyState,
} from "./backup";
import { addrLabel, fcHex, FCS, maxQty, minUnit, parseAddr, stamp, type AddrMode, type Fc, type Format, type Point } from "./model";
import { dict, fill, type Key, type Lang } from "./i18n";

type Tab = "backup" | "compare" | "restore";
interface RangeRow {
  id: number;
  fc: Fc;
  startText: string;
  qty: number;
  name?: string;
  points?: Point[];
}

const WHY_KEY: Record<BlockReason, Key> = { input: "bkWhyInput", "profile-ro": "bkWhyRo", "too-long": "bkWhyLong", "no-value": "bkWhyNoValue" };
const STATE_KEY: Record<VerifyState, Key> = { match: "bkStMatch", differ: "bkStDiffer", unread: "bkStUnread", "write-failed": "bkStWriteFailed" };

export interface BackupDialogProps {
  lang: Lang;
  connected: boolean;
  wire: "tcp" | "rtu";
  addrMode: AddrMode;
  /** 처음 채울 값 — 지금 표의 국번·함수·시작·개수·표시 형식 */
  defaults: { unit: number; fc: Fc; start: number; qty: number; format: Format; name: string; points: Point[] };
  comm: BackupComm;
  app: string;
  forceMulti: boolean;
  readBlock: (unit: number, fc: Fc, start: number, qty: number) => Promise<Outcome>;
  writeCells: (unit: number, bits: boolean, start: number, values: number[], multi: boolean) => Promise<Outcome>;
  saveText: (defaultName: string, text: string, kind: "json" | "csv") => Promise<string | null>;
  openText: () => Promise<{ text: string; name: string } | null>;
  onClose: () => void;
}

export function BackupDialog(p: BackupDialogProps) {
  const { lang, addrMode } = p;
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [tab, setTab] = useState<Tab>("backup");
  const [unit, setUnit] = useState(p.defaults.unit);
  const [note, setNote] = useState("");
  const [devId, setDevId] = useState("");
  const dev = DEVICES.find((d) => d.id === devId);
  const seq = useRef(1);
  const [ranges, setRanges] = useState<RangeRow[]>(() => [
    { id: seq.current++, fc: p.defaults.fc, startText: addrLabel(p.defaults.fc, p.defaults.start, addrMode), qty: p.defaults.qty, name: p.defaults.name || undefined, points: p.defaults.points.length ? p.defaults.points : undefined },
  ]);
  const [format, setFormat] = useState<Format>(p.defaults.format);
  const [busy, setBusy] = useState<{ done: number; total: number; what: Key } | null>(null);
  const stop = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // 지금 다루는 백업(방금 읽었거나 파일에서 연 것)
  const [base, setBase] = useState<{ backup: Backup; name: string } | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      stop.current = true;
    },
    [],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && p.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, p]);
  const label = (fc: Fc, a: number) => addrLabel(fc, a, addrMode);
  const exText = (o: Outcome) => outcomeText(o, lang);

  /** 덩어리들을 차례로 읽는다 — 멈추면 남은 것은 «멈춤» 으로 */
  async function readAll(list: BackupRange[], what: Key): Promise<BackupBlock[]> {
    stop.current = false;
    setBusy({ done: 0, total: list.length, what });
    const out: BackupBlock[] = [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const head = { fc: r.fc, start: r.start, qty: r.qty, ...(r.name ? { name: r.name } : {}), ...(r.points ? { points: r.points } : {}) };
      if (stop.current || !alive.current) {
        out.push({ ...head, values: null, error: t("bkStopped") });
        continue;
      }
      const o = await p.readBlock(unit, r.fc, r.start, r.qty);
      out.push(o.result === "ok" && o.values.length >= r.qty ? { ...head, values: o.values.slice(0, r.qty) } : { ...head, values: null, error: exText(o) });
      if (alive.current) setBusy({ done: i + 1, total: list.length, what });
    }
    if (alive.current) setBusy(null);
    return out;
  }

  // ---------------------------------------------------------------- 백업
  function parsedRanges(): BackupRange[] | string {
    const out: BackupRange[] = [];
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const a = parseAddr(r.startText, addrMode, r.fc);
      const bad = !a ? fill(t("startBad"), { a: r.startText }) : rangeProblem({ start: a.start, qty: r.qty }, lang);
      if (bad) return fill(t("bkBadRange"), { n: i + 1, a: bad });
      out.push({ fc: a!.fc, start: a!.start, qty: r.qty, ...(r.name ? { name: r.name } : {}), ...(r.points ? { points: r.points } : {}) });
    }
    return out.length ? out : t("bkNoRange");
  }
  const plan = useMemo(() => {
    const r = parsedRanges();
    return typeof r === "string" ? r : planReads(r, dev?.comm.maxRegisters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranges, addrMode, dev, lang]);

  async function runBackup() {
    setErr(null);
    setMsg(null);
    if (!p.connected) return setErr(t("needConnect"));
    if (typeof plan === "string") return setErr(plan);
    if (unit < minUnit(p.wire)) return setErr(t("bkUnitBad"));
    count("device_backup");
    const readAt = stamp(Date.now()).slice(0, 19);
    const blocks = await readAll(plan, "bkReading");
    if (!alive.current) return;
    const b = makeBackup({ app: p.app, readAt, note: note.trim(), unit, comm: p.comm, ...(dev ? { device: { id: dev.id, name: deviceName(dev, "en") } } : {}) }, blocks);
    setBase({ backup: b, name: "" });
  }
  function fillFromDevice() {
    if (!dev) return;
    const list = rangesFromDevice(dev, lang);
    setRanges(list.map((r) => ({ id: seq.current++, fc: r.fc, startText: label(r.fc, r.start), qty: r.qty, name: r.name, points: r.points })));
    setMsg(fill(t("bkFilled"), { a: deviceName(dev, lang), n: list.length }));
    setErr(null);
  }
  async function save(kind: "json" | "csv") {
    if (!base) return;
    const b = base.backup;
    try {
      const path = await p.saveText(backupFileName(b.unit, b.readAt, kind), kind === "json" ? backupJson(b) : backupCsv(b, lang), kind);
      if (path) setMsg(fill(t("bkSaved"), { a: path.split(/[\\/]/).pop() ?? path }));
    } catch (e) {
      setErr(String(e));
    }
  }
  async function openFile(): Promise<{ backup: Backup; name: string } | null> {
    setErr(null);
    setMsg(null);
    const f = await p.openText().catch((e) => {
      setErr(String(e));
      return null;
    });
    if (!f) return null;
    const r = parseBackup(f.text, lang);
    if ("error" in r) {
      setErr(`${f.name}: ${r.error}`);
      return null;
    }
    return { backup: r.backup, name: f.name };
  }
  async function loadBase() {
    const b = await openFile();
    if (!b) return;
    setBase(b);
    setUnit(b.backup.unit);
    if (b.backup.device && DEVICES.some((d) => d.id === b.backup.device!.id)) setDevId(b.backup.device.id);
    setCmp(null);
    setPicked(new Set());
    setResult(null);
    setMsg(fill(t("bkLoaded"), { a: b.name }));
  }

  // ---------------------------------------------------------------- 비교
  const [cmpWith, setCmpWith] = useState<"device" | "file">("device");
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [cmp, setCmp] = useState<{ rows: DiffRow[]; other: string } | null>(null);
  async function runCompare() {
    setErr(null);
    setMsg(null);
    if (!base) return setErr(t("bkBaseNone"));
    if (cmpWith === "file") {
      const o = await openFile();
      if (!o) return;
      setCmp({ rows: compareBlocks(base.backup.blocks, o.backup.blocks), other: o.name });
      return;
    }
    if (!p.connected) return setErr(t("needConnect"));
    count("device_backup");
    const now = await readAll(base.backup.blocks.map((k) => ({ fc: k.fc, start: k.start, qty: k.qty, points: k.points })), "bkReading");
    if (!alive.current) return;
    setCmp({ rows: compareBlocks(base.backup.blocks, now), other: fill(t("bkCmpDeviceShort"), { u: unit }) });
  }

  // ---------------------------------------------------------------- 복원
  const rows = useMemo(() => (base ? restoreRows(base.backup, dev) : []), [base, dev]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Map<string, number[] | null> | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof verifyRows> | null>(null);
  const writes = writePlan(rows, picked);
  const sig = `${unit}|${writes.map((w) => w.row.key).join(",")}`;
  const asking = confirm === sig;
  // 고른 칸·국번이 바뀌면 미리보기·확인을 다시
  useEffect(() => {
    setPreview(null);
    setConfirm(null);
  }, [sig]);
  function togglePick(r: RestoreRow, on: boolean) {
    const next = new Set(picked);
    if (on) next.add(r.key);
    else next.delete(r.key);
    setPicked(next);
  }
  async function runPreview() {
    setErr(null);
    setMsg(null);
    setResult(null);
    if (!p.connected) return setErr(t("needConnect"));
    if (!writes.length) return setErr(t("bkPickFirst"));
    const now = await readAll(readBackRanges(writes.map((w) => w.row)), "bkReading");
    if (!alive.current) return;
    const v = verifyRows(
      writes.map((w) => ({ row: w.row, ok: true })),
      now,
    );
    setPreview(new Map(v.map((x) => [x.row.key, x.got])));
  }
  async function runWrite() {
    setErr(null);
    setMsg(null);
    if (!p.connected) return setErr(t("needConnect"));
    if (!writes.length || !preview) return;
    if (!asking) return setConfirm(sig);
    setConfirm(null);
    count("device_backup");
    stop.current = false;
    setBusy({ done: 0, total: writes.length, what: "bkWriting" });
    const done: { row: RestoreRow; ok: boolean }[] = [];
    const errs: string[] = [];
    for (let i = 0; i < writes.length; i++) {
      const w = writes[i];
      if (stop.current || !alive.current) {
        done.push({ row: w.row, ok: false });
        continue;
      }
      const o = await p.writeCells(unit, w.bits, w.start, w.values, p.forceMulti);
      const ok = o.result === "ok";
      if (!ok) errs.push(`${label(w.row.fc, w.row.addr)}: ${exText(o)}`);
      done.push({ row: w.row, ok });
      if (alive.current) setBusy({ done: i + 1, total: writes.length, what: "bkWriting" });
    }
    if (!alive.current) return;
    setBusy(null);
    const again = await readAll(readBackRanges(writes.map((w) => w.row)), "bkVerifying");
    if (!alive.current) return;
    setResult(verifyRows(done, again));
    setPreview(null);
    if (errs.length) setErr(errs.slice(0, 5).join("\n") + (errs.length > 5 ? "\n…" : ""));
  }

  // ---------------------------------------------------------------- 그리기
  const nameOf = (r: { point?: Point }) => r.point?.name ?? "";
  const rowsShown = cmp ? (onlyDiff ? cmp.rows.filter((r) => !r.same) : cmp.rows) : [];
  const diffN = cmp ? cmp.rows.filter((r) => !r.same).length : 0;
  const sum = base ? backupSummary(base.backup.blocks) : null;
  const failed = base ? base.backup.blocks.filter((k) => !k.values) : [];
  const writable = rows.filter((r) => !r.blocked);
  const fmtSel = (
    <label className="inline">
      {t("format")}
      <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
        <option value="u16">U16</option>
        <option value="s16">S16</option>
        <option value="hex">HEX</option>
        <option value="bin">BIN</option>
      </select>
    </label>
  );
  const commText = (c: BackupComm) =>
    c.transport === "serial"
      ? `RTU ${c.baud ?? "?"} ${c.dataBits ?? 8}${c.parity === "even" ? "E" : c.parity === "odd" ? "O" : "N"}${c.stopBits ?? 1}`
      : `${c.transport === "tcp" ? "Modbus TCP" : "RTU over TCP"}${c.host ? ` ${c.host}:${c.port ?? 502}` : ""}`;
  const baseInfo = base && (
    <div className="bk-base hint">
      {fill(t("bkBaseInfo"), { a: base.backup.note || t("bkNoNote"), u: base.backup.unit, c: commText(base.backup.comm), t: base.backup.readAt || "?" })}
      {base.name && ` · ${base.name}`}
      {base.backup.device && ` · ${fill(t("bkProfileFile"), { a: base.backup.device.name })}`}
    </div>
  );
  const progress = busy && (
    <span className="scan-progress" role="status">
      <progress max={busy.total || 1} value={busy.done} />
      {fill(t(busy.what), { d: busy.done, t: busy.total })}
      <button className="btn small" onClick={() => (stop.current = true)}>
        {t("bkStop")}
      </button>
    </span>
  );

  return (
    <div className="modal-back" ref={back} onClick={() => !busy && p.onClose()}>
      <div className="modal backup-dlg" role="dialog" aria-label={t("bkTitle")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t("bkTitle")}</b>
          <button className="btn small ghost" onClick={p.onClose} disabled={!!busy} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <span className="segs bk-tabs" role="tablist" aria-label={t("bkTitle")}>
            {(["backup", "compare", "restore"] as const).map((k) => (
              <button key={k} role="tab" className={tab === k ? "seg on" : "seg"} aria-selected={tab === k} disabled={!!busy} onClick={() => setTab(k)}>
                {t(k === "backup" ? "bkTabBackup" : k === "compare" ? "bkTabCompare" : "bkTabRestore")}
              </button>
            ))}
          </span>
          <div className="grid2 bk-top">
            <label data-tip={tip(lang, "mmUnit")}>
              {t("unit")}
              <NumInput min={minUnit(p.wire)} max={255} value={unit} disabled={!!busy} onValue={setUnit} />
            </label>
            <label data-tip={tip(lang, "mmBkProfile")}>
              {t("bkProfile")}
              <select value={devId} disabled={!!busy} onChange={(e) => setDevId(e.target.value)}>
                <option value="">{t("bkProfileNone")}</option>
                {DEVICES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {deviceName(d, lang)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {tab === "backup" && (
            <>
              <span className="hint">{t("bkHint")}</span>
              <label>
                {t("bkNote")}
                <input value={note} maxLength={200} placeholder={t("bkNotePh")} disabled={!!busy} onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="bk-ranges">
                <table className="rtable">
                  <thead>
                    <tr>
                      <th>{t("fc")}</th>
                      <th>{t("start")}</th>
                      <th>{t("qty")}</th>
                      <th>{t("colName")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {ranges.map((r, i) => (
                      <tr key={r.id} className="bk-range">
                        <td>
                          <select aria-label={t("fc")} value={r.fc} disabled={!!busy} onChange={(e) => setRanges(ranges.map((x) => (x.id === r.id ? { ...x, fc: Number(e.target.value) as Fc, points: undefined } : x)))}>
                            {FCS.map((f) => (
                              <option key={f} value={f}>
                                {t(`fc${f}` as Key)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input className="mono bk-start" aria-label={t("start")} value={r.startText} spellCheck={false} disabled={!!busy} onChange={(e) => setRanges(ranges.map((x) => (x.id === r.id ? { ...x, startText: e.target.value } : x)))} />
                        </td>
                        <td>
                          <NumInput className="num" min={1} max={RANGE_MAX} value={r.qty} disabled={!!busy} onValue={(n) => setRanges(ranges.map((x) => (x.id === r.id ? { ...x, qty: n } : x)))} />
                        </td>
                        <td className="rname">
                          {r.name ?? ""}
                          {r.qty > maxQty(r.fc) && <span className="hint"> {fill(t("bkSplitNote"), { n: Math.ceil(r.qty / maxQty(r.fc)) })}</span>}
                        </td>
                        <td>
                          <button className="btn small ghost" aria-label={`${t("bkDelRange")} ${i + 1}`} title={t("bkDelRange")} disabled={!!busy || ranges.length < 2} onClick={() => setRanges(ranges.filter((x) => x.id !== r.id))}>
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row2">
                <button className="btn small" disabled={!!busy || ranges.length >= 200} onClick={() => setRanges([...ranges, { id: seq.current++, fc: 3, startText: label(3, 0), qty: 10 }])}>
                  {t("bkAddRange")}
                </button>
                <button className="btn small bk-fill" disabled={!!busy || !dev} onClick={fillFromDevice} data-tip={tip(lang, "mmBkFill")}>
                  {t("bkFill")}
                </button>
                <span className="grow" />
                <span className="hint">{typeof plan === "string" ? "" : fill(t("bkPlan"), { n: plan.length })}</span>
              </div>
              <div className="row2 scan-run">
                <button className="btn small primary bk-run" disabled={!!busy} onClick={() => void runBackup()} data-tip={tip(lang, "mmBkRead")}>
                  {t("bkRead")}
                </button>
                {progress}
              </div>
              {base && sum && (
                <>
                  {baseInfo}
                  <div className={sum.failed ? "hint warn bk-sum" : "hint ok bk-sum"} role="status">
                    {fill(t("bkDone"), { ok: sum.ok, n: sum.items, f: sum.failed })}
                  </div>
                  {failed.length > 0 && (
                    <div className="bk-failed">
                      <b>{t("bkFailed")}</b>
                      <ul>
                        {failed.slice(0, 50).map((k) => (
                          <li key={`${k.fc}:${k.start}`}>
                            FC{fcHex(k.fc)} {label(k.fc, k.start)}–{label(k.fc, k.start + k.qty - 1)} ({k.qty}) — {k.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="row2">
                    <button className="btn small primary bk-save-json" disabled={!!busy} onClick={() => void save("json")}>
                      {t("bkSaveJson")}
                    </button>
                    <button className="btn small bk-save-csv" disabled={!!busy} onClick={() => void save("csv")}>
                      {t("bkSaveCsv")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {tab !== "backup" && (
            <div className="row2">
              <button className="btn small bk-load" disabled={!!busy} onClick={() => void loadBase()} data-tip={tip(lang, "mmBkLoad")}>
                {t("bkLoad")}
              </button>
              <span className="grow" />
            </div>
          )}
          {tab !== "backup" && (base ? baseInfo : <span className="hint">{t("bkBaseNone")}</span>)}

          {tab === "compare" && base && (
            <>
              <div className="row2 bk-cmp-with" role="group" aria-label={t("bkCmpWith")}>
                <span>{t("bkCmpWith")}</span>
                <span className="segs">
                  {(["device", "file"] as const).map((k) => (
                    <button key={k} className={cmpWith === k ? "seg on" : "seg"} aria-pressed={cmpWith === k} disabled={!!busy} onClick={() => setCmpWith(k)}>
                      {k === "device" ? fill(t("bkCmpDevice"), { u: unit }) : t("bkCmpFile")}
                    </button>
                  ))}
                </span>
              </div>
              <div className="row2 scan-run">
                <button className="btn small primary bk-cmp-run" disabled={!!busy} onClick={() => void runCompare()} data-tip={tip(lang, "mmBkCompare")}>
                  {t("bkCmpRun")}
                </button>
                {progress}
                <span className="grow" />
                <label className="inline">
                  <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> {t("bkOnlyDiff")}
                </label>
                {fmtSel}
              </div>
              {cmp && (
                <>
                  <div className={diffN ? "hint warn bk-cmp-sum" : "hint ok bk-cmp-sum"} role="status">
                    {diffN ? fill(t("bkCmpSummary"), { n: cmp.rows.length, d: diffN, a: cmp.other }) : fill(t("bkCmpSame"), { n: cmp.rows.length, a: cmp.other })}
                  </div>
                  {rowsShown.length > 0 && (
                    <div className="bk-table">
                      <table className="rtable bk-cmp">
                        <thead>
                          <tr>
                            <th>{t("colAddr")}</th>
                            <th>{t("colName")}</th>
                            <th>{t("bkColBackup")}</th>
                            <th>{t("bkColOther")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rowsShown.slice(0, 2000).map((r) => (
                            <tr key={r.key} className={r.same ? "" : "bk-diff"}>
                              <td className="addr">
                                FC{fcHex(r.fc)} {label(r.fc, r.addr)}
                              </td>
                              <td className="rname">{nameOf(r)}</td>
                              <td className="rval mono">{diffText(r, r.a, format)}</td>
                              <td className="rval mono">{diffText(r, r.b, format)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "restore" && base && (
            <>
              <div className="interlock bk-warn" role="note">
                {t("bkWarn")}
              </div>
              <span className="hint">{t("bkRestoreHint")}</span>
              <div className="row2">
                <button className="btn small" disabled={!!busy || !writable.length} onClick={() => setPicked(new Set(writable.map((r) => r.key)))}>
                  {t("bkPickAll")}
                </button>
                <button className="btn small" disabled={!!busy || !picked.size} onClick={() => setPicked(new Set())}>
                  {t("bkPickNone")}
                </button>
                <span className="grow" />
                <span className="hint bk-picked">{fill(t("bkPicked"), { n: writes.length })}</span>
                {fmtSel}
              </div>
              <div className="bk-table">
                <table className="rtable bk-restore">
                  <thead>
                    <tr>
                      <th />
                      <th>{t("colAddr")}</th>
                      <th>{t("colName")}</th>
                      <th>{t("bkColNow")}</th>
                      <th>{t("bkColWrite")}</th>
                      <th>{t("bkColResult")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3000).map((r) => {
                      const res = result?.find((x) => x.row.key === r.key);
                      const now = preview?.get(r.key);
                      return (
                        <tr key={r.key} className={r.blocked ? "bk-blocked" : picked.has(r.key) ? "picked" : ""}>
                          <td>
                            <input type="checkbox" aria-label={`${label(r.fc, r.addr)} ${t("bkPickOne")}`} checked={picked.has(r.key) && !r.blocked} disabled={!!busy || !!r.blocked} onChange={(e) => togglePick(r, e.target.checked)} />
                          </td>
                          <td className="addr">
                            FC{fcHex(r.fc)} {label(r.fc, r.addr)}
                          </td>
                          <td className="rname">
                            {nameOf(r)}
                            {r.blocked && <span className="bk-why"> {t(WHY_KEY[r.blocked])}</span>}
                          </td>
                          <td className="rval mono">{preview && picked.has(r.key) ? diffText(r, now ?? null, format) : ""}</td>
                          <td className={preview && now && r.values && now.some((v, i) => v !== r.values![i]) ? "rval mono bk-change" : "rval mono"}>{diffText(r, r.values, format)}</td>
                          <td className={res ? `bk-st ${res.state}` : "bk-st"}>{res ? `${t(STATE_KEY[res.state])}${res.state === "differ" ? ` (${diffText(r, res.got, format)})` : ""}` : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {asking && (
                <div className="interlock bk-confirm" role="alert">
                  {fill(t("bkConfirm"), { u: unit, n: writes.length })}
                </div>
              )}
              {result && (
                <div className={result.every((x) => x.state === "match") ? "hint ok bk-verify" : "hint warn bk-verify"} role="status">
                  {fill(t("bkVerify"), {
                    m: result.filter((x) => x.state === "match").length,
                    x: result.filter((x) => x.state === "differ").length,
                    f: result.filter((x) => x.state === "write-failed").length,
                    u: result.filter((x) => x.state === "unread").length,
                  })}
                </div>
              )}
              <div className="row2 scan-run dlg-buttons">
                <button className="btn small bk-preview" disabled={!!busy || !writes.length} onClick={() => void runPreview()} data-tip={tip(lang, "mmBkPreview")}>
                  {t("bkPreview")}
                </button>
                <button className={asking ? "btn small danger bk-write" : "btn small primary bk-write"} disabled={!!busy || !writes.length || !preview} onClick={() => void runWrite()} title={preview ? "" : t("bkPreviewFirst")} data-tip={tip(lang, "mmBkWrite")}>
                  {asking ? t("bkWriteConfirm") : t("bkWrite")}
                </button>
                {progress}
              </div>
            </>
          )}

          {msg && !err && (
            <div className="hint ok" role="status">
              {msg}
            </div>
          )}
          {err && (
            <div className="error bk-err" role="alert">
              {err}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
