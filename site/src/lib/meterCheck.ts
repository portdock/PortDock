// 웹 도구 «멀티미터 측정값 점검기» — 현장에서 잰 값 하나를 넣으면 «문제 없음(이 측정 범위) / 볼 것 / 문제 있음» 과 까닭을 낸다.
// 판정은 이 파일의 순수 함수만 한다(node --test). 화면·그림은 views/MultimeterCheckPage.astro, lib/meterFig.ts.
// 근거(값은 «일반적으로» — 장비 매뉴얼 값이 먼저):
//   RS-485: TIA/EIA-485-A — 수신기 문턱 ±200 mV, 공통 모드 −7~+12 V, 단위 부하 12 kΩ (TI SLLA070D 2010 설명)
//           MODBUS over serial line V1.02 (2006) §3.4.5 종단은 양 끝에만 — 150 Ω(0.5 W) 또는 1 nF + 120 Ω(0.25 W) 직렬(RC, 바이어스를 쓸 때 더 나음),
//           관례로 120 Ω 도 흔함. RC 종단은 직류를 막아 멀티미터(직류 저항)로는 보이지 않는다. §3.4.6 바이어스 450~650 Ω
//   4–20 mA: NAMUR NE 43 — 측정 정보 3.8~20.5 mA, 고장 신호 ≤3.6 mA·≥21 mA (lib/analogScale.ts 와 같은 경계)
//   24 V DC·센서 입력: IEC 61131-2 — 24 V DC 전원 허용 −15 %~+20 %(20.4~28.8 V),
//           입력 형식 1 켜짐 15 V 이상, 형식 2·3 켜짐 11 V 이상, 꺼짐 5 V 이하
//   RS-232: TIA-232-F — 송신 ±5~±15 V(부하 상태), 수신 문턱 ±3 V, 쉬는 상태(마크)는 음전압, 최대 ±25 V
// 이 모듈은 «문제 없음(이 측정 범위)» 까지만 말한다 — 잰 범위 안에서 문제가 보이지 않는다는 뜻이다.

export type Lang = "ko" | "en";
export type Level = "ok" | "warn" | "fault";
export interface T {
  ko: string;
  en: string;
}
export interface Verdict {
  level: Level;
  /** 한 줄 판정 까닭 */
  msg: T;
  /** 덧붙일 설명(측정 조건·다른 원인 후보) */
  more: T[];
  /** 계산해 보여 줄 값(예: %, 강하 %, 예상 저항) */
  values?: { k: T; v: string }[];
}

export const LEVEL_NAME: Record<Level, T> = {
  ok: { ko: "문제 없음(이 측정 범위)", en: "No issue found (in this measurement)" },
  warn: { ko: "볼 것", en: "Worth a look" },
  fault: { ko: "문제 있음", en: "Problem" },
};

export const ITEMS = ["rs485-ohm", "rs485-idle", "rs485-cm", "loop-ma", "supply-24v", "sensor-out", "rs232-tx", "ground-diff"] as const;
export type ItemId = (typeof ITEMS)[number];

const t = (ko: string, en: string): T => ({ ko, en });

/** 항목 이름(화면 제목·도우미 링크 이름) */
export const ITEM_NAME: Record<ItemId, T> = {
  "rs485-ohm": t("RS-485 A–B 저항(전원 끔)", "RS-485 A–B resistance (power off)"),
  "rs485-idle": t("RS-485 쉬는 상태 A–B 전압(바이어스)", "RS-485 idle A–B voltage (bias)"),
  "rs485-cm": t("RS-485 A·B 와 SG 사이 전압(공통 모드)", "RS-485 A/B to SG voltage (common mode)"),
  "loop-ma": t("4-20mA 루프 전류", "4–20 mA loop current"),
  "supply-24v": t("24 V 전원 — 부하 켠 채 장비 쪽 전압", "24 V supply — voltage at the device under load"),
  "sensor-out": t("NPN/PNP 센서 출력 전압", "NPN/PNP sensor output voltage"),
  "rs232-tx": t("RS-232 TX 쉬는 전압", "RS-232 TX idle voltage"),
  "ground-diff": t("접지 사이 전위차", "Ground-to-ground voltage"),
};

/** 보기 좋게 — 소수 digits 자리까지, 끝 0 지움 */
export function fmt(v: number, digits = 2) {
  if (!Number.isFinite(v)) return v > 0 ? "∞" : "";
  const s = v.toFixed(digits);
  const r = s.includes(".") ? s.replace(/\.?0+$/, "") : s;
  return r === "-0" ? "0" : r;
}

/** 입력 글자 → 숫자. «OL»·«∞»(멀티미터 범위 초과)는 Infinity, k·M 접미사·끝의 Ω, 쉼표 소수점, 유니코드 빼기 허용. 빈칸은 NaN */
export function parseReading(s: string): number {
  const x = s.trim().replace(/,/g, ".").replace(/[−–]/g, "-").replace(/\s+/g, "").replace(/(Ω|ohms?)$/i, "");
  if (x === "") return NaN;
  if (/^(o\.?l\.?|∞|inf)$/i.test(x)) return Infinity;
  const m = /^(-?\d*\.?\d+)([kKM]?)$/.exec(x);
  if (!m) return NaN;
  const n = Number(m[1]);
  const mul = m[2] === "k" || m[2] === "K" ? 1e3 : m[2] === "M" ? 1e6 : 1;
  return n * mul;
}

