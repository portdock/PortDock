// 상세 칸의 Modbus TCP(MBAP) 풀이 — TCP 앱. 백엔드 `decode_mbap`(core tcp.rs, modbus.rs 풀이를 그대로)
import { mbFunc, mbWord } from "./mbwords";
import type { Lang } from "./uiText";
import "./modbus.css";

export interface ModbusInfo {
  slave: number;
  function: number;
  function_name: string;
  kind: string;
  crc_ok: boolean;
  fields: [string, string][];
  values: number[];
}

export interface MbapInfo {
  transaction: number;
  protocol: number;
  length: number;
  unit: number;
  lengthOk: boolean;
  modbus: ModbusInfo | null;
  summary: string;
}

const L = {
  ko: { tid: "트랜잭션 ID", len: "길이 칸", lenBad: "길이 칸이 실제 길이와 다름", unit: "유닛 ID", values: "값", head: "Modbus TCP" },
  en: { tid: "Transaction ID", len: "Length field", lenBad: "length field does not match", unit: "Unit ID", values: "Values", head: "Modbus TCP" },
};

export function MbapDetail({ lang, info }: { lang: Lang; info: MbapInfo }) {
  const t = L[lang];
  const m = info.modbus;
  return (
    <div className="modbus">
      <div className="mbhead">
        {t.head}
        {m ? ` · ${mbWord(m.kind, lang)}` : ""} · <span className="mono">{info.summary}</span>
      </div>
      <table>
        <tbody>
          <tr>
            <td>{t.tid}</td>
            <td>
              {info.transaction} (0x{info.transaction.toString(16).toUpperCase().padStart(4, "0")})
            </td>
          </tr>
          <tr>
            <td>{t.len}</td>
            <td className={info.lengthOk ? undefined : "failc"}>
              {info.length}
              {info.lengthOk ? "" : ` — ${t.lenBad}`}
            </td>
          </tr>
          <tr>
            <td>{t.unit}</td>
            <td>{info.unit}</td>
          </tr>
          {m && (
            <tr>
              <td>{mbWord("function", lang)}</td>
              <td>
                0x{m.function.toString(16).toUpperCase().padStart(2, "0")} {mbFunc(m.function, m.function_name, lang)}
              </td>
            </tr>
          )}
          {m?.fields.map(([k, v]) => (
            <tr key={k}>
              <td>{mbWord(k, lang)}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {m && m.values.length > 0 && (
        <>
          <div className="mbhead">{t.values}</div>
          <div className="values">
            {m.values.map((v, i) => (
              <span key={i}>
                [{i}] {v}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
