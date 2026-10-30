// 장비 맵 데이터 묶음의 판·인용·바뀐 점·묶음 스키마 — /data/ 쪽, /devices/all.json·index.json, /data/version.json·/data/schema.json,
// llms.txt·llms-full.txt, tools/devices-export.mjs 가 같이 쓴다. 파일 읽기·쓰기 없이 데이터에서 저절로 만든다(손으로 적는 판 번호 없음).
//   판(version)   = 모든 출처 확인일(sources[].checked) 중 가장 늦은 날의 «YYYY.MM» — 인용 문구의 vYYYY.MM
//   기준일(date)  = 그 가장 늦은 확인일(YYYY-MM-DD)
//   내용 해시     = 장비 JSON 을 id 순으로 이은 것의 SHA-256 앞 12자리 — 같은 판 안에서 데이터가 고쳐져도 구별된다
//   바뀐 점       = 장비마다 첫 확인일(더한 날)·마지막 확인일(출처를 더하거나 다시 확인한 날)로 묶는다
import { createHash } from "node:crypto";
import type { Device } from "@shared/devices";

export const DATASET_NAME = "PortDock device register maps";
export const DATASET_NAME_KO = "PortDock 장비 레지스터 맵";
export const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";

export interface Release {
  /** «2026.10» — 앞에 v 를 붙여 인용 */
  version: string;
  /** 가장 늦은 출처 확인일 YYYY-MM-DD */
  date: string;
  /** SHA-256 앞 12자리(16진) */
  contentHash: string;
  devices: number;
  registers: number;
  makers: number;
}

const byId = (devices: Device[]) => [...devices].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const checkedDates = (d: Device) => d.sources.map((s) => s.checked).sort();

export function dataRelease(devices: Device[]): Release {
  const date = devices.flatMap(checkedDates).sort().pop() ?? "1970-01-01";
  const hash = createHash("sha256");
  for (const d of byId(devices)) hash.update(JSON.stringify(d) + "\n");
  return {
    version: date.slice(0, 7).replace("-", "."),
    date,
    contentHash: hash.digest("hex").slice(0, 12),
    devices: devices.length,
    registers: devices.reduce((n, d) => n + d.registers.length, 0),
    makers: new Set(devices.map((d) => d.manufacturer.en)).size,
  };
}

/** 인용 문구 — «PortDock device register maps, v2026.10, https://portdock.dev/devices/» */
export const citeText = (r: Release, home: string) => `${DATASET_NAME}, v${r.version}, ${home}`;
export const citeTextKo = (r: Release, home: string) => `${DATASET_NAME_KO}(${DATASET_NAME}), v${r.version}, ${home}`;

export interface ChangeEntry {
  date: string;
  version: string;
  /** 이날 처음 확인해 넣은 장비 id */
  added: string[];
  /** 이날 출처를 더하거나 다시 확인한 장비 id(이미 있던 장비) */
  rechecked: string[];
}