const bad = (): Verdict => ({ level: "warn", msg: t("숫자를 넣어 주세요.", "Enter a number."), more: [] });

// ---------------------------------------------------------------- RS-485 전원 끈 상태 A–B 저항

/** 수신기 입력 하나(단위 부하)의 입력 저항 Ω — 1/2·1/4·1/8 단위 부하 장비는 2·4·8배 */
export const UNIT_LOAD = 12000;

const par = (...rs: number[]) => {
  const g = rs.filter((r) => Number.isFinite(r) && r > 0).reduce((s, r) => s + 1 / r, 0);
  return g === 0 ? Infinity : 1 / g;
};

export interface OhmInput {
  /** 잰 값 Ω */
  ohm: number;
  /** 버스의 트랜시버 수(변환기 포함) */
  nodes: number;
  /** 종단 저항 하나 Ω (120 또는 150). RC_TERM(음수) = 1 nF + 120 Ω 직렬(RC) 종단 — 직류로는 보이지 않는다 */
  rTerm: number;
  /** 바이어스 저항 하나 Ω (0 = 없음). 전원이 꺼지면 풀업·풀다운이 전원 회로를 거쳐 A–B 사이에 직렬로 보일 수 있다 */
  rBias: number;
}

/** 종단 k개일 때 전원 끈 A–B 에서 보일 저항(대략) — 종단 ∥ 단위 부하 n개 ∥ 바이어스 두 개 직렬 */
export function expectedOhm(k: number, x: Omit<OhmInput, "ohm">) {
  return par(k > 0 ? x.rTerm / k : Infinity, x.nodes > 0 ? UNIT_LOAD / x.nodes : Infinity, x.rBias > 0 ? 2 * x.rBias : Infinity);
}

/** «종단 저항» 칸의 RC 종단(1 nF + 120 Ω 직렬, Modbus V1.02 §3.4.5) 값 */
export const RC_TERM = -1;

const RC_NOTE = t(
  "RC 종단(1 nF + 120 Ω 직렬 — Modbus 규격이 바이어스와 함께 쓸 때 권하는 방식)은 콘덴서가 직류를 막아 멀티미터 저항(직류)으로는 보이지 않습니다. 그런 버스는 종단이 있어도 «종단 없음» 값으로 읽히니, «종단 저항» 칸에서 RC 를 고르거나 끝 장비의 종단 스위치·부품을 눈으로 볼 것.",
  "RC termination (1 nF + 120 Ω in series — the form the Modbus spec recommends with biasing) blocks DC with its capacitor, so a multimeter's resistance (DC) range cannot see it. Such a bus reads like «no termination» even when terminated — choose RC in the «Terminator» field, or look at the end devices' termination switches and parts.",
);

