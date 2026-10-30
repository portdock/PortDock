// node --test tools/devices-check.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { checkAll, checkDevice, loadSchema, refEn, modbusSchemaExpr, regsOf, toModbusSchemaYaml, validateSchema } from "./devices-check.mjs";

const schema = loadSchema();
const t = (ko, en = ko) => ({ ko, en });

function sample(regs) {
  return {
    schemaVersion: 1,
    id: "maker/model",
    manufacturer: t("제조사", "Maker"),
    model: "M1",
    kind: "inverter",
    title: t("시험 장비", "Test device"),
    protocols: ["rtu"],
    comm: { addressing: "zero", baud: 9600, parity: "none", stopBits: 1, unit: 1 },
    registers: regs,
    sources: [{ title: "매뉴얼", edition: t("판 1", "Ed. 1"), pages: t("p.3", "p.3"), url: "https://example.com/m.pdf", checked: "2026-10-19" }],
  };
}
const reg = (o) => ({ table: "holding-registers", address: 0, manualAddress: "0x0000", type: "u16", name: t("값", "Value"), access: "r", fc: [3], ref: "p.3", ...o });

test("저장소의 모든 장비 맵이 검사를 통과한다", () => {
  const { devices, errors } = checkAll();
  assert.deepEqual(errors, []);
  assert.ok(devices.length >= 1);
});

test("스키마 — 필수 키·모르는 키·enum·pattern", () => {
  const ok = sample([reg({})]);
  assert.deepEqual(validateSchema(ok, schema), []);
  const bad = { ...ok, extra: 1, kind: "toaster" };
  delete bad.sources;
  const es = validateSchema(bad, schema).join("\n");
  assert.match(es, /sources/);
  assert.match(es, /extra/);
  assert.match(es, /toaster/);
  assert.match(validateSchema({ ...ok, id: "No Slash" }, schema).join(), /모양/);
  assert.match(validateSchema(sample([reg({ address: 70000 })]), schema).join(), /65535/);
});

test("스키마 — 출처는 문서·판·쪽·확인일, 레지스터는 근거 쪽(ref)이 필수", () => {
  for (const k of ["title", "edition", "pages", "url", "checked"]) {
    const dev = sample([reg({})]);
    delete dev.sources[0][k];
    assert.match(validateSchema(dev, schema).join(), new RegExp(`«${k}» 없음`));
  }
  const dev = sample([reg({})]);
  delete dev.registers[0].ref;
  assert.match(validateSchema(dev, schema).join(), /registers\/0: «ref» 없음/);
});

test("주소 중복·형식 칸 수 겹침", () => {
  const es = checkDevice(sample([reg({ address: 10, type: "u32", fc: [3] }), reg({ address: 11 })]), "maker/model.json");
  assert.equal(es.length, 1);
  assert.match(es[0], /겹침/);
  // 다른 표면 같은 주소여도 괜찮다
  assert.deepEqual(checkDevice(sample([reg({ address: 5 }), reg({ table: "input-registers", address: 5, fc: [4] })]), "maker/model.json"), []);
  // f64 는 4칸
  assert.match(checkDevice(sample([reg({ type: "f64" }), reg({ address: 3 })]), "maker/model.json").join(), /겹침/);
  assert.match(checkDevice(sample([reg({ address: 65535, type: "u32" })]), "maker/model.json").join(), /넘음/);
});

