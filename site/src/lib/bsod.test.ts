// 블루스크린 정지 코드 사전 — 찾기(코드·이름·1001 메시지)와 자료 모양
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUGCHECKS, STEPS, codeText, findBugcheck, lookupCode, msUrl } from "./bsod.ts";

test("자료: 코드·이름이 겹치지 않고, 문서 꼬리가 코드와 맞고, 볼 순서가 있는 단계만 쓴다", () => {
  assert.ok(BUGCHECKS.length >= 30);
  assert.equal(new Set(BUGCHECKS.map((b) => b.code)).size, BUGCHECKS.length);
  assert.equal(new Set(BUGCHECKS.map((b) => b.name)).size, BUGCHECKS.length);
  for (const b of BUGCHECKS) {
    assert.ok(b.slug.toLowerCase().startsWith("0x" + (b.code >>> 0).toString(16) + "-"), b.slug);
    assert.match(b.name, /^[A-Z0-9_]+$/);
    assert.ok(b.causes.ko.length > 0 && b.causes.ko.length === b.causes.en.length, b.name);
    assert.ok(b.steps.length > 0 && b.steps.every((s) => s in STEPS), b.name);
    assert.ok(b.meaning.ko && b.meaning.en);
    // 금지 낱말
    for (const t of [b.meaning.ko, ...b.causes.ko]) assert.doesNotMatch(t, /검증|최적화|고쳐 줍니다|원인 확정|정상/);
  }
  for (const s of Object.values(STEPS)) assert.doesNotMatch(s.ko, /검증|최적화|고쳐 줍니다|원인 확정|정상/);
});

test("문서 주소와 코드 표기", () => {
  const d1 = BUGCHECKS.find((b) => b.code === 0xd1)!;
  assert.equal(msUrl(d1), "https://learn.microsoft.com/windows-hardware/drivers/debugger/bug-check-0xd1--driver-irql-not-less-or-equal");
  assert.equal(codeText(0x1a), "0x0000001A");
  assert.equal(codeText(0xc000021a), "0xC000021A");
});

test("짧은 코드: 0xD1 · d1 · D1 · 0x000000D1 · 0x00000000000000d1", () => {
  for (const s of ["0xD1", "d1", "D1", "0x000000D1", "0x00000000000000d1", " 0xd1 "]) {
    const r = findBugcheck(s);
    assert.equal(r.code, 0xd1, s);
    assert.equal(r.bc?.name, "DRIVER_IRQL_NOT_LESS_OR_EQUAL", s);
  }
  assert.equal(findBugcheck("133").bc?.name, "DPC_WATCHDOG_VIOLATION");
  assert.equal(findBugcheck("1a").bc?.name, "MEMORY_MANAGEMENT");
});

test("이름 전체·일부·띄어 쓴 이름(블루스크린 화면의 «Stop code»)", () => {
  assert.equal(findBugcheck("DRIVER_IRQL").bc?.code, 0xd1);
  assert.equal(findBugcheck("whea_uncorrectable_error").bc?.code, 0x124);
  assert.equal(findBugcheck("Stop code: DPC WATCHDOG VIOLATION").bc?.code, 0x133);
  assert.equal(findBugcheck("중지 코드: CRITICAL PROCESS DIED").bc?.code, 0xef);
  assert.equal(findBugcheck("kernel-security-check-failure").bc?.code, 0x139);
  const irql = findBugcheck("irql");
  assert.equal(irql.bc, undefined);
  assert.deepEqual(irql.matches.map((b) => b.code).sort((a, b) => a - b), [0x0a, 0xd1]);
});