export function rs485Ohm(x: OhmInput): Verdict {
  if (!(x.ohm >= 0)) return bad();
  const nodes = Number.isFinite(x.nodes) && x.nodes >= 1 ? Math.round(x.nodes) : 2;
  const rc = x.rTerm < 0;
  const rTerm = x.rTerm > 0 ? x.rTerm : 120;
  const rBias = x.rBias > 0 ? x.rBias : 0;
  const cfg = { nodes, rTerm, rBias };
  if (rc) return rs485OhmRc(x.ohm, cfg);
  const exp = [0, 1, 2, 3].map((k) => expectedOhm(k, cfg));
  const values = [
    { k: t("양 끝 종단(2개)일 때 예상", "Expected with both ends terminated (2)"), v: `≈ ${fmt(exp[2], 0)} Ω` },
    { k: t("한쪽만(1개)", "One end only (1)"), v: `≈ ${fmt(exp[1], 0)} Ω` },
    { k: t("종단 없음", "No termination"), v: Number.isFinite(exp[0]) ? `≈ ${fmt(exp[0], 0)} Ω` : "OL" },
  ];
  const more = [
    t(
      `예상값은 트랜시버 ${nodes}개를 단위 부하(12 kΩ)로, 바이어스 저항을 전원 회로를 거쳐 직렬로 보이는 것으로 어림한 값입니다. 1/8 단위 부하 장비가 많으면 실제 값은 조금 더 큽니다.`,
      `Expected values assume ${nodes} transceivers at one unit load (12 kΩ) each and the bias resistors appearing in series through the powered-off supply. With many 1/8-unit-load devices the real value is a little higher.`,
    ),
  ];
  if (x.ohm < 5)
    return {
      level: "fault",
      msg: t("거의 0 Ω — A 와 B 가 붙어 있습니다(단락).", "Close to 0 Ω — A and B are shorted together."),
      more: [t("단자대의 잔선, 눌린 케이블, 손상된 트랜시버를 볼 것. 장비를 하나씩 떼며 다시 재면 어디인지 좁혀집니다.", "Look for stray strands at terminals, crushed cable or a damaged transceiver. Re-measure while removing devices one by one to narrow it down."), ...more],
      values,
    };
  // 잰 값과 가장 가까운(로그 비) 종단 개수
  const dist = exp.map((e) => (Number.isFinite(e) && Number.isFinite(x.ohm) ? Math.abs(Math.log(x.ohm / e)) : e === x.ohm ? 0 : Infinity));
  if (!Number.isFinite(x.ohm)) dist[0] = 0;
  const k = dist.indexOf(Math.min(...dist));
  if (k === 2)
    return {
      level: "ok",
      msg: t(`양 끝 두 곳에 종단이 있는 값(≈ ${fmt(exp[2], 0)} Ω)에 가깝습니다.`, `Close to the value for termination at both ends (≈ ${fmt(exp[2], 0)} Ω).`),
      more: [t("종단은 버스의 물리적 양 끝 장비에만 둡니다 — 이 값만으로 «어느 장비에» 있는지는 알 수 없습니다.", "Termination belongs only at the two physical ends — this reading alone does not tell which devices have it."), ...more],
      values,
    };
  if (k === 1)
    return {
      level: "warn",
      msg: t(`종단이 한 곳에만 있는 값(≈ ${fmt(exp[1], 0)} Ω)에 가깝습니다.`, `Close to the value for termination at one end only (≈ ${fmt(exp[1], 0)} Ω).`),
      more: [t("규격은 양 끝 두 곳입니다. 짧고 느린(9600 bps 이하, 수십 m) 선은 이대로도 동작하기도 하지만, 길거나 빠르면 반사로 바이트가 깨질 수 있습니다. 반대쪽 끝 장비의 종단 스위치나 120 Ω 를 볼 것.", "The standard is both ends. Short, slow lines (≤ 9600 bps, tens of metres) often work like this, but long or fast lines can garble bytes from reflections. Check the termination switch or 120 Ω at the other end."), ...more],
      values,
    };
  if (k === 0)
    return {
      level: "warn",
      msg: t("종단이 없는 값에 가깝습니다(수백 Ω~수 kΩ 이상).", "Close to the value with no termination (hundreds of Ω to several kΩ or more)."),
      more: [
        t("양 끝의 종단 스위치가 꺼져 있거나 120 Ω 가 빠졌을 수 있습니다. 장비 안 종단이 «전원 켤 때만» 붙는 제품도 있어, 전원 끈 상태에선 이렇게 보일 수 있습니다.", "The termination switches at both ends may be off or the 120 Ω missing. Some devices only switch in internal termination when powered, so it can read like this with power off."),
        t("A–B 사이에서 OL(범위 초과)이 나오면 선이 중간에 끊겼을 수도 있습니다 — 끝 장비 단자에서 다시 재 볼 것.", "OL between A and B can also mean the line is broken part-way — measure again at the end device's terminals."),
        RC_NOTE,
        ...more,
      ],
      values,
    };
  return {
    level: "fault",
    msg: t(`종단이 셋 이상 있는 값(≈ ${fmt(exp[3], 0)} Ω 이하)입니다.`, `Reads like three or more terminations (≈ ${fmt(exp[3], 0)} Ω or less).`),
    more: [
      t("중간 장비의 종단 스위치가 켜져 있거나, 변환기·장비 안 종단이 겹쳤을 수 있습니다. 종단이 많으면 신호가 작아지고 바이어스가 모자라 응답이 빠지거나 깨집니다.", "A middle device may have its termination switch on, or adapter and device terminations overlap. Too many terminations shrink the signal and starve the bias, causing missing or garbled replies."),
      t("장비 수가 아주 많거나(수십 대) 바이어스 저항이 작은 경우에도 이 값 가까이 내려갑니다 — 장비 수·바이어스 칸을 실제와 맞춰 볼 것.", "Very many devices (dozens) or small bias resistors also pull it down this far — make sure the device count and bias fields match the real bus."),
      ...more,
    ],
    values,
  };
}

/** RC 종단 버스: 직류로는 종단이 안 보이므로 «저항 종단이 섞였나» 만 본다 */
function rs485OhmRc(ohm: number, cfg: { nodes: number; rTerm: number; rBias: number }): Verdict {
  const none = expectedOhm(0, cfg);
  const one = expectedOhm(1, { ...cfg, rTerm: 120 });
  const values = [
    { k: t("RC 종단만일 때 예상(직류)", "Expected with RC termination only (DC)"), v: Number.isFinite(none) ? `≈ ${fmt(none, 0)} Ω` : "OL" },
    { k: t("120 Ω 저항 종단 하나가 섞이면", "If one 120 Ω resistor termination is mixed in"), v: `≈ ${fmt(one, 0)} Ω` },
  ];
  const more = [RC_NOTE];
  if (ohm < 5)
    return {
      level: "fault",
      msg: t("거의 0 Ω — A 와 B 가 붙어 있습니다(단락).", "Close to 0 Ω — A and B are shorted together."),
      more: [t("단자대의 잔선, 눌린 케이블, 손상된 트랜시버를 볼 것. 장비를 하나씩 떼며 다시 재면 어디인지 좁혀집니다.", "Look for stray strands at terminals, crushed cable or a damaged transceiver. Re-measure while removing devices one by one to narrow it down."), ...more],
      values,
    };
  const d = (e: number) => (Number.isFinite(e) && Number.isFinite(ohm) ? Math.abs(Math.log(ohm / e)) : e === ohm ? 0 : Infinity);
  if (!Number.isFinite(ohm) || d(none) <= d(one))
    return {
      level: "ok",
      msg: t(
        "RC 종단만 있는 버스의 직류 값에 가깝습니다 — 저항 종단이 섞인 흔적은 없습니다(이 측정 범위).",
        "Close to the DC value of a bus with RC termination only — no sign of a resistor termination mixed in (in this measurement).",
      ),
      more: [
        t("RC 종단 자체는 직류로 확인할 수 없습니다 — 양 끝 장비에 실제로 있는지는 종단 스위치·부품으로 볼 것.", "RC termination itself cannot be confirmed with DC — check the switch or parts at both end devices."),
        t("OL(범위 초과)이면 선이 중간에 끊겼을 수도 있습니다 — 끝 장비 단자에서 다시 재 볼 것.", "OL can also mean the line is broken part-way — measure again at the end device's terminals."),
        ...more,
      ],
      values,
    };
  return {
    level: "warn",
    msg: t(`RC 종단 버스인데 저항 종단(≈ ${fmt(one, 0)} Ω 이하)이 보입니다.`, `An RC-terminated bus, but a resistor termination shows (≈ ${fmt(one, 0)} Ω or less).`),
    more: [
      t("어느 장비·변환기의 120 Ω 종단 스위치가 켜져 있거나 저항 종단이 섞였을 수 있습니다. 끝이 아닌 장비라면 끌 것.", "A device or adapter may have its 120 Ω termination switch on, or a resistor termination is mixed in. Turn it off if it is not at an end."),
      ...more,
    ],
    values,
  };
}