test("표·형식·함수 코드·읽기쓰기", () => {
  const c = (r) => checkDevice(sample([reg(r)]), "maker/model.json").join("\n");
  assert.match(c({ table: "coils", type: "u16", fc: [1] }), /bit/);
  assert.match(c({ type: "bit" }), /bit/);
  assert.match(c({ fc: [1] }), /맞지 않음/);
  assert.match(c({ access: "r", fc: [3, 6] }), /읽기 전용/);
  assert.match(c({ access: "rw", fc: [3] }), /쓰기 함수 코드 없음/);
  assert.match(c({ type: "f32", access: "rw", fc: [3, 6, 16] }), /06/);
  assert.match(c({ type: "string" }), /len/);
  assert.match(c({ source: 3 }), /출처 번호/);
  assert.match(c({ bits: [{ bit: 16, ko: "x", en: "x" }] }), /비트 16/);
  assert.equal(c({ type: "string", len: 8 }), "");
  assert.match(checkDevice(sample([reg({})]), "other/model.json").join(), /경로/);
  const old = sample([reg({})]);
  old.sources[0].checked = "2999-01-01";
  assert.match(checkDevice(old, "maker/model.json").join(), /미래/);
});

test("출처의 판·쪽은 한·영 글 — 문자열 하나는 안 됨, 영어 글에 한글이 있으면 오류", () => {
  const dev = sample([reg({})]);
  dev.sources[0] = { ...dev.sources[0], edition: t("판 2 (PDF 작성 2026-01-01)", "Ed. 2 (PDF created 2026-01-01)"), pages: t("pp.3-5 통신 맵", "pp.3-5 comm map") };
  assert.deepEqual(validateSchema(dev, schema), []);
  assert.deepEqual(checkDevice(dev, "maker/model.json"), []);
  const flat = sample([reg({})]);
  flat.sources[0].pages = "pp.3-5 통신 맵";
  assert.match(validateSchema(flat, schema).join(), /sources\/0\/pages/);
  const mixed = sample([reg({ name: t("값", "값 value") })]);
  mixed.sources[0].pages = t("pp.3-5 통신 맵", "pp.3-5 통신 맵");
  const es = checkDevice(mixed, "maker/model.json").join("\n");
  assert.match(es, /registers\/0\/name\/en: 영어\(en\) 글에 한글/);
  assert.match(es, /sources\/0\/pages\/en/);
});

test("ref 는 «표»·«인쇄» 밖의 한글 금지, model·models 는 한글 금지", () => {
  const c = (o, m) => checkDevice({ ...sample([reg(o)]), ...m }, "maker/model.json").join("\n");
  assert.equal(c({ ref: "인쇄 p.21 표 2.1.1 (PDF p.22)" }), "");
  assert.equal(refEn("인쇄 p.21 표 2.1.1 (PDF p.22)"), "printed p.21 Table 2.1.1 (PDF p.22)");
  assert.match(c({ ref: "p.28 표 2.4.1 (모니터 그룹)" }), /registers\/0\/ref/);
  assert.match(c({}, { models: ["A-1", "B-2 (모듈)"] }), /models\/1/);
});

test("칸 수는 Modbus Slave 와 같다", () => {
  assert.equal(regsOf("u16"), 1);
  assert.equal(regsOf("f32"), 2);
  assert.equal(regsOf("f64"), 4);
  assert.equal(regsOf("string", 5), 3);
});

test("modbus-schema 식", () => {
  assert.equal(modbusSchemaExpr(reg({ address: 5, scale: 0.01 })), "uint16(hr:5) * 0.01");
  assert.equal(modbusSchemaExpr(reg({ table: "input-registers", address: 10, type: "f32" })), "ieee754_32(ir:10#2)");
  assert.equal(modbusSchemaExpr(reg({ address: 10, type: "u32", order: "CDAB" })), "uint32(hr:11, hr:10)");
  assert.equal(modbusSchemaExpr(reg({ address: 10, type: "u32", order: "BADC" })), null);
  assert.equal(modbusSchemaExpr(reg({ table: "coils", type: "bit", address: 3 })), "boolean(c:3)");
  const y = toModbusSchemaYaml(sample([reg({ name: t("주파수", "Output frequency"), unit: "Hz", scale: 0.01 })]));
  assert.match(y, /schemaFeatureLevel: 2/);
  assert.match(y, /- id: 'Output frequency'/);
  assert.match(y, /unit: 'Hz'/);
});
