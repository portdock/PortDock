// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/netscan/src/net.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PORTS, chipOn, extraPorts, formatPorts, parsePorts, PORT_CHIPS, samePortSet, togglePortChip } from "./net.ts";

test("포트 칩 — 기본 목록은 칩이 모두 켜짐, 글 모양은 기본 목록과 같다", () => {
  const p = parsePorts(DEFAULT_PORTS, "ko").ports;
  assert.ok(PORT_CHIPS.every((c) => chipOn(p, c.ports)));
  assert.equal(formatPorts(p), DEFAULT_PORTS);
  assert.deepEqual(extraPorts(p), []);
});

test("포트 칩 끄고 켜기 — 범위 칩(MC/SLMP 5000-5010)·직접 넣은 포트는 뒤에", () => {
  const off = togglePortChip(DEFAULT_PORTS, [5000, 5010], false, "ko");
  assert.equal(off, "502, 2004, 102, 44818, 4840, 80, 443, 23, 21, 1883, 5025");
  assert.equal(togglePortChip(off, [5000, 5010], true, "ko"), DEFAULT_PORTS);
  const mine = togglePortChip("502, 8080, 9000-9003, 5001", [102, 102], true, "en");
  assert.equal(mine, "502, 102, 5001, 8080, 9000-9003");
  assert.deepEqual(extraPorts(parsePorts(mine, "en").ports), [8080, 9000, 9001, 9002, 9003]);
  // 칸이 틀리면 칩을 못 누른다
  assert.equal(togglePortChip("502, abc", [102, 102], true, "ko"), null);
  assert.ok(samePortSet(parsePorts("502, 102", "ko").ports, parsePorts("102,502", "ko").ports));
  assert.ok(!samePortSet([502], [502, 102]));
});
