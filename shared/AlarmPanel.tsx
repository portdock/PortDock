// (0.10.0) 알람 목록 — 걸린 때·풀린 때·지속 시간·확인 단추, 모두 확인·끝난 것 지우기·소리·기록 CSV. 감시 조건이 있거나 알람이 남아 있을 때만 보인다.
import type { Lang } from "./lang.ts";
import { useEffect, useState } from "react";
import { fmtSpan, ruleSummary } from "./alarm.ts";
import { alarmText, kindLabel, type AlarmTextKey } from "./alarmText.ts";
import type { Alarms } from "./useAlarms";
import "./alarm.css";

const p2 = (n: number) => String(n).padStart(2, "0");
const hms = (ts: number) => {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
};

export function AlarmPanel({ al, lang, labelOf, fmtValue = String }: { al: Alarms; lang: Lang; labelOf: (key: string) => string; fmtValue?: (v: number) => string }) {
  const T = (k: AlarmTextKey, v?: Record<string, string | number>) => alarmText(lang, k, v);
  const open = al.entries.filter((e) => e.end == null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open.length) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open.length]);
  if (!al.rules.size && !al.entries.length) return null;
  const loud = open.some((e) => !e.acked);
  return (
    <section className={`alarm-panel${open.length ? " on" : ""}${loud ? " loud" : ""}`} aria-label={T("title")}>
      <div className="alarm-head">
        <b>🔔 {T("title")}</b>
        <span className={open.length ? "alarm-state on" : "alarm-state"} role="status">
          {open.length ? T("activeN", { n: open.length }) : al.running ? T("noAlarm", { n: al.rules.size }) : T("notRunning", { n: al.rules.size })}
        </span>
        <span className="grow" />
        <label className="inline alarm-sound">
          <input type="checkbox" checked={al.sound} onChange={(e) => al.setSound(e.target.checked)} /> {T("sound")}
        </label>
        <button className={al.log ? "btn small danger alarm-log" : "btn small alarm-log"} onClick={() => void al.toggleLog()} title={al.log?.path}>
          {al.log ? `${T("logOn", { n: al.log.lines })} · ${T("logStop")}` : T("logStart")}
        </button>
        <button className="btn small alarm-ackall" onClick={al.ackAll} disabled={!al.entries.some((e) => !e.acked)}>
          {T("ackAll")}
        </button>
        <button className="btn small ghost" onClick={al.clearEnded} disabled={!al.entries.some((e) => e.end != null)}>
          {T("clearEnded")}
        </button>
      </div>
      {al.entries.length > 0 && (
        <div className="alarm-list">
          <table className="grid">
            <thead>
              <tr>
                <th>{T("colKind")}</th>
                <th>{T("colName")}</th>
                <th>{T("colValue")}</th>
                <th>{T("colStart")}</th>
                <th>{T("colEnd")}</th>
                <th>{T("colDur")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {al.entries.map((e) => {
                const rule = al.rules.get(e.key);
                return (
                  <tr key={e.id} className={`${e.end == null ? "open" : "ended"}${e.acked ? " acked" : ""}`}>
                    <td>
                      <span className={`al-kind al-${e.kind}`}>{kindLabel(e.kind, lang)}</span>
                    </td>
                    <td className="ellipsis-cell" title={rule ? ruleSummary(rule) : undefined}>
                      {labelOf(e.key)}
                    </td>
                    <td className="mono">{e.value == null ? "—" : fmtValue(e.value)}</td>
                    <td className="mono">{hms(e.start)}</td>
                    <td className="mono">{e.end == null ? <b>{T("ongoing")}</b> : hms(e.end)}</td>
                    <td className="mono">{fmtSpan((e.end ?? now) - e.start)}</td>
                    <td>
                      {e.acked ? (
                        <span className="muted">{T("acked")}</span>
                      ) : (
                        <button className="btn small al-ack" onClick={() => al.ack(e.id)}>
                          {T("ack")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="hint alarm-safety">{T("safety")}</div>
    </section>
  );
}
