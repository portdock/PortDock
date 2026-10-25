// 내보내기 시험 — CSV 칸 수·따옴표, Markdown 표 줄 수
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CSV_COLUMNS, devicesCsv, devicesMarkdown } from "./devicesExport.ts";

const root = new URL("../../../data/devices/", import.meta.url);
const devices = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((e) => readdirSync(new URL(e.name + "/", root)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(`${e.name}/${f}`, root), "utf8"))));

const parseCsv = (s: string) => {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"' && s[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\r") {}
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  return rows;
};

test("CSV: 머리줄 + 레지스터 수만큼, 모든 행 칸 수 같음", () => {
  const regs = devices.reduce((n, d) => n + d.registers.length, 0);
  const rows = parseCsv(devicesCsv(devices));
  assert.equal(rows.length, regs + 1);
  assert.deepEqual(rows[0], [...CSV_COLUMNS]);
  for (const r of rows) assert.equal(r.length, CSV_COLUMNS.length);
});

test("CSV: 쉼표·따옴표가 든 값도 원래대로", () => {
  const d = { id: "x/y", manufacturer: { ko: "가", en: 'A, "B"' }, model: "M", kind: "other", registers: [{ table: "holding-registers", address: 1, manualAddress: "40002", type: "u16", name: { ko: "이름", en: "a,b" }, access: "r", fc: [3] }] } as never;
  const rows = parseCsv(devicesCsv([d]));
  assert.equal(rows[1][1], 'A, "B"');
  assert.equal(rows[1][14], "a,b");
});

test("Markdown: 장비마다 제목 하나, 레지스터마다 표 한 줄", () => {
  const md = devicesMarkdown(devices, (d) => `https://x/${d.id}/`);
  assert.equal(md.match(/^## /gm)?.length, devices.length);
  const rows = md.split("\n").filter((l) => /^\| (holding|input|coils|discrete)/.test(l)).length;
  assert.equal(rows, devices.reduce((n, d) => n + d.registers.length, 0));
});
