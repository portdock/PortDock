// node --test tools/help-devices.test.mjs
// Modbus Master·Slave 도움말(한·영)에 적힌 «내장 장비 N종» 이 data/devices 의 장비 수와 같고, 모든 모델 이름이 목록에 있는지.
// 영어 도움말이 31종에 멈춰 있던 일(10/24 점검)이 다시 생기지 않게.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "data", "devices");
const devices = [];
for (const maker of fs.readdirSync(dir, { withFileTypes: true })) {
  if (!maker.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(dir, maker.name))) if (f.endsWith(".json")) devices.push(JSON.parse(fs.readFileSync(path.join(dir, maker.name, f), "utf8")));
}

for (const app of ["modbus-master", "modbus-slave"]) {
  const help = fs.readFileSync(path.join(root, "apps", app, "src", "help.ts"), "utf8");
  test(`${app} 도움말: 한·영 장비 수 = ${devices.length}`, () => {
    const ko = [...help.matchAll(/내장 장비 (\d+)종/g)].map((m) => Number(m[1]));
    const en = [...help.matchAll(/(\d+) built-in devices/g)].map((m) => Number(m[1]));
    assert.ok(ko.length > 0 && en.length > 0, "문구를 못 찾음");
    for (const n of [...ko, ...en]) assert.equal(n, devices.length);
  });
  test(`${app} 도움말: 한·영 목록에 모든 모델 이름`, () => {
    const koLine = help.split("\n").find((l) => /내장 장비 \d+종/.test(l));
    const enLine = help.split("\n").find((l) => /\d+ built-in devices/.test(l));
    for (const d of devices) {
      // 도움말은 줄인 이름으로 적는다: «TK Series» → TK, «LSLV-S100» → S100, «Accura 2300[S]» → 2300, «Accura 2700M» → 2700
      const name = d.model.replace(/ Series$/, "").replace(/^LSLV-/, "").replace(/^Accura /, "").replace(/\[S\]$/, "").replace(/^(\d{4})M$/, "$1");
      assert.ok(koLine.includes(name), `한국어 목록에 ${name} 없음`);
      assert.ok(enLine.includes(name), `영어 목록에 ${name} 없음`);
    }
  });
}