/** 바뀐 점 — 확인일별, 최근 것이 먼저 */
export function changelog(devices: Device[]): ChangeEntry[] {
  const m = new Map<string, ChangeEntry>();
  const at = (date: string) => {
    let e = m.get(date);
    if (!e) m.set(date, (e = { date, version: date.slice(0, 7).replace("-", "."), added: [], rechecked: [] }));
    return e;
  };
  for (const d of byId(devices)) {
    const ds = checkedDates(d);
    at(ds[0]).added.push(d.id);
    for (const x of new Set(ds.slice(1))) if (x !== ds[0]) at(x).rechecked.push(d.id);
  }
  return [...m.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 묶음에 든 파일(사이트 경로) — /data/ 쪽 표·version.json·sitemap 이 같이 쓴다 */
export const DATA_FILES = [
  { path: "/devices/all.json", format: "application/json", en: "Every device and register in one JSON file (with version, citation and license)", ko: "모든 장비·레지스터를 한 JSON 으로(판·인용·라이선스 포함)" },
  { path: "/devices/registers.csv", format: "text/csv", en: "One CSV row per register (UTF-8 with BOM, CRLF)", ko: "레지스터 한 줄 = CSV 한 행(UTF-8 BOM, CRLF)" },
  { path: "/devices/index.json", format: "application/json", en: "Device list with links to each JSON file and page", ko: "장비 목록과 장비별 JSON·쪽 주소" },
  { path: "/data/schema.json", format: "application/schema+json", en: "JSON Schema for all.json; $defs/device covers each device file", ko: "all.json 의 JSON Schema — $defs/device 가 장비 파일 하나" },
  { path: "/data/version.json", format: "application/json", en: "Version, date, content hash, file list and changelog", ko: "판·기준일·내용 해시·파일 목록·바뀐 점" },
  { path: "/llms-full.txt", format: "text/plain", en: "Plain-text digest of every register for AI tools", ko: "AI 용 전체 레지스터 요약(글)" },
] as const;

/** 장비별 파일 주소 규칙 */
export const DEVICE_JSON = "/devices/{maker}/{model}.json";
export const DEVICE_MD = "/devices/{maker}/{model}.md";

/** all.json 의 머리(장비 목록 앞) — 키 순서가 곧 파일 모양 */
export function bundleHead(r: Release, o: { home: string; schema: string }) {
  return {
    name: DATASET_NAME,
    version: r.version,
    date: r.date,
    contentHash: r.contentHash,
    url: o.home,
    license: CC_BY_URL,
    citation: citeText(r, o.home),
    schema: o.schema,
    note: "Facts from manufacturer manuals only, each with document, edition, pages and date checked. Not affiliated with the makers. Check the device manual before writing to a device. address = 0-based wire address; value = raw × scale.",
  };
}

export function bundle(devices: Device[], o: { home: string; schema: string }) {
  return { ...bundleHead(dataRelease(devices), o), devices };
}

/** all.json 의 JSON Schema — 장비 스키마(data/devices/schema.json)를 $defs/device 로 품는다 */
export function bundleSchema(deviceSchema: Record<string, unknown>, id: string) {
  const { $schema, $id, $defs, title, description, ...device } = deviceSchema as { $schema: string; $id: string; $defs: Record<string, unknown>; title: string; description: string };
  const str = (d: string, extra: Record<string, unknown> = {}) => ({ description: d, type: "string", minLength: 1, ...extra });
  return {
    $schema,
    $id: id,
    title: `${DATASET_NAME} — all.json`,
    description: `장비 맵 묶음 전체(판·인용·라이선스 + 장비 목록). 장비 하나의 형식은 $defs/device(원본 ${$id}). / The whole bundle (version, citation, license + devices). One device follows $defs/device (source ${$id}).`,
    type: "object",
    additionalProperties: false,
    required: ["name", "version", "date", "contentHash", "url", "license", "citation", "schema", "note", "devices"],
    properties: {
      name: { const: DATASET_NAME, description: "데이터 묶음 이름 / Dataset name" },
      version: str("판 YYYY.MM — 가장 늦은 출처 확인일의 달 / Version YYYY.MM — month of the latest source check", { pattern: "^\\d{4}\\.\\d{2}$" }),
      date: str("기준일 — 가장 늦은 출처 확인일 / Date of the latest source check", { pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
      contentHash: str("장비 JSON(id 순)의 SHA-256 앞 12자리 / First 12 hex digits of SHA-256 over device JSON in id order", { pattern: "^[0-9a-f]{12}$" }),
      url: str("묶음 홈(인용할 주소) / Dataset home (cite this URL)", { pattern: "^https?://" }),
      license: { const: CC_BY_URL, description: "CC BY 4.0" },
      citation: str("인용 문구 / Citation text"),
      schema: str("이 파일의 JSON Schema 주소 / URL of this JSON Schema", { pattern: "^https?://" }),
      note: str("쓰기 전 주의 / Usage note"),
      devices: { description: "장비 목록(id 순이 아니라 제조사·모델 순) / Devices (sorted by maker and model)", type: "array", minItems: 1, items: { $ref: "#/$defs/device" } },
    },
    $defs: { device: { title, description, ...device }, ...$defs },
  };
}

/** 스키마 칸 설명 «한국어 / English» 를 언어별로 */
export const descIn = (d: string | undefined, lang: "ko" | "en") => {
  if (!d) return "";
  const i = d.lastIndexOf(" / ");
  return i < 0 ? d : lang === "ko" ? d.slice(0, i) : d.slice(i + 3);
};
