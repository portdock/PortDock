// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/modbus-master/src/backup.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backupCsv,
  backupFileName,
  backupJson,
  backupSummary,
  compareBlocks,
  diffText,
  makeBackup,
  parseBackup,
  planReads,
  profileReadOnly,
  rangeProblem,
  rangesFromDevice,
  readBackRanges,
  restoreRows,
  splitRange,
  verifyRows,
  restoreUnitProblem,
  previewReadAny,
  writePlan,
} from "./backup.ts";

const meta = { app: "PortDock Modbus Master 0.10.0", readAt: "2026-10-31 13:05:09", note: "펌프 1호기", unit: 1, comm: { transport: "serial", baud: 9600, dataBits: 8, parity: "even", stopBits: 1 } };
const f32 = { addr: 10, type: "f32", order: "CDAB", name: "Temp" };

test("범위 검사·나눠 읽기(125·2000 한도, 32비트 칸은 자르지 않음)", () => {
  assert.equal(rangeProblem({ start: 0, qty: 10 }, "ko"), null);
  assert.match(rangeProblem({ start: 65535, qty: 2 }, "en"), /65535/);
  assert.match(rangeProblem({ start: 0, qty: 0 }, "ko"), /개수/);
  const parts = splitRange({ fc: 3, start: 0, qty: 300 });
  assert.deepEqual(parts.map((p) => [p.start, p.qty]), [[0, 125], [125, 125], [250, 50]]);
  assert.deepEqual(splitRange({ fc: 1, start: 0, qty: 2500 }).map((p) => p.qty), [2000, 500]);
  // F32 가 124~125 에 걸치면 124 에서 끊는다
  const cut = splitRange({ fc: 3, start: 0, qty: 200, points: [{ ...f32, addr: 124 }] });
  assert.deepEqual(cut.map((p) => [p.start, p.qty]), [[0, 124], [124, 76]]);
  assert.equal(cut[1].points.length, 1, "점은 들어간 덩어리로");
  assert.equal(cut[0].points, undefined);
  // 장비 한도(maxRegisters)
  assert.deepEqual(splitRange({ fc: 3, start: 0, qty: 100 }, 40).map((p) => p.qty), [40, 40, 20]);
  assert.equal(planReads([{ fc: 3, start: 0, qty: 10 }, { fc: 4, start: 0, qty: 130 }]).length, 3);
});

test("장비 프로필 → 범위(이어진 칸끼리)", () => {
  const d = {
    id: "x/y",
    model: "M1",
    manufacturer: { ko: "제조", en: "Maker" },
    comm: { addressing: "zero" },
    registers: [
      { table: "holding-registers", address: 0, type: "u16", name: { ko: "가속", en: "Accel" }, access: "rw", fc: [3, 6] },
      { table: "holding-registers", address: 1, type: "f32", name: { ko: "목표", en: "Target" }, access: "rw", fc: [3, 16] },
      { table: "holding-registers", address: 10, type: "u16", name: { ko: "형번", en: "Model" }, access: "r", fc: [3] },
      { table: "input-registers", address: 5, type: "u16", name: { ko: "전류", en: "Current" }, access: "r", fc: [4] },
    ],
  };
  const r = rangesFromDevice(d, "en");
  assert.deepEqual(r.map((x) => [x.fc, x.start, x.qty]), [[3, 0, 3], [3, 10, 1], [4, 5, 1]]);
  assert.equal(r[0].points[1].type, "f32");
  assert.equal(profileReadOnly(d, 3, 10, 1), true);
  assert.equal(profileReadOnly(d, 3, 2, 1), false);
  assert.equal(profileReadOnly(d, 3, 9, 2), true, "걸치면 읽기 전용");
  assert.equal(profileReadOnly(undefined, 3, 10, 1), false);
  // 복원 줄 — 입력 레지스터·읽기 전용은 막힌다
  const b = makeBackup(meta, [
    { fc: 3, start: 0, qty: 3, points: r[0].points, values: [5, 0, 0x4120] },
    { fc: 3, start: 10, qty: 1, values: [7] },
    { fc: 4, start: 5, qty: 1, values: [3] },
  ]);
  const rows = restoreRows(b, d);
  assert.deepEqual(rows.map((x) => [x.key, x.span, x.blocked]), [["3:0", 1, null], ["3:1", 2, null], ["3:10", 1, "profile-ro"], ["4:5", 1, "input"]]);
});