test("이벤트 1001(BugCheck) 메시지 전체 — 영어·한국어, 매개변수 4개와 덤프 경로의 .sys 아닌 것", () => {
  const en =
    "The computer has rebooted from a bugcheck.  The bugcheck was: 0x00000133 (0x0000000000000001, 0x0000000000001e00, 0xfffff8053a8fb320, 0x0000000000000000). A dump was saved in: C:\\WINDOWS\\Minidump\\103126-10125-01.dmp. Report Id: 00000000-0000-0000-0000-000000000000.";
  const r = findBugcheck(en);
  assert.equal(r.how, "bugcheck-message");
  assert.equal(r.code, 0x133);
  assert.deepEqual(r.params, ["0x0000000000000001", "0x0000000000001e00", "0xfffff8053a8fb320", "0x0000000000000000"]);
  assert.deepEqual(r.files, []);
  const ko = "버그 검사 후 컴퓨터가 다시 부팅되었습니다. 버그 검사: 0x0000003b (0x00000000c0000005, 0xfffff80123456789, 0xffffd00012345678, 0x0000000000000000). 덤프가 저장된 위치: C:\\WINDOWS\\MEMORY.DMP. 보고서 ID: 0.";
  assert.equal(findBugcheck(ko).bc?.name, "SYSTEM_SERVICE_EXCEPTION");
});

test("WER 요약(BCCode·P1)과 «What failed» 의 .sys 이름", () => {
  assert.equal(findBugcheck("Problem signature:\nProblem Event Name: BlueScreen\nBCCode: 116\nBCP1: FFFF").code, 0x116);
  assert.equal(findBugcheck("Event Name: BlueScreen  P1: d1  P2: 0").code, 0xd1);
  const r = findBugcheck("Stop code: VIDEO_TDR_FAILURE\nWhat failed: nvlddmkm.sys");
  assert.equal(r.code, 0x116);
  assert.deepEqual(r.files, ["nvlddmkm.sys"]);
  // «BugCheck 1001» 은 이벤트 ID 이지 코드가 아니다
  assert.equal(findBugcheck("BugCheck 1001").code, undefined);
});

test("0x1000007E 처럼 0x10000000 이 붙은 판은 같은 항목, 사전에 없는 코드는 코드만", () => {
  const v = lookupCode(0x1000007e);
  assert.equal(v.bc?.code, 0x7e);
  assert.equal(v.variant, true);
  const r = findBugcheck("0x1000008e");
  assert.equal(r.bc, undefined);
  assert.equal(r.code, 0x1000008e);
  const u = findBugcheck("0x00000020");
  assert.equal(u.code, 0x20);
  assert.equal(u.bc, undefined);
  assert.equal(findBugcheck("").how, "none");
  assert.equal(findBugcheck("hello").how, "none");
});

test("일본어 Windows 문구 — 블루스크린 화면 «停止コード»·이벤트 1001 «バグチェック» 메시지·«停止コード: 133»", () => {
  assert.equal(findBugcheck("停止コード: DPC_WATCHDOG_VIOLATION\n失敗した内容: storahci.sys").bc?.name, "DPC_WATCHDOG_VIOLATION");
  assert.equal(findBugcheck("停止コード:CRITICAL PROCESS DIED").bc?.name, "CRITICAL_PROCESS_DIED");
  assert.equal(findBugcheck("停止コード: 133").code, 0x133);
  const r = findBugcheck("コンピューターはバグチェック後に再起動されました。バグチェック: 0x0000009f (0x0000000000000003, 0xffffc00000000000, 0xfffff80000000000, 0xffffc00000000001)。ダンプの保存先: C:\WINDOWS\MEMORY.DMP。");
  assert.equal(r.code, 0x9f);
  assert.equal(r.how, "bugcheck-message");
  assert.equal(r.params?.length, 4);
});

test("인도네시아어 Windows 문구 — 블루스크린 화면 «Kode penghentian»", () => {
  assert.equal(findBugcheck("Kode penghentian: DPC_WATCHDOG_VIOLATION\nApa yang gagal: storahci.sys").bc?.name, "DPC_WATCHDOG_VIOLATION");
  assert.equal(findBugcheck("Kode penghentian:CRITICAL PROCESS DIED").bc?.name, "CRITICAL_PROCESS_DIED");
  assert.equal(findBugcheck("Kode penghentian: 133").code, 0x133);
});
