// 상세 칸의 «요청과 짝지은 값» — 응답 줄을 고르면 바로 앞 요청(국번·함수·시작·개수)과 짝지어 «40001 = 1812 (0x0714)» 로 보인다.
// Serial(RTU)·TCP(Modbus TCP) 공통. 짝짓기는 shared/mbPair.ts, 함수 이름은 shared/mbwords.ts.
import { useEffect, useState } from "react";
import { exceptionText, valueRows, WORD_FMTS, type AddrNotation, type MbPaired, type WordFmt } from "./mbPair";
import { mbFunc } from "./mbwords";
import { mbFuncInfo, plcText } from "./modbusBuild";
import { load, store } from "./framing";
import { tip } from "./tips";
import type { Lang } from "./uiText";
import "./modbus.css";

const L = {
  ko: {
    head: "요청과 짝",
    from: "국번 {u} · {f} · {a} ({n}개)",
    tid: "트랜잭션 {t}",
    fmt: "값 형식",
    notation: "주소 표기",
    zero: "0 기준",
    plc: "{a} 표기",
    write: "정상 — 장비가 쓰기를 받았습니다",
    exc: "예외 {a}",
    fmts: { u16: "U16", s16: "S16", hex: "HEX", f32abcd: "F32 ABCD", f32cdab: "F32 CDAB" } as Record<WordFmt, string>,
  },
  en: {
    head: "Paired with request",
    from: "Slave ID {u} · {f} · {a} ({n})",
    tid: "transaction {t}",
    fmt: "Value format",
    notation: "Addresses",
    zero: "0-based",
    plc: "{a} notation",
    write: "OK — the device accepted the write",
    exc: "Exception {a}",
    fmts: { u16: "U16", s16: "S16", hex: "HEX", f32abcd: "F32 ABCD", f32cdab: "F32 CDAB" } as Record<WordFmt, string>,
  },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

/** notation: 처음 주소 표기(«Modbus 요청» 창에서 쓰던 표기). 값 형식·표기는 기억한다 */
export function MbValues({ lang, paired, notation }: { lang: Lang; paired: MbPaired; notation: AddrNotation }) {
  const t = L[lang];
  const [fmt, setFmt] = useState<WordFmt>(() => {
    const v = load<string>("mbValFmt", "u16");
    return (WORD_FMTS as string[]).includes(v) ? (v as WordFmt) : "u16";
  });
  useEffect(() => store("mbValFmt", fmt), [fmt]);
  const [nota, setNota] = useState<AddrNotation>(notation);
  useEffect(() => setNota(notation), [notation]);
  const { req } = paired;
  const f = mbFuncInfo(req.fc);
  const range = (n: AddrNotation) => (n === "plc" ? `${plcText(req.fc, req.addr)}${req.qty > 1 ? `~${plcText(req.fc, req.addr + req.qty - 1)}` : ""}` : `${req.addr}${req.qty > 1 ? `~${req.addr + req.qty - 1}` : ""}`);
  const rows = valueRows(paired, fmt, nota);
  const fcName = `FC${req.fc.toString(16).toUpperCase().padStart(2, "0")} ${mbFunc(req.fc, f?.en ?? "", lang)}`;
  return (
    <div className="modbus mb-paired">
      <div className="mbhead" data-tip={tip(lang, "mbPaired")}>
        {t.head}
        {req.tid != null ? ` · ${fill(t.tid, { t: req.tid })}` : ""}
      </div>
      <div className="mb-paired-req">{fill(t.from, { u: req.unit, f: fcName, a: range(nota), n: req.qty })}</div>
      {paired.kind === "exception" && <div className="failc mb-paired-exc">{fill(t.exc, { a: exceptionText(paired.code, lang) })}</div>}
      {paired.kind === "write" && <div className="okc">{t.write}</div>}
      {rows.length > 0 && (
        <>
          <div className="mb-paired-tools">
            {paired.kind === "regs" && (
              <select value={fmt} onChange={(e) => setFmt(e.target.value as WordFmt)} aria-label={t.fmt} data-tip={tip(lang, "mbValFmt")}>
                {WORD_FMTS.map((k) => (
                  <option key={k} value={k}>
                    {t.fmts[k]}
                  </option>
                ))}
              </select>
            )}
            <select value={nota} onChange={(e) => setNota(e.target.value as AddrNotation)} aria-label={t.notation} data-tip={tip(lang, "mbAddrMode")}>
              <option value="zero">{t.zero}</option>
              <option value="plc">{fill(t.plc, { a: `${f?.prefix ?? "4"}xxxx` })}</option>
            </select>
          </div>
          <table className="mb-paired-table">
            <tbody>
              {rows.map((r) => (
                <tr key={r.addr}>
                  <td className="mono">{r.addr}</td>
                  <td className="mono">= {r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
