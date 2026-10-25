#!/usr/bin/env node
// IEEE OUI(MA-L) 목록 → 앱에 넣는 작은 파일 두 개. 받는 것은 사람이 한 번, 만들 때만:
//   curl -o oui.csv https://standards-oui.ieee.org/oui/oui.csv
//   node apps/netscan/src-tauri/data/make_oui.mjs oui.csv
//  - oui_names.txt: 짧은 제조사 이름(겹치지 않게, 한 줄에 하나). 주소·«Co., Ltd.» 같은 꼬리는 버린다.
//  - oui_index.bin: OUI 순으로 5바이트씩 — OUI 3바이트(큰 쪽 먼저) + 이름 줄 번호 u16(작은 쪽 먼저).
// 이름이 같은 OUI 가 많아(화웨이·시스코 등 수백 개) 이렇게 나누면 압축 없이 절반 크기다.
// 지금 넣은 것: 2026-10-18 받은 oui.csv — MA-L 40,237개, 이름 19,782개(MA-M·MA-S·CID 는 넣지 않음).
// 출처: IEEE Registration Authority 공개 목록(https://standards-oui.ieee.org/). 화면 도움말 «문제 해결» 에 받은 날을 적어 둔다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = process.argv[2];
if (!src) throw new Error("사용: node make_oui.mjs <oui.csv>");
const dir = path.dirname(fileURLToPath(import.meta.url));

/** CSV 한 줄 → 칸(따옴표 안 쉼표·"" 처리) */
function cells(line) {
  const r = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") r.push(cur), (cur = "");
    else cur += c;
  }
  r.push(cur);
  return r;
}

// 이름 끝의 회사 형태(여러 번 붙은 것도) — 화면에는 «Siemens», «Mitsubishi Electric» 처럼
const TAIL = /[\s,.]+(?:co\.?,?\s*ltd\.?|company\s+limited|co\.?|corp\.?|corporation|incorporated|inc\.?|ltd\.?|limited|llc|l\.l\.c\.|gmbh(?:\s*&\s*co\.?\s*kg)?|kg|ag|s\.?a\.?s?\.?|s\.?r\.?l\.?|s\.?p\.?a\.?|b\.?v\.?|n\.?v\.?|a\/s|as|ab|oy|plc|pty|pte|sdn\.?\s*bhd\.?|bhd|kk|k\.k\.|co\.?,?\s*kg|technology|technologies|tech)\.?$/i;
function short(name) {
  let s = name.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 6; i++) {
    const t = s.replace(TAIL, "").trim();
    if (!t || t === s) break;
    s = t;
  }
  s = s.replace(/[\s,.]+$/, "");
  if (!s) s = name.trim();
  return s.length > 40 ? s.slice(0, 40).trim() : s;
}

const rows = new Map();
for (const line of fs.readFileSync(src, "utf8").split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [reg, oui, org] = cells(line);
  if (reg !== "MA-L" || !/^[0-9A-F]{6}$/i.test(oui ?? "")) continue;
  const name = short(org ?? "");
  if (name && name.toLowerCase() !== "private") rows.set(oui.toUpperCase(), name.replace(/[\t\n]/g, " "));
}
const names = [...new Set(rows.values())].sort();
if (names.length > 0xffff) throw new Error("이름이 65535개를 넘습니다");
const nameNo = new Map(names.map((n, i) => [n, i]));
const sorted = [...rows].sort(([a], [b]) => (a < b ? -1 : 1));
const idx = Buffer.alloc(sorted.length * 5);
sorted.forEach(([o, n], i) => {
  idx.writeUIntBE(parseInt(o, 16), i * 5, 3);
  idx.writeUInt16LE(nameNo.get(n), i * 5 + 3);
});
const text = names.join("\n") + "\n";
fs.writeFileSync(path.join(dir, "oui_names.txt"), text);
fs.writeFileSync(path.join(dir, "oui_index.bin"), idx);
console.log(`${sorted.length} OUI · 이름 ${names.length}개 → oui_names.txt ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB + oui_index.bin ${(idx.length / 1024).toFixed(0)} KB`);