// ---------------------------------------------------------------- RS-485 쉬는 상태 차동 전압

/** vBA: 빨강 프로브를 B(D1·+), 검정을 A(D0·−) 에 대고 잰 V. 전원 켜고 아무도 보내지 않을 때 */
export function rs485Idle(vBA: number): Verdict {
  if (!Number.isFinite(vBA)) return bad();
  const values = [{ k: t("B − A", "B − A"), v: `${fmt(vBA * 1000, 0)} mV` }];
  const quiet = t("잴 때는 폴링을 멈춰야 합니다 — 누가 보내는 중이면 값이 흔들립니다.", "Stop polling while measuring — if anyone is transmitting, the reading jumps around.");
  if (vBA >= 0.2)
    return {
      level: "ok",
      msg: t("+200 mV 이상 — 쉬는 동안 수신기가 «1»(마크)로 정해진 상태입니다.", "+200 mV or more — receivers see a defined «1» (mark) while the bus is idle."),
      more: [quiet],
      values,
    };
  if (vBA > -0.2)
    return {
      level: "warn",
      msg: t("±200 mV 안 — 쉬는 동안 수신기 상태가 정해지지 않습니다.", "Within ±200 mV — receivers have no defined state while the bus is idle."),
      more: [
        t("바이어스(페일세이프) 저항이 없거나, 종단(60 Ω)에 비해 바이어스 저항이 너무 큽니다. 첫 바이트가 깨지거나 잡음이 바이트로 읽힐 수 있습니다.", "Bias (fail-safe) resistors are missing, or too large for the 60 Ω termination. The first byte may be garbled or noise read as bytes."),
        t("요즘 트랜시버 중엔 0 V 에서도 «1» 로 읽는 페일세이프 수신기가 있어 그대로 동작하기도 합니다. RS-485 계산기로 바이어스 값을 정해 볼 것.", "Many newer transceivers have fail-safe receivers that read 0 V as «1», so it may still work. Use the RS-485 calculator to size bias resistors."),
        quiet,
      ],
      values,
    };
  return {
    level: "fault",
    msg: t("−200 mV 이하 — 쉬는 상태가 거꾸로(«0») 보입니다.", "−200 mV or lower — the idle state reads inverted («0»)."),
    more: [
      t("프로브를 바꿔 댔는지 먼저 볼 것(빨강 = B·D1·+). 맞다면 바이어스 쪽 A/B 가 바뀌었거나, 어떤 장비가 송신을 멈추지 않고 있을 수 있습니다.", "First check the probes (red = B · D1 · +). If they are right, the A/B at the bias side may be swapped, or a device is stuck transmitting."),
      t("제조사마다 A/B 의 +·− 표기가 반대인 경우가 있습니다 — 응답이 없으면 두 선을 바꿔 보는 것도 방법입니다(바꿔도 장비는 상하지 않음).", "Some vendors label A and B the other way round — if nothing replies, swapping the two wires is a valid test (it does not damage devices)."),
      quiet,
    ],
    values,
  };
}

// ---------------------------------------------------------------- RS-485 공통 모드 전압

export const CM_MIN = -7;
export const CM_MAX = 12;

/** vA·vB: A·B 각각을 SG(공통·0 V)에 대고 잰 V. 한쪽만 넣어도 된다 */
export function rs485CommonMode(vA: number, vB: number): Verdict {
  const vs = [vA, vB].filter(Number.isFinite);
  if (vs.length === 0) return bad();
  const values: Verdict["values"] = [];
  if (Number.isFinite(vA)) values.push({ k: t("A − SG", "A − SG"), v: `${fmt(vA)} V` });
  if (Number.isFinite(vB)) values.push({ k: t("B − SG", "B − SG"), v: `${fmt(vB)} V` });
  if (vs.length === 2) values.push({ k: t("공통 모드 (A+B)/2", "Common mode (A+B)/2"), v: `${fmt((vA + vB) / 2)} V` });
  const out = vs.some((v) => v < CM_MIN || v > CM_MAX);
  if (out)
    return {
      level: "fault",
      msg: t("−7~+12 V 범위 밖 — 수신기가 제대로 받지 못하거나 상할 수 있습니다.", "Outside −7 to +12 V — receivers may not decode correctly or may be damaged."),
      more: [
        t("SG(공통) 선이 이어지지 않아 장비끼리 접지 전위가 다르거나, 24 V 같은 다른 전원이 통신선에 닿았을 수 있습니다. 접지 간 전위차도 재 볼 것.", "The SG (common) wire may be missing so device grounds sit at different potentials, or another supply such as 24 V touches the line. Measure the ground-to-ground difference too."),
        t("멀리 떨어진 장비 사이는 절연형 변환기·리피터가 흔한 대책입니다.", "Between distant devices, an isolated adapter or repeater is the usual remedy."),
      ],
      values,
    };
  const near = vs.some((v) => v < CM_MIN + 2 || v > CM_MAX - 2);
  if (near)
    return {
      level: "warn",
      msg: t("범위(−7~+12 V) 안이지만 끝에 가깝습니다.", "Inside −7 to +12 V but close to the edge."),
      more: [t("보통은 0~5 V 사이에 있습니다. 모터가 돌 때 더 벗어날 수 있으니 그때 다시 재 볼 것. SG 선 연결을 볼 것.", "It usually sits between 0 and 5 V. Re-measure while motors run, when it can drift further. Check the SG wire.")],
      values,
    };
  return {
    level: "ok",
    msg: t("공통 모드 범위(−7~+12 V) 안입니다.", "Within the common-mode range (−7 to +12 V)."),
    more: [t("SG 가 이어지지 않으면 값이 떠서 흔들리거나 재는 순간마다 달라집니다 — 그럴 땐 SG 연결부터 볼 것.", "Without an SG connection the reading floats and changes between measurements — check the SG wire first in that case.")],
    values,
  };
}

