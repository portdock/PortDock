// 보조 창 — 대화·끝점 표, 흐름 따라가기, 응답 시간 분포
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Conv, type Endpoint, type Follow, type RtDist } from "./api";
import type { TFn } from "./i18n";
import { barFractions, bucketLabel, bytesText, durationText, followPieces, rtText, secText } from "./logic";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal pk-modal${wide ? " wide" : ""}`} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn small ghost" onClick={onClose} aria-label="✕">
            ✕
          </button>
        </div>
        <div className="modal-body pk-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 대화·끝점

type SortDir = { key: string; desc: boolean };
const sortBy = <T,>(rows: T[], s: SortDir): T[] => [...rows].sort((a, b) => {
  const x = (a as Record<string, unknown>)[s.key];
  const y = (b as Record<string, unknown>)[s.key];
  const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
  return s.desc ? -c : c;
});

/** 대화 한 줄을 눌렀을 때 거는 필터 */
export function convFilter(kind: string, c: Conv): string {
  const ip = kind === "ipv6" ? "ipv6" : "ip";
  if (kind === "eth") return `eth.addr == ${c.a} && eth.addr == ${c.b}`;
  const base = `${ip}.addr == ${c.a} && ${ip}.addr == ${c.b}`;
  if (kind === "tcp" || kind === "udp") return `${base} && ${kind}.port == ${c.portA} && ${kind}.port == ${c.portB}`;
  return base;
}

export function endpointFilter(kind: string, e: Endpoint): string {
  const ip = kind === "ipv6" ? "ipv6" : "ip";
  if (kind === "eth") return `eth.addr == ${e.addr}`;
  if (kind === "tcp" || kind === "udp") return `${ip}.addr == ${e.addr} && ${kind}.port == ${e.port}`;
  return `${ip}.addr == ${e.addr}`;
}

export function ConvDialog({ t, onClose, onFilter }: { t: TFn; onClose: () => void; onFilter: (expr: string) => void }) {
  const [kind, setKind] = useState("tcp");
  const [viewOnly, setViewOnly] = useState(false);
  const [tab, setTab] = useState<"conv" | "end">("conv");
  const [data, setData] = useState<{ conversations: Conv[]; endpoints: Endpoint[] } | null>(null);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState<SortDir>({ key: "bytes", desc: true });
  useEffect(() => {
    setData(null);
    api.conversations(kind, viewOnly).then(setData).catch((e) => setErr(String(e)));
  }, [kind, viewOnly]);
  const port = (p: number | null) => (p === null ? "" : `:${p}`);
  const hd = (key: string, label: string) => (
    <th onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : true })} className={sort.key === key ? "sorted" : ""}>
      {label}
      {sort.key === key ? (sort.desc ? " ▾" : " ▴") : ""}
    </th>
  );
  const convs = useMemo(() => (data ? sortBy(data.conversations, sort) : []), [data, sort]);
  const ends = useMemo(() => (data ? sortBy(data.endpoints, sort) : []), [data, sort]);
  return (
    <Modal title={t("convTitle")} onClose={onClose} wide>
      <div className="dlg-tools">
        <button className={`chip${tab === "conv" ? " on" : ""}`} onClick={() => setTab("conv")}>
          {t("convTab")}
        </button>
        <button className={`chip${tab === "end" ? " on" : ""}`} onClick={() => setTab("end")}>
          {t("endTab")}
        </button>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t("convKind")}>
          <option value="eth">Ethernet</option>
          <option value="ipv4">IPv4</option>
          <option value="ipv6">IPv6</option>
          <option value="tcp">TCP</option>
          <option value="udp">UDP</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={viewOnly} onChange={(e) => setViewOnly(e.target.checked)} /> {t("convViewOnly")}
        </label>
        <span className="hint">{t("convClickHint")}</span>
      </div>
      {err && <div className="hint warn">{err}</div>}
      {!data && !err && <div className="hint">{t("loading")}</div>}
      {data && tab === "conv" && (
        <div className="tbl-wrap">
          <table className="pk-table">
            <thead>
              <tr>
                {hd("a", t("addrA"))}
                {hd("b", t("addrB"))}
                {hd("packets", t("packets"))}
                {hd("bytes", t("bytes"))}
                {hd("aToBPackets", "A→B")}
                {hd("bToAPackets", "B→A")}
                {hd("startNs", t("start"))}
                {hd("durationS", t("duration"))}
              </tr>
            </thead>
            <tbody>
              {convs.map((c, i) => (
                <tr key={i} onClick={() => (onFilter(convFilter(kind, c)), onClose())}>
                  <td className="mono">
                    {c.a}
                    {port(c.portA)}
                  </td>
                  <td className="mono">
                    {c.b}
                    {port(c.portB)}
                  </td>
                  <td className="num">{c.packets.toLocaleString()}</td>
                  <td className="num">{bytesText(c.bytes)}</td>
                  <td className="num">{c.aToBPackets.toLocaleString()}</td>
                  <td className="num">{c.bToAPackets.toLocaleString()}</td>
                  <td className="num">{secText(c.startNs, 3)}</td>
                  <td className="num">{durationText(c.durationS * 1e9)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {convs.length === 0 && <div className="hint pad">{t("none")}</div>}
        </div>
      )}
      {data && tab === "end" && (
        <div className="tbl-wrap">
          <table className="pk-table">
            <thead>
              <tr>
                {hd("addr", t("address"))}
                {hd("port", t("port"))}
                {hd("packets", t("packets"))}
                {hd("bytes", t("bytes"))}
                {hd("txPackets", t("txPackets"))}
                {hd("rxPackets", t("rxPackets"))}
              </tr>
            </thead>
            <tbody>
              {ends.map((e, i) => (
                <tr key={i} onClick={() => (onFilter(endpointFilter(kind, e)), onClose())}>
                  <td className="mono">{e.addr}</td>
                  <td className="num">{e.port ?? ""}</td>
                  <td className="num">{e.packets.toLocaleString()}</td>
                  <td className="num">{bytesText(e.bytes)}</td>
                  <td className="num">{e.txPackets.toLocaleString()}</td>
                  <td className="num">{e.rxPackets.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ends.length === 0 && <div className="hint pad">{t("none")}</div>}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- 흐름 따라가기

export function FollowDialog({ t, no, onClose, onFilter }: { t: TFn; no: number; onClose: () => void; onFilter: (expr: string) => void }) {
  const [data, setData] = useState<Follow | null>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"ascii" | "hex">("ascii");
  useEffect(() => {
    api.follow(no).then(setData).catch((e) => setErr(String(e)));
  }, [no]);
  const pieces = useMemo(() => (data ? followPieces(data.chunks, mode) : []), [data, mode]);
  return (
    <Modal title={t("followTitle", { n: no })} onClose={onClose} wide>
      {err && <div className="hint warn">{err}</div>}
      {!data && !err && <div className="hint">{t("loading")}</div>}
      {data && (
        <>
          <div className="dlg-tools">
            <span className="legend client">{t("followClient", { a: data.client, n: bytesText(data.clientBytes) })}</span>
            <span className="legend server">{t("followServer", { a: data.server, n: bytesText(data.serverBytes) })}</span>
            <span className="sm-spacer" />
            <button className={`chip${mode === "ascii" ? " on" : ""}`} onClick={() => setMode("ascii")}>
              ASCII
            </button>
            <button className={`chip${mode === "hex" ? " on" : ""}`} onClick={() => setMode("hex")}>
              HEX
            </button>
            <button className="btn small" onClick={() => (onFilter(`tcp.stream == ${data.flow}`), onClose())} disabled={data.transport !== "tcp"}>
              {t("followFilter")}
            </button>
          </div>
          {data.truncated && <div className="hint warn">{t("followTruncated")}</div>}
          <div className="follow-box mono" aria-label={t("followTitle", { n: no })}>
            {pieces.length === 0 && <div className="hint pad">{t("followNoData")}</div>}
            {pieces.map((p, i) => (
              <pre key={i} className={p.fromClient ? "client" : "server"}>
                {p.text}
              </pre>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- 응답 시간 분포

export function RtDialog({ t, onClose, onFilter }: { t: TFn; onClose: () => void; onFilter: (expr: string) => void }) {
  const [data, setData] = useState<RtDist[] | null>(null);
  useEffect(() => {
    api.rtDistribution().then(setData).catch(() => setData([]));
  }, []);
  return (
    <Modal title={t("rtDistTitle")} onClose={onClose} wide>
      <p className="hint">{t("rtDistHelp")}</p>
      {!data && <div className="hint">{t("loading")}</div>}
      {data && data.length === 0 && <div className="hint pad">{t("none")}</div>}
      {data?.map((d) => {
        const fr = barFractions(d.buckets);
        return (
          <section key={d.key} className="rt-sec">
            <h4>
              {d.name} <span className="muted">{t("pairs", { n: d.rt.pairs })}</span>
            </h4>
            <div className="rtcells big">
              <span>
                {t("rtMin")} <b>{rtText(d.rt.minNs)}</b>
              </span>
              <span>
                {t("rtMed")} <b>{rtText(d.rt.medianNs)}</b>
              </span>
              <span>
                {t("rtP95")} <b>{rtText(d.rt.p95Ns)}</b>
              </span>
              <span>
                {t("rtMax")} <b>{rtText(d.rt.maxNs)}</b>
              </span>
              <span className={d.rt.noResponse ? "bad" : ""}>{t("noRespN", { n: d.rt.noResponse })}</span>
              <span className={d.rt.exceptions ? "bad" : ""}>{t("excN", { n: d.rt.exceptions })}</span>
            </div>
            <div className="hist-bars" role="img" aria-label={t("rtDistTitle")}>
              {d.buckets.map((b, i) => (
                <div className="hb" key={i}>
                  <span className="lab">{bucketLabel(b)}</span>
                  <span className="bar-wrap">
                    <span className="bar" style={{ width: `${fr[i] * 100}%` }} />
                  </span>
                  <span className="cnt">{b.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button className="btn small" onClick={() => (onFilter(`${d.key === "mbtcp" ? "modbus" : d.key}.response_time > 0.05`), onClose())}>
              {t("rtSlowFilter")}
            </button>
          </section>
        );
      })}
    </Modal>
  );
}