test("백업 파일 — 만들기·읽기·틀린 파일·CSV·파일 이름", () => {
  const b = makeBackup(meta, [
    { fc: 3, start: 0, qty: 12, points: [f32], values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0x41a0] },
    { fc: 1, start: 0, qty: 3, values: [1, 0, 1] },
    { fc: 3, start: 500, qty: 2, values: null, error: "Exception 02" },
  ]);
  const text = backupJson(b);
  assert.ok(!/Users|\\\\|COM\d/.test(text), "경로·COM 이름 없음");
  const back = parseBackup(text, "ko");
  assert.ok("backup" in back);
  assert.deepEqual(back.backup, b);
  assert.deepEqual(backupSummary(b.blocks), { ok: 2, failed: 1, items: 15 });
  assert.match(parseBackup("{", "ko").error, /JSON/);
  assert.match(parseBackup('{"format":"other"}', "en").error, /Not a PortDock/);
  assert.match(parseBackup(JSON.stringify({ ...b, version: 9 }), "en").error, /Unknown version/);
  assert.match(parseBackup(JSON.stringify({ ...b, blocks: [{ fc: 3, start: 0, qty: 2, values: [1] }] }), "ko").error, /1번째 범위: 값이 틀림/);
  assert.match(parseBackup(JSON.stringify({ ...b, blocks: [{ fc: 1, start: 0, qty: 1, values: [2] }] }), "ko").error, /값이 틀림/);
  assert.match(parseBackup(JSON.stringify({ ...b, blocks: [{ fc: 6, start: 0, qty: 1, values: [2] }] }), "en").error, /function code/);
  // 범위 밖·모양이 틀린 점은 버린다, BOM 도 받는다
  const loose = parseBackup("﻿" + JSON.stringify({ ...b, blocks: [{ fc: 3, start: 0, qty: 2, values: [1, 2], points: [{ ...f32, addr: 1 }, { addr: 0, type: "u16", order: "ABCD", name: "A" }] }] }), "ko");
  assert.deepEqual(loose.backup.blocks[0].points, [{ addr: 0, type: "u16", order: "ABCD", name: "A" }]);
  const csv = backupCsv(b, "ko");
  assert.ok(csv.startsWith("﻿table,address,type,order,name,value"));
  assert.match(csv, /holding-registers,10,f32,CDAB,Temp,20/);
  assert.match(csv, /coils,2,bit,,,1/);
  assert.match(csv, /holding-registers,500,u16,ABCD,\(읽지 못함\),\r\n/);
  assert.equal(backupFileName(1, "2026-10-31 13:05:09", "json"), "modbus-backup-id1-2026-10-31-130509.json");
});

test("비교 — 다른 칸만·형식대로·한쪽만 있는 칸", () => {
  const a = [
    { fc: 3, start: 0, qty: 4, points: [{ addr: 2, type: "f32", order: "CDAB", name: "T" }], values: [1, 2, 0, 0x41a0] },
    { fc: 3, start: 100, qty: 1, values: null, error: "timeout" },
  ];
  const b = [
    { fc: 3, start: 0, qty: 4, values: [1, 0xfffe, 0, 0x41a8] },
    { fc: 3, start: 100, qty: 2, values: [9, 9] },
  ];
  const rows = compareBlocks(a, b);
  assert.deepEqual(rows.map((r) => [r.key, r.span, r.same]), [["3:0", 1, true], ["3:1", 1, false], ["3:2", 2, false], ["3:100", 1, false], ["3:101", 1, false]]);
  const r1 = rows[1];
  assert.equal(diffText(r1, r1.a, "u16"), "2");
  assert.equal(diffText(r1, r1.b, "s16"), "-2");
  assert.equal(diffText(r1, r1.b, "hex"), "FFFE");
  assert.equal(diffText(rows[2], rows[2].a, "u16"), "20");
  assert.equal(diffText(rows[2], rows[2].b, "u16"), "21");
  assert.equal(diffText(rows[3], rows[3].a, "u16"), "—");
});

