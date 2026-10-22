// 장비 레지스터 맵 내보내기 — 사이트(/devices/all.json·registers.csv·/llms-full.txt)와 tools/devices-export.mjs(Hugging Face·Kaggle 용 묶음)가 같이 쓴다.
// 브라우저·Node 어디서나 도는 순수 함수만 둔다(파일 읽기·쓰기 없음).
import type { Device, DevRegister } from "@shared/devices";

export const CSV_COLUMNS = [
  "device_id",
  "manufacturer",
  "model",
  "kind",
  "table",
  "address",
  "manual_address",
  "type",
  "order",
  "len",
  "scale",
  "unit",
  "access",
  "fc",
  "name_en",
  "name_ko",
  "values_en",
  "ref",
] as const;

const cell = (v: unknown): string => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const valuesEn = (r: DevRegister) => (r.values ?? []).map((v) => `${v.value}=${v.en}`).join("; ");

/** 레지스터 한 줄 = CSV 한 행 */
export function registerRow(d: Device, r: DevRegister): string[] {
  return [
    d.id,
    d.manufacturer.en,
    d.model,
    d.kind,
    r.table,
    String(r.address),
    r.manualAddress,
    r.type,
    r.order ?? "",
    r.len === undefined ? "" : String(r.len),
    r.scale === undefined ? "" : String(r.scale),
    r.unit ?? "",
    r.access,
    r.fc.join(" "),
    r.name.en,
    r.name.ko,
    valuesEn(r),
    r.ref ?? "",
  ].map(cell);
}

/** 모든 장비의 레지스터를 한 CSV 로(UTF-8, 머리줄 포함, CRLF) */
export function devicesCsv(devices: Device[]): string {
  const rows = [CSV_COLUMNS.join(",")];
  for (const d of devices) for (const r of d.registers) rows.push(registerRow(d, r).join(","));
  return rows.join("\r\n") + "\r\n";
}

const fmtComm = (d: Device) => {
  const c = d.comm;
  const parts = [
    c.baud ? `${c.baud} bps` : "",
    c.dataBits ? `${c.dataBits}${c.parity ? c.parity[0].toUpperCase() : ""}${c.stopBits ?? ""}` : "",
    c.unit !== undefined ? `unit ${c.unit}` : "",
    c.tcpPort ? `TCP ${c.tcpPort}` : "",
  ].filter(Boolean);
  return parts.join(", ");
};

const md = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/** AI 가 한 번에 읽는 전체 레지스터 표(Markdown, 영어) — /llms-full.txt 본문 */
export function devicesMarkdown(devices: Device[], pageUrl: (d: Device) => string): string {
  const out: string[] = [];
  for (const d of devices) {
    out.push(`## ${d.manufacturer.en} ${d.model} — ${d.title.en}`, "");
    out.push(`- Page: ${pageUrl(d)}`);
    out.push(`- Protocols: ${d.protocols.join(", ")}${fmtComm(d) ? ` · factory settings: ${fmtComm(d)}` : ""}`);
    out.push(`- Address: 0-based wire address (manual writes it as shown in «Manual»). Value = raw × scale.`);
    out.push(`- Sources: ${d.sources.map((s) => `${s.title}${s.edition ? ` (${s.edition.en})` : ""}, checked ${s.checked}`).join("; ")}`);
    out.push("", "| Table | Addr | Manual | Type | Scale | Unit | R/W | FC | Name | Values |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const r of d.registers) {
      const type = r.type + (r.order ? ` ${r.order}` : "") + (r.len ? ` ×${r.len}` : "");
      out.push(`| ${r.table} | ${r.address} | ${md(r.manualAddress)} | ${type} | ${r.scale ?? ""} | ${md(r.unit ?? "")} | ${r.access} | ${r.fc.join(" ")} | ${md(r.name.en)} | ${md(valuesEn(r))} |`);
    }
    out.push("");
  }
  return out.join("\n");
}