// ---------------------------------------------------------------- 4–20 mA 루프 전류

export const NE43 = { failLow: 3.6, measLow: 3.8, measHigh: 20.5, failHigh: 21 };
const EPS = 1e-9;

/** 4–20 mA 의 % (4 mA = 0 %, 20 mA = 100 %) */
export const loopPercent = (mA: number) => ((mA - 4) / 16) * 100;

export function loopCurrent(mA: number): Verdict {
  if (!Number.isFinite(mA)) return bad();
  const values = [{ k: t("범위의 %", "Percent of span"), v: `${fmt(loopPercent(mA), 1)} %` }];
  const series = t("mA 는 루프를 끊고 멀티미터를 직렬로 넣어 잽니다. 수신 저항(예: 250 Ω) 양단 전압 ÷ 저항으로 구해도 됩니다.", "Measure mA by breaking the loop and putting the meter in series, or divide the voltage across the receiver resistor (e.g. 250 Ω) by its value.");
  if (Math.abs(mA) < 0.1)
    return {
      level: "fault",
      msg: t("전류가 흐르지 않습니다 — 루프가 끊겼거나 전원이 없습니다.", "No current — the loop is open or has no supply."),
      more: [t("2선식이면 극성 반대·퓨즈·단자 풀림·루프 전원 꺼짐을 볼 것. 4선식(전원 별도)을 2선식처럼 이었을 수도 있습니다.", "For 2-wire, check reversed polarity, fuses, loose terminals and the loop supply. A 4-wire (separately powered) device may be wired like a 2-wire one."), series],
      values,
    };
  if (mA < 0)
    return {
      level: "fault",
      msg: t("음수 — 프로브가 반대이거나 전류가 거꾸로 흐릅니다.", "Negative — the probes are reversed or current flows the wrong way."),
      more: [series],
      values,
    };
  if (mA <= NE43.failLow + EPS)
    return {
      level: "fault",
      msg: t("3.6 mA 이하 — NE 43 의 아래쪽 고장 신호 범위입니다.", "3.6 mA or less — the NE 43 low failure-signal range."),
      more: [t("트랜스미터가 센서 고장(센서선 끊김 등)을 알리고 있거나, 루프 전압이 모자라 전류를 내지 못할 수 있습니다. 트랜스미터 표시·진단 코드를 볼 것.", "The transmitter may be signalling a sensor fault (broken sensor wire etc.), or the loop voltage is too low for it to drive current. Check the transmitter display or diagnostics."), series],
      values,
    };
  if (mA < NE43.measLow - EPS)
    return {
      level: "warn",
      msg: t("3.6~3.8 mA — 측정 범위(3.8~20.5 mA)도 고장 신호도 아닌 구간입니다.", "3.6–3.8 mA — neither the measurement range (3.8–20.5 mA) nor a failure signal."),
      more: [t("트랜스미터의 고장 신호 설정값을 매뉴얼에서 볼 것(제품에 따라 3.6 mA 대신 다른 값을 쓰기도 함).", "Check the failure-signal setting in the transmitter manual (some products use values other than 3.6 mA)."), series],
      values,
    };
  if (mA < 4 - EPS)
    return {
      level: "warn",
      msg: t("4 mA 아래 — 범위 아래쪽이지만 NE 43 측정 범위(3.8 mA 까지) 안입니다.", "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)."),
      more: [t("공정값이 범위 하한보다 낮거나 영점이 어긋났을 수 있습니다.", "The process value may be below the range or the zero may be off."), series],
      values,
    };
  if (mA <= 20 + EPS)
    return { level: "ok", msg: t("4~20 mA 범위 안입니다.", "Within 4–20 mA."), more: [t("값이 PLC·표시기와 다르면 스케일(범위 설정)과 입력 종류(전류/전압)를 볼 것.", "If the PLC or display shows something else, check the scaling (range) and input type (current/voltage)."), series], values };
  if (mA <= NE43.measHigh + EPS)
    return {
      level: "warn",
      msg: t("20 mA 위 — 범위 위쪽이지만 NE 43 측정 범위(20.5 mA 까지) 안입니다.", "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)."),
      more: [t("공정값이 범위 상한을 넘었거나 스팬이 어긋났을 수 있습니다.", "The process value may exceed the range or the span may be off."), series],
      values,
    };
  if (mA < NE43.failHigh - EPS)
    return {
      level: "warn",
      msg: t("20.5~21 mA — 측정 범위도 고장 신호도 아닌 구간입니다.", "20.5–21 mA — neither the measurement range nor a failure signal."),
      more: [series],
      values,
    };
  return {
    level: "fault",
    msg: t("21 mA 이상 — NE 43 의 위쪽 고장 신호 범위입니다.", "21 mA or more — the NE 43 high failure-signal range."),
    more: [
      t("트랜스미터가 고장을 알리고 있을 수 있습니다(고장 시 «위로» 설정)." + (mA > 25 ? " 25 mA 를 크게 넘으면 트랜스미터를 거치지 않고 전원이 바로 이어진(단락) 배선도 의심할 것." : ""), "The transmitter may be signalling a fault (failure set to «upscale»)." + (mA > 25 ? " Well above 25 mA, also suspect wiring where the supply bypasses the transmitter (a short)." : "")),
      series,
    ],
    values,
  };
}