test("복원 — 고른 것만·막힌 줄 빼기·다시 읽기 범위·결과", () => {
  const b = makeBackup(meta, [
    { fc: 3, start: 0, qty: 4, points: [{ addr: 2, type: "f32", order: "ABCD", name: "T" }], values: [10, 11, 0x41a0, 0] },
    { fc: 1, start: 0, qty: 2, values: [1, 0] },
    { fc: 4, start: 0, qty: 1, values: [5] },
    { fc: 3, start: 50, qty: 1, values: null, error: "x" },
  ]);
  const rows = restoreRows(b);
  assert.equal(rows.find((r) => r.key === "3:50").blocked, "no-value");
  assert.equal(rows.find((r) => r.key === "4:0").blocked, "input");
  // 기본은 아무것도 쓰지 않는다
  assert.equal(writePlan(rows, new Set()).length, 0);
  const plan = writePlan(rows, new Set(["3:0", "3:2", "1:1", "4:0", "3:50"]));
  assert.deepEqual(plan.map((p) => [p.bits, p.start, p.values]), [[true, 1, [0]], [false, 0, [10]], [false, 2, [0x41a0, 0]]]);
  assert.deepEqual(readBackRanges(plan.map((p) => p.row)).map((r) => [r.fc, r.start, r.qty]), [[1, 1, 1], [3, 0, 1], [3, 2, 2]], "빈 주소는 읽지 않는다");
  const v = verifyRows(
    plan.map((p, i) => ({ row: p.row, ok: i !== 0 })),
    [{ fc: 3, start: 0, qty: 4, values: [10, 0, 0x41a0, 1] }],
  );
  assert.deepEqual(v.map((x) => x.state), ["write-failed", "match", "differ"]);
  assert.deepEqual(verifyRows([{ row: plan[1].row, ok: true }], []).map((x) => x.state), ["unread"]);
});

test("복원 — 국번 0·RTU 예약 국번은 막고, 미리보기를 하나도 못 읽었으면 쓰지 않는다", () => {
  assert.equal(restoreUnitProblem(0, "rtu"), "broadcast");
  assert.equal(restoreUnitProblem(0, "tcp"), null, "TCP 의 0 은 미리보기에서 답이 있어야 쓴다(previewReadAny)");
  assert.equal(restoreUnitProblem(1, "rtu"), null);
  assert.equal(restoreUnitProblem(247, "rtu"), null);
  assert.equal(restoreUnitProblem(248, "rtu"), "reserved");
  assert.equal(restoreUnitProblem(255, "rtu"), "reserved");
  assert.equal(restoreUnitProblem(255, "tcp"), null, "TCP 의 255 는 흔한 «국번 없음» 값");
  // 브로드캐스트에는 답이 없으므로 미리보기 칸이 전부 비고 → 쓰기가 막힌다
  // 파일에서 연 백업(TCP 국번 0)을 RTU 연결에서 열어도 같은 판정
  const b = parseBackup(backupJson(makeBackup({ ...meta, unit: 0 }, [{ fc: 3, start: 0, qty: 1, values: [1] }])), "ko");
  assert.equal(restoreUnitProblem(b.backup.unit, "rtu"), "broadcast");
  assert.equal(previewReadAny(new Map([["3:0", null], ["3:1", null]])), false);
  assert.equal(previewReadAny(new Map()), false);
  assert.equal(previewReadAny(new Map([["3:0", null], ["3:1", [5]]])), true);
});

test("복원 — 멈춰서 보내지 않은 칸은 «쓰기 실패» 가 아니라 «멈춤»", () => {
  const rows = restoreRows(makeBackup(meta, [{ fc: 3, start: 0, qty: 2, values: [1, 2] }]));
  const v = verifyRows(
    [
      { row: rows[0], ok: true },
      { row: rows[1], ok: "skipped" },
    ],
    [{ fc: 3, start: 0, qty: 2, values: [1, 0] }],
  );
  assert.deepEqual(v.map((x) => x.state), ["match", "skipped"]);
});