// ---------------------------------------------------------------- 24 V 전원 부하 시 전압

export function supplyUnderLoad(nominal: number, measured: number): Verdict {
  if (!(nominal > 0) || !Number.isFinite(measured)) return bad();
  const drop = ((nominal - measured) / nominal) * 100;
  const values = [
    { k: t("강하", "Drop"), v: `${fmt(nominal - measured)} V (${fmt(drop, 1)} %)` },
    { k: t("허용 범위(−15 %~+20 %)", "Allowed range (−15 % to +20 %)"), v: `${fmt(nominal * 0.85)}~${fmt(nominal * 1.2)} V` },
  ];
  const how = t("부하(밸브·릴레이·모터 브레이크 등)를 켠 채로, 전원 장치가 아니라 장비 단자에서 잽니다.", "Measure at the device terminals, not at the power supply, with the load (valves, relays, brakes …) switched on.");
  if (measured > nominal * 1.2 + EPS)
    return { level: "fault", msg: t("정격보다 20 % 넘게 높습니다.", "More than 20 % above nominal."), more: [t("전원 장치의 전압 조정(ADJ)·정격을 볼 것.", "Check the supply's voltage adjustment (ADJ) and rating."), how], values };
  if (drop <= 5 + EPS) return { level: "ok", msg: t("강하가 5 % 이하입니다.", "Drop is 5 % or less."), more: [how], values };
  if (drop <= 15 + EPS)
    return {
      level: "warn",
      msg: t("강하가 5~15 % — 허용 범위 안이지만 여유가 줄었습니다.", "5–15 % drop — still within the allowed range but with less margin."),
      more: [t("전선이 길거나 가늘거나, 단자 접촉 저항이 있을 수 있습니다. 부하가 한꺼번에 켜질 때 더 떨어지는지 볼 것.", "The wire may be long or thin, or a terminal may have contact resistance. Check whether it drops further when loads switch on together."), how],
      values,
    };
  return {
    level: "fault",
    msg: t("강하가 15 % 넘음 — 일반적인 24 V DC 장비의 허용 하한(20.4 V) 아래입니다.", "Drop over 15 % — below the usual lower limit for 24 V DC equipment (20.4 V)."),
    more: [t("전선 굵기·길이, 전원 용량(돌입 전류 포함), 단자 풀림을 볼 것. 전압 강하 계산기로 굵기를 다시 정해 볼 것.", "Check wire size and length, supply capacity (including inrush) and loose terminals. Re-size the wire with the voltage drop calculator."), how],
    values,
  };
}

// ---------------------------------------------------------------- NPN/PNP 센서 출력 전압

export type SensorType = "npn" | "pnp";
export type SensorState = "on" | "off";

/** IEC 61131-2 24 V DC 입력 문턱 */
export const IN_ON_T1 = 15;
export const IN_ON_T23 = 11;
export const IN_OFF = 5;

/**
 * vOut: 센서 출력선(보통 검정)과 0 V(파랑) 사이 V, PLC 입력에 이은 채로. supply: 센서 전원(갈색–파랑) V.
 * PLC 입력에 걸리는 전압 = NPN 이면 전원 − 출력, PNP 이면 출력.
 */
export function sensorOutput(type: SensorType, state: SensorState, vOut: number, supply = 24): Verdict {
  if (!Number.isFinite(vOut) || !(supply > 0)) return bad();
  const vIn = type === "npn" ? supply - vOut : vOut;
  const values = [{ k: t("PLC 입력에 걸리는 전압(어림)", "Voltage across the PLC input (approx.)"), v: `${fmt(vIn, 1)} V` }];
  const more: T[] = [];
  if (vOut < -0.5 || vOut > supply + 1)
    more.push(t("검정 프로브를 센서 0 V(파랑)에, 빨강을 출력선(검정)에 댔는지 볼 것.", "Check the black probe is on the sensor 0 V (blue) and the red on the output (black)."));
  if (type === "npn")
    more.push(t("NPN 은 켜지면 출력이 0 V 쪽으로 내려갑니다. PLC 입력 COM 이 +24 V 여야 하고, 출력선을 PLC 에서 뗀 채 재면 꺼짐일 때 값이 떠서 0 V 처럼 보일 수 있습니다.", "NPN pulls the output towards 0 V when on. The PLC input COM must be +24 V; measured with the output disconnected from the PLC, the off state floats and can read like 0 V."));
  else more.push(t("PNP 는 켜지면 출력이 전원(+24 V) 쪽으로 올라갑니다. PLC 입력 COM 이 0 V 여야 합니다.", "PNP pulls the output up to the supply (+24 V) when on. The PLC input COM must be 0 V."));
  if (Math.abs(supply - 24) > 4)
    more.push(t("문턱(15 V·11 V·5 V)은 24 V DC 입력 기준입니다 — 다른 전압이면 입력 카드 매뉴얼의 값을 볼 것.", "Thresholds (15 V, 11 V, 5 V) are for 24 V DC inputs — for other voltages use the input card manual."));
  if (state === "on") {
    if (vIn > 30 + EPS)
      return { level: "warn", msg: t("30 V 넘음 — 24 V DC 입력의 켜짐 범위(15~30 V)를 넘습니다. 전원 전압을 볼 것.", "Above 30 V — beyond the ON range of a 24 V DC input (15–30 V). Check the supply voltage."), more, values };
    if (vIn >= IN_ON_T1 - EPS) return { level: "ok", msg: t("켜짐으로 읽힐 전압입니다(입력 형식 1·2·3 모두 15 V 이상이면 켜짐).", "A voltage read as ON (15 V or more is ON for input types 1, 2 and 3)."), more, values };
    if (vIn >= IN_ON_T23 - EPS)
      return {
        level: "warn",
        msg: t("11~15 V — 형식 2·3 입력은 켜짐, 형식 1 입력은 정해지지 않은 구간입니다.", "11–15 V — ON for type 2/3 inputs, undefined for type 1 inputs."),
        more: [t("센서 잔류 전압이 크거나 전원이 떨어졌을 수 있습니다. 센서 전원(갈색–파랑)도 재 볼 것.", "The sensor's residual voltage may be high or the supply low. Measure the sensor supply (brown–blue) too."), ...more],
        values,
      };
    if (vIn > IN_OFF + EPS)
      return { level: "fault", msg: t("5~11 V — 켜짐도 꺼짐도 아닌 구간입니다.", "5–11 V — neither ON nor OFF."), more: [t("입력 COM 연결, 센서 출력 전류(입력 카드가 필요한 전류), 전원 강하를 볼 것.", "Check the input COM, the sensor's output current versus what the input needs, and supply drop."), ...more], values };
    return {
      level: "fault",
      msg: t("센서는 켜졌는데 PLC 입력엔 거의 전압이 없습니다(꺼짐으로 읽힘).", "The sensor is on but the PLC input sees almost no voltage (reads OFF)."),
      more: [t("NPN/PNP 종류와 입력 COM 극성이 반대이거나, 출력선이 다른 입력 번호·끊긴 곳에 있을 수 있습니다.", "The NPN/PNP type and input COM polarity may be mismatched, or the output wire goes to another input or is broken."), ...more],
      values,
    };
  }
  if (vIn <= IN_OFF + EPS) return { level: "ok", msg: t("꺼짐으로 읽힐 전압입니다(5 V 이하).", "A voltage read as OFF (5 V or less)."), more, values };
  if (vIn < IN_ON_T23 - EPS)
    return {
      level: "warn",
      msg: t("5~11 V — 꺼져야 할 때 정해지지 않은 구간입니다.", "5–11 V — undefined while it should be OFF."),
      more: [t("2선식 센서의 누설 전류, 길게 같이 깐 선의 유도 전압일 수 있습니다. 입력에 블리더 저항을 다는 방법이 매뉴얼에 있는지 볼 것.", "Could be leakage from a 2-wire sensor or induced voltage on long parallel wiring. See whether the manual suggests a bleeder resistor across the input."), ...more],
      values,
    };
  return {
    level: "fault",
    msg: t("센서는 꺼졌는데 PLC 입력엔 켜짐 전압이 걸립니다.", "The sensor is off but the PLC input sees an ON voltage."),
    more: [t("출력 단락(출력선이 +24 V 또는 0 V 에 닿음), NPN/PNP 반대, 센서 출력 모드(NO/NC·Light-ON/Dark-ON)를 볼 것.", "Check for a shorted output (touching +24 V or 0 V), swapped NPN/PNP, and the sensor output mode (NO/NC, light-on/dark-on)."), ...more],
    values,
  };
}

// ---------------------------------------------------------------- RS-232 TX 쉬는 전압

/** v: TXD 와 GND 사이 V(PC·DTE 의 DB9 이면 3번–5번), 아무것도 보내지 않을 때 */
export function rs232TxIdle(v: number): Verdict {
  if (!Number.isFinite(v)) return bad();
  const pin = t("PC(DTE) DB9 는 3번이 TXD, 5번이 GND 입니다. 장비(DCE)는 2번이 TXD 인 경우가 많습니다.", "On a PC (DTE) DB9, pin 3 is TXD and pin 5 GND. On a device (DCE), TXD is often pin 2.");
  if (Math.abs(v) > 25)
    return { level: "fault", msg: t("±25 V 를 넘습니다 — RS-232 최대값 밖입니다.", "Beyond ±25 V — outside the RS-232 maximum."), more: [t("측정 범위·프로브 위치를 볼 것. RS-232 핀이 아닌 전원 핀일 수 있습니다.", "Check the meter range and probe position — it may be a supply pin, not RS-232."), pin] };
  if (v < -15) return { level: "warn", msg: t("−15 V 보다 낮음 — 규격 출력(−5~−15 V)보다 크지만 ±25 V 안입니다.", "Below −15 V — beyond the normal output (−5 to −15 V) but within ±25 V."), more: [pin] };
  if (v <= -5) return { level: "ok", msg: t("−5~−15 V — 쉬는 상태(마크)의 RS-232 송신 전압입니다.", "−5 to −15 V — an RS-232 transmitter at idle (mark)."), more: [pin] };
  if (v <= -3)
    return {
      level: "warn",
      msg: t("−3~−5 V — 수신 문턱(−3 V)은 넘지만 송신 규격(−5 V)보다 작습니다.", "−3 to −5 V — past the receive threshold (−3 V) but below the transmit spec (−5 V)."),
      more: [t("전원이 약한 변환기·노트북 포트에서 흔합니다. 선이 길면 받는 쪽에서 문턱을 못 넘을 수 있습니다.", "Common on weakly powered adapters and laptop ports. With long cables the far end may not see enough voltage."), pin],
    };
  if (v < 3)
    return {
      level: "fault",
      msg: t("−3~+3 V — RS-232 로 정해지지 않은 전압입니다.", "−3 to +3 V — not a defined RS-232 level."),
      more: [t("TXD 핀이 아니거나(2번·3번 확인), 송신 회로가 꺼졌거나 고장일 수 있습니다. 일부 변환기는 포트를 열어야 송신 전압을 냅니다 — 터미널 프로그램으로 포트를 연 채 다시 재 볼 것.", "It may not be the TXD pin (check 2 vs 3), or the driver is off or faulty. Some adapters only drive TX once the port is open — re-measure with a terminal program holding the port open."), pin],
    };
  if (v <= 5.5)
    return {
      level: "fault",
      msg: t("+3~+5.5 V — RS-232 가 아니라 TTL(3.3·5 V) 레벨 UART 로 보입니다.", "+3 to +5.5 V — looks like a TTL (3.3/5 V) UART rather than RS-232."),
      more: [t("TTL 은 쉬는 상태가 + 쪽입니다. RS-232 포트에 바로 이으면 통신이 안 되고 장비가 상할 수 있습니다 — TTL 용 USB 변환기(3.3 V/5 V)를 쓸 것.", "TTL idles high. Wiring it straight to an RS-232 port does not work and can damage the device — use a TTL USB adapter (3.3 V/5 V)."), pin],
    };
  return {
    level: "fault",
    msg: t("+ 전압 — TXD 가 쉬는 상태(−)가 아닙니다.", "Positive voltage — TXD is not at idle (negative)."),
    more: [t("브레이크(연속 0)를 보내는 중이거나, 잰 핀이 RTS(7번)·DTR(4번)처럼 켜지면 + 가 되는 신호선일 수 있습니다.", "A break (continuous 0) may be in progress, or the pin is a control line such as RTS (7) or DTR (4) that goes positive when asserted."), pin],
  };
}

// ---------------------------------------------------------------- 접지 간 전위차

/** v: 두 접지(예: PC USB 외함·장비 SG/PE) 사이 V — 교류·직류 중 큰 쪽 */
export function groundDiff(v: number): Verdict {
  if (!Number.isFinite(v)) return bad();
  const a = Math.abs(v);
  const how = t("직류(V⎓)와 교류(V~) 둘 다 재서 큰 값을 넣습니다. 장비를 켜고, 모터가 돌 때 다시 재 볼 것.", "Measure both DC (V⎓) and AC (V~) and enter the larger. Repeat with equipment on and motors running.");
  if (a < 1) return { level: "ok", msg: t("1 V 미만 — 일반적으로 통신에 문제를 일으키지 않는 차이입니다.", "Under 1 V — generally not enough to disturb communication."), more: [how] };
  if (a < 7)
    return {
      level: "warn",
      msg: t("1~7 V — RS-485 공통 모드 여유(−7~+12 V)를 갉아먹는 차이입니다.", "1–7 V — eats into the RS-485 common-mode margin (−7 to +12 V)."),
      more: [
        t("비절연 USB 변환기·RS-232 는 이 차이로 신호 접지에 전류가 흘러 끊김·잡음이 생길 수 있습니다. SG 선 연결, 접지를 한 점에 모으는지, 절연형 변환기를 볼 것.", "With non-isolated USB adapters and RS-232, this difference drives current through signal ground, causing drops and noise. Check the SG wire, single-point grounding, and an isolated adapter."),
        how,
      ],
    };
  return {
    level: "fault",
    msg: t("7 V 이상 — 접지끼리 크게 다릅니다.", "7 V or more — the grounds differ a lot."),
    more: [
      t("RS-485 공통 모드 범위를 넘을 수 있고, 통신선·USB 로 큰 전류가 흘러 포트가 상할 수 있습니다. 접지(PE) 연결이 빠졌거나 누설이 있는지 전기 담당자와 볼 것. 그 전에는 절연형 변환기로 이을 것.", "It can exceed the RS-485 common-mode range and push current through comms and USB, damaging ports. Have an electrician check for a missing PE connection or leakage; until then, connect through an isolated adapter."),
      how,
    ],
  };
}

// ---------------------------------------------------------------- 텍스트로

export function verdictText(title: string, input: string, v: Verdict, lang: Lang) {
  const lines = [`${title}: ${input}`, `→ ${LEVEL_NAME[v.level][lang]} — ${v.msg[lang]}`];
  for (const x of v.values ?? []) lines.push(`  ${x.k[lang]}: ${x.v}`);
  for (const m of v.more) lines.push(`  - ${m[lang]}`);
  return lines.join("\n");
}
