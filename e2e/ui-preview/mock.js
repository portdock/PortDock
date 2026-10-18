// 화면 확인용 가짜 백엔드 — 실제 장비·통신 없이 화면을 그리고 눌러 본다.
// 실제 명령·반환 모양은 apps/*/src-tauri/src/lib.rs, 사건 모양은 crates/core/src/event.rs 를 따른다.
// 앱 코드는 가져오지 않는다(데이터만). 시험 도구는 window.__pdMock 으로 상태를 보고 바꾼다.
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
mockWindows("main");

// ---------------------------------------------------------------- 공통
let lang = (() => {
  try {
    return JSON.parse(localStorage.getItem("settings") ?? "{}").lang === "en" ? "en" : "ko";
  } catch {
    return "ko";
  }
})();
const tr = (ko, en) => (lang === "en" ? en : ko);
const now = () => Date.now();
const enc = new TextEncoder();
const ascii = (s) => [...enc.encode(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hex2 = (b) => b.toString(16).toUpperCase().padStart(2, "0");
const fail = (msg) => Promise.reject(msg); // 실제 Tauri 도 오류를 문자열로 돌려준다

// ---- 체크섬·송신 바이트 만들기 (site/src/lib/checksum.ts 를 옮김 — crates/core/src/checksum.rs · codec.rs 와 같은 규칙)
function crc16Modbus(data) {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc & 0xffff;
}
function crc16x1021(data, init) {
  let crc = init;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
function crc8(data) {
  let crc = 0;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
  }
  return crc;
}
const sum = (d) => d.reduce((a, b) => a + b, 0);
/** 범용 CRC(reveng 매개변수) — crates/core/src/checksum.rs CrcParams::compute 와 같은 계산 */
function crcGeneric(p, data) {
  const w = BigInt(p.width);
  const mask = (1n << w) - 1n;
  const top = 1n << (w - 1n);
  const poly = BigInt(p.poly >>> 0);
  const rev8 = (b) => parseInt(b.toString(2).padStart(8, "0").split("").reverse().join(""), 2);
  let crc = BigInt(p.init >>> 0) & mask;
  for (const b0 of data) {
    const b = p.refin ? rev8(b0) : b0;
    crc ^= BigInt(b) << (w - 8n);
    for (let i = 0; i < 8; i++) crc = crc & top ? ((crc << 1n) ^ poly) & mask : (crc << 1n) & mask;
  }
  if (p.refout) crc = BigInt.asUintN(p.width, BigInt("0b" + (crc.toString(2).padStart(p.width, "0").split("").reverse().join("") || "0")));
  const v = Number((crc ^ BigInt(p.xorout >>> 0)) & mask);
  const out = [];
  for (let i = p.width / 8 - 1; i >= 0; i--) out.push(Math.floor(v / 2 ** (8 * i)) & 0xff);
  return out;
}
const CRC32 = { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff };
/** 백엔드 ChecksumKind JSON(문자열 또는 {spec: {algo, skipHead, beforeEnd, swap}}) → { algo, head, tail, swap } */
function ckSpec(kind) {
  if (kind && typeof kind === "object" && kind.spec) {
    const sp = kind.spec;
    return { algo: sp.algo, head: sp.skipHead ?? 0, tail: sp.beforeEnd ?? 0, swap: !!sp.swap };
  }
  return { algo: kind, head: 0, tail: 0, swap: false };
}
const ckName = (kind) => {
  const c = ckSpec(kind);
  const a = typeof c.algo === "object" ? `crc${c.algo.crc.width}` : c.algo;
  return `${a}${c.head ? ` skip ${c.head}` : ""}${c.tail ? ` before-end ${c.tail}` : ""}${c.swap ? " swap" : ""}`;
};
function compute(kind, data) {
  if (kind && typeof kind === "object") {
    const c = ckSpec(kind);
    const out = typeof c.algo === "object" ? crcGeneric(c.algo.crc, data) : compute(c.algo, data);
    return c.swap ? out.reverse() : out;
  }
  switch (kind) {
    case "crc32":
      return crcGeneric(CRC32, data).reverse();
    case "crc16-modbus": {
      const c = crc16Modbus(data);
      return [c & 0xff, c >> 8];
    }
    case "crc16-ccitt":
    case "crc16-xmodem": {
      const c = crc16x1021(data, kind === "crc16-ccitt" ? 0xffff : 0);
      return [c >> 8, c & 0xff];
    }
    case "crc8":
      return [crc8(data)];
    case "lrc":
      return [(0x100 - (sum(data) & 0xff)) & 0xff];
    case "bcc":
      return [data.reduce((a, b) => a ^ b, 0)];
    case "sum8":
      return [sum(data) & 0xff];
    case "sum16": {
      const s = sum(data) & 0xffff;
      return [s >> 8, s & 0xff];
    }
  }
  throw tr(`모르는 체크섬: ${kind}`, `Unknown checksum: ${kind}`);
}
/** 수신 검증 — 끝(끝에서 m 앞)의 바이트가 체크섬과 맞는지(앞 n 은 계산 밖). 짧으면 null */
function verify(kind, bytes) {
  if (!kind) return null;
  const { head, tail } = ckSpec(kind);
  const n = compute(kind, [0]).length;
  if (bytes.length <= head + n + tail) return null;
  const at = bytes.length - tail - n;
  const c = compute(kind, bytes.slice(head, at));
  return c.every((x, i) => x === bytes[at + i]);
}
const withCrc = (b) => [...b, ...compute("crc16-modbus", b)];
function parseHex(text) {
  const out = [];
  for (const token of text.split(/[\s,;-]+/)) {
    const t = token.replace(/^(0x)+/, "").replace(/^(0X)+/, "");
    if (!t) continue;
    const bad = [...t].find((c) => !/[0-9a-fA-F]/.test(c));
    if (bad) throw tr(`HEX 가 아닌 글자: «${bad}»`, `Not a HEX digit: «${bad}»`);
    if (t.length % 2) throw tr(`HEX 자릿수가 홀수입니다: «${token}»`, `Odd number of HEX digits: «${token}»`);
    for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  }
  return out;
}
function parseAscii(text, encoding = "utf-8") {
  const out = [];
  const cs = [...text];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c !== "\\") {
      const cp = c.codePointAt(0);
      // 미리보기 흉내 — Latin-1·ASCII 는 범위 밖이면 오류, CP949 는 UTF-8 로 대신(실제는 encoding_rs)
      if ((encoding === "latin1" && cp > 0xff) || (encoding === "ascii" && cp > 0x7f))
        throw tr(`«${c}» (U+${cp.toString(16).toUpperCase().padStart(4, "0")}) 는 ${encoding === "ascii" ? "ASCII" : "Latin-1"} 로 보낼 수 없습니다 — 인코딩을 바꾸거나 \\xNN 으로 쓰세요`, `«${c}» cannot be sent as ${encoding === "ascii" ? "ASCII" : "Latin-1"}`);
      if (encoding === "latin1" || encoding === "ascii") out.push(cp);
      else out.push(...enc.encode(c));
      continue;
    }
    const n = cs[++i];
    if (n === undefined) out.push(0x5c);
    else if (n === "r") out.push(13);
    else if (n === "n") out.push(10);
    else if (n === "t") out.push(9);
    else if (n === "0") out.push(0);
    else if (n === "\\") out.push(0x5c);
    else if (n === "x") {
      const s = (cs[i + 1] ?? "") + (cs[i + 2] ?? "");
      i += 2;
      if (!/^[0-9a-fA-F]{2}$/.test(s)) throw tr(`잘못된 \\x 이스케이프: «\\x${s}» (HEX 두 자리)`, `Bad \\x escape: «\\x${s}» (two HEX digits)`);
      out.push(parseInt(s, 16));
    } else throw tr(`모르는 이스케이프: «\\${n}»`, `Unknown escape: «\\${n}»`);
  }
  return out;
}
/** codec::build — 본문 + 체크섬(자리 옵션: 앞 n 빼고 계산, 끝 m 앞에 넣기) + 끝 문자. 틀리면 문자열을 던진다 */
function build(spec) {
  const body = spec.mode === "hex" ? parseHex(spec.text ?? "") : parseAscii(spec.text ?? "", spec.encoding);
  let framed = body;
  if (spec.checksum) {
    const { head, tail } = ckSpec(spec.checksum);
    if (head + tail > body.length) throw tr(`체크섬 범위: 본문 ${body.length}바이트에서 앞 ${head}·끝 ${tail}바이트를 뺄 수 없습니다`, `Checksum range: cannot leave out ${head}+${tail} bytes of a ${body.length}-byte body`);
    const at = body.length - tail;
    framed = [...body.slice(0, at), ...compute(spec.checksum, body.slice(head, at)), ...body.slice(at)];
  }
  return [...framed, ...parseAscii(spec.suffix ?? "")];
}
function buildOrFail(spec) {
  let b;
  try {
    b = build(spec);
  } catch (e) {
    return { err: String(e) };
  }
  if (!b.length) return { err: tr("보낼 바이트가 없습니다", "Nothing to send") };
  return { bytes: b };
}

// ---- 사건 줄·프레임
const ev = (note) => ({ ts: now(), dir: "ev", bytes: [], check: null, note });
const data = (dir, bytes, check = null, peer) => (peer ? { ts: now(), dir, bytes, check, peer } : { ts: now(), dir, bytes, check });

// ---- 포트 목록. COM9 는 «사용 중» 시험용, COM7 은 __pdMock.plug() 로 꽂고 뺀다
const PORTS = [
  { name: "COM3", kind: "usb", vid: 0x1a86, pid: 0x7523, serial_number: null, manufacturer: "wch.cn", product: "USB-SERIAL CH340" },
  { name: "COM5", kind: "usb", vid: 0x0403, pid: 0x6001, serial_number: "A10KQ2XZ", manufacturer: "FTDI", product: "USB Serial Port" },
  { name: "COM1", kind: "pci", vid: null, pid: null, serial_number: null, manufacturer: "(표준 포트 유형)", product: "통신 포트" },
  { name: "COM9", kind: "usb", vid: 0x067b, pid: 0x2303, serial_number: null, manufacturer: "Prolific", product: "USB-to-Serial Comm Port" },
];
const COM7 = { name: "COM7", kind: "bluetooth", vid: null, pid: null, serial_number: null, manufacturer: "Microsoft", product: "Bluetooth 링크를 통한 표준 직렬" };
let com7 = false;
const listPorts = () => (com7 ? [...PORTS, COM7] : PORTS).map((p) => ({ ...p }));
const busyPort = (port) =>
  `${port}: ${tr("포트가 사용 중입니다 — 다른 프로그램(또는 다른 PortDock 창)이 열고 있는지 확인", "Port is busy — check whether another program (or another PortDock window) has it open")} (Access is denied.)`;
const notFound = (port) => `${port}: ${tr("포트를 찾을 수 없습니다 — 케이블·드라이버·포트 이름 확인", "Port not found — check cable, driver and port name")} (The system cannot find the file specified.)`;
const inUse = (addr) => `${addr}: ${tr("포트가 이미 사용 중입니다(다른 프로그램이 쓰는 중)", "Port already in use (another program has it)")} (os error 10048)`;
const ALREADY = () => tr("이미 시작돼 있거나 시작하는 중입니다", "Already running or starting");
const NO_SESSION = () => tr("세션이 없습니다", "No session");
/** 주소처럼 생겼는지(이름 해석은 흉내만) */
const hostOk = (h) => /^(\d{1,3}\.){3}\d{1,3}$/.test(h) || /^[a-z0-9.-]+$/i.test(h) || /^\[?[0-9a-f:]+\]?$/i.test(h);
const unresolvable = (h) => h === "nohost" || h.endsWith(".invalid");

// ---------------------------------------------------------------- 세션
/** 지금 열린 세션 하나(모든 앱이 MAIN 하나만 쓴다) */
let S = null;
function send(e) {
  try {
    S?.ch?.onmessage?.(e);
  } catch (err) {
    // 화면 쪽 처리 중 예외 — 시험 도구가 잡도록 다시 던지지 않고 남긴다
    window.__pdMock.errors.push(String(err?.stack ?? err));
    setTimeout(() => {
      throw err;
    });
  }
}
const frames = (...fs) => send({ type: "frames", frames: fs });
const status = (state, port, message = null) => send({ type: "status", state, port, message });
function every(ms, fn) {
  const id = setInterval(() => S && fn(), ms);
  S.timers.push(id);
}
function later(ms, fn) {
  const s = S;
  const id = setTimeout(() => S === s && fn(), ms);
  S.timers.push(id);
}
function newSession(kind, ch, extra) {
  S = { kind, ch, timers: [], online: false, peers: [], seq: 0, ...extra };
  return S;
}
/** 세션 닫기 — 닫힘 상태는 명령이 끝난 뒤에 따로 온다(실제도 Channel 과 명령 응답의 순서가 보장되지 않는다) */
function endSession(port, notes = ["CLOSE"], message = null) {
  const s = S;
  if (!s) return;
  for (const t of s.timers) clearTimeout(t), clearInterval(t);
  S = null;
  setTimeout(() => {
    const keep = S;
    S = s;
    if (notes.length) frames(...notes.map(ev));
    if (s.peers.length) send({ type: "peers", peers: [] });
    status("closed", port, message);
    S = keep;
  }, 20);
}
const peerList = () => S.peers.map((p) => ({ id: p.id, addr: p.addr }));

// ---- 시리얼 (Serial · Modbus Slave · Simulator 시리얼)
function describe(c) {
  const p = { odd: "O", even: "E", mark: "M", space: "S" }[c.parity] ?? "N";
  const rs = c.rs485 && c.rs485 !== "off" && c.flow !== "hardware" ? ` RS485=${c.rs485}` : "";
  return `${c.port} ${c.baud} ${c.dataBits}${p}${c.stopBits} flow=${c.flow} DTR=${c.dtr ? 1 : 0} RTS=${c.rts ? 1 : 0}${rs}`;
}
async function openSerial(kind, config, ch, extra = {}) {
  if (S) return fail(kind === "serial" ? `${config.port}: ${tr("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting")}` : ALREADY());
  if (!config.port) return fail(notFound("(빈 이름)"));
  if (config.port === "COM9") {
    await sleep(250);
    return fail(busyPort(config.port));
  }
  if (!listPorts().some((p) => p.name === config.port)) {
    await sleep(250);
    return fail(notFound(config.port));
  }
  const s = newSession(kind, ch, { cfg: { ...config }, port: config.port, ...extra });
  // 블루투스 COM 은 여는 데 오래 걸린다 — «연결 중» 상태가 보이게
  await sleep(config.port === "COM7" ? 1500 : 250);
  if (S !== s) return fail(tr("세션이 닫혔습니다", "The session is closed"));
  s.online = true;
  frames(ev(`OPEN ${describe(config)}`));
  status("connected", config.port, null);
  return null;
}
/** __pdMock.unplug() — 장치가 빠진 것처럼. 자동 재연결이면 1.5초 뒤 다시 붙는다 */
function unplug() {
  if (!S || !S.cfg || !("baud" in S.cfg)) return false;
  const s = S;
  s.online = false;
  const why = tr("장치가 목록에서 사라졌습니다", "The device disappeared from the port list");
  frames(ev(`LOST ${why}`));
  if (!s.cfg.autoReconnect) {
    endSession(s.port, [], tr(`닫힘 — ${why}`, `Closed — ${why}`));
    return true;
  }
  status("reconnecting", s.port, tr(`다시 꽂기를 기다립니다 — 마지막 이유: ${why}`, `Waiting for the device — last reason: ${why}`));
  later(1500, () => {
    s.online = true;
    frames(ev(`RECONNECT ${s.port}`));
    status("connected", s.port, null);
  });
  return true;
}

// ---- Serial 앱
function serialTick() {
  const s = S;
  if (!s.online) return;
  s.seq++;
  const rx =
    s.seq % 3 === 0
      ? ascii(`TEMP=${(20 + (s.seq % 10) / 2).toFixed(1)}C,HUM=41%\r\n`)
      : s.seq % 5 === 0
        ? [1, 3, 4, 0, 100, 0, 200, 0x00, 0x00] // CRC 가 틀린 응답
        : withCrc([1, 3, 20, ...Array.from({ length: 20 }, (_, i) => (i * 13 + s.seq) & 0xff)]);
  frames(data("rx", rx, verify(s.rxCheck, rx)));
  if (s.seq % 4 === 0) {
    s.lines = { cts: !s.lines?.cts, dsr: true, ri: false, cd: s.seq % 8 === 0 };
    send({ type: "lines", ...s.lines });
    frames(ev(`CTS ${s.lines.cts ? "ON" : "OFF"}`));
  }
}
function framingNote(f) {
  switch (f?.kind) {
    case "gap":
      return `FRAMING gap ${f.gap_ms}ms`;
    case "terminator":
      return `FRAMING terminator [${(f.bytes ?? []).map(hex2).join(" ")}] gap ${f.gap_ms}ms`;
    case "fixed":
      return `FRAMING fixed ${f.len} gap ${f.gap_ms}ms`;
    case "modbus-rtu":
      return `FRAMING modbus-rtu ${f.baud}`;
  }
  return "FRAMING ?";
}
function diffCfg(a, b) {
  const out = [];
  for (const k of ["baud", "dataBits", "parity", "stopBits", "flow", "dtr", "rts", "rs485"]) if (a[k] !== b[k]) out.push(`${k} ${a[k]}→${b[k]}`);
  return out;
}

// ---- Modbus Slave 앱 (시리얼 RTU · TCP 서버 Modbus TCP / RTU over TCP)
const newSlaveStats = () => ({ requests: 0, ok: 0, exceptions: 0, otherId: 0, badFrames: 0, busy: 0, noResponse: 0, broadcasts: 0, writes: 0, perFc: {}, ignored: 0 });
const slave = {
  ids: [1],
  tables: new Map(), // "id:table" → Map(addr → value)
  ranges: new Map(),
  faults: { delayMs: 0, delayMaxMs: 0, noResponse: false, forceException: 0, badCrc: false, badMbapLen: false, target: null },
  stats: newSlaveStats(),
  options: { ignoreUnitId: false },
  device: { vendor: "PortDock", productCode: "Modbus Slave", revision: "1.0" },
  sims: new Map(), // "id:table" → [SimSpec]
  style: { base: 0, plc: false },
  tid: 0,
};
const tbl = (id, t) => {
  const k = `${id}:${t}`;
  if (!slave.tables.has(k)) slave.tables.set(k, new Map());
  return slave.tables.get(k);
};
const spanErr = (start, count) =>
  !Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count <= 0 || start + count > 65536 ? tr("주소 범위가 0~65535 를 벗어납니다", "Address range is outside 0–65535") : null;
/** 백엔드 Summarizer 흉내 — 주소 표기(0·1 기준, PLC)를 따른다 */
const mbAddr = (prefix, a) => (slave.style.plc ? prefix + String(a + 1).padStart(a < 9999 ? 4 : 5, "0") : String(a + slave.style.base));
const mbSpan = (prefix, a, n) => (n > 1 ? `${mbAddr(prefix, a)}..${mbAddr(prefix, a + n - 1)}` : mbAddr(prefix, a));
/** MBAP 머리를 붙인다 */
const mbap = (tid, unit, pdu) => [(tid >> 8) & 0xff, tid & 0xff, 0, 0, ((pdu.length + 1) >> 8) & 0xff, (pdu.length + 1) & 0xff, unit, ...pdu];
/** 자동 변화(증가·감소·토글만 흉내) — 연결과 상관없이 돈다 */
setInterval(() => {
  for (const [k, list] of slave.sims) {
    const [id, t] = k.split(":");
    const m = tbl(Number(id), t);
    for (const s of list) {
      const v = m.get(s.addr) ?? 0;
      if (s.sim.kind === "toggle") m.set(s.addr, v ? 0 : 1);
      else if (s.valueType === "u16" && (s.sim.kind === "increment" || s.sim.kind === "decrement")) m.set(s.addr, (v + (s.sim.kind === "increment" ? 1 : 0xffff)) & 0xffff);
    }
  }
}, 1000);
function slaveTick() {
  const s = S;
  if (!s.online) return;
  const tcp = s.kind === "slave-tcp";
  if (tcp && !s.peers.length) return;
  s.seq++;
  const mtcp = tcp && s.cfg.wire === "tcp";
  const peer = tcp ? s.peers[s.seq % s.peers.length].addr : undefined;
  const wire = (unit, pdu) => (mtcp ? mbap(slave.tid, unit, pdu) : withCrc([unit, ...pdu]));
  const h = mtcp ? `#${slave.tid} ` : "";
  slave.tid = (slave.tid + 1) & 0xffff;
  // 가끔 목록에 없는 국번
  if (s.seq % 7 === 0) {
    frames({ ...data("rx", wire(9, [3, 0, 0, 0, 1]), mtcp ? null : true, peer), sum: `${h}id9 FC03 HR ${mbAddr("4", 0)} (1)` });
    slave.stats.otherId++;
    slave.stats.ignored++;
    frames(ev(mtcp ? "IGNORED unit 9 (not simulated)" : "IGNORED id 9 (not simulated)"));
    return;
  }
  const id = slave.ids[s.seq % slave.ids.length];
  slave.stats.requests++;
  // 마스터 요청: 읽기 위주, 가끔 쓰기(FC06 — 4x 주소 3 을 1씩 올린다)
  const write = s.seq % 6 === 0;
  const fc = write ? 6 : 3;
  const fcKey = write ? "06" : "03";
  slave.stats.perFc[fcKey] = (slave.stats.perFc[fcKey] ?? 0) + 1;
  const reqPdu = write ? [6, 0, 3, 0, s.seq & 0xff] : [3, 0, 0, 0, 4];
  const reqSum = write ? `${h}id${id} FC06 HR ${mbAddr("4", 3)} ← ${s.seq & 0xff}` : `${h}id${id} FC03 HR ${mbSpan("4", 0, 4)} (4)`;
  frames({ ...data("rx", wire(id, reqPdu), mtcp ? null : true, peer), sum: reqSum });
  const f = slave.faults;
  if (f.noResponse) {
    slave.stats.noResponse++;
    frames(ev(`NO-RESPONSE (fault) id ${id} fc ${fcKey}`));
    return;
  }
  let pdu;
  let sum;
  if (f.forceException) {
    slave.stats.exceptions++;
    pdu = [fc | 0x80, f.forceException];
    sum = `${h}id${id} FC${fcKey} → ${tr(`예외 ${hex2(f.forceException)}`, `exception ${hex2(f.forceException)}`)}`;
  } else if (write) {
    tbl(id, "holding-registers").set(3, s.seq & 0xff);
    slave.stats.writes++;
    slave.stats.ok++;
    pdu = reqPdu;
    sum = `${h}id${id} FC06 HR ${mbAddr("4", 3)} → ${tr("정상", "OK")}`;
  } else {
    slave.stats.ok++;
    const m = tbl(id, "holding-registers");
    const regs = [0, 1, 2, 3].map((a) => m.get(a) ?? 0);
    pdu = [3, 8, ...regs.flatMap((v) => [(v >> 8) & 0xff, v & 0xff])];
    sum = `${h}id${id} FC03 HR ${mbSpan("4", 0, 4)} → ${tr("정상", "OK")}: ${regs.join(", ")}`;
  }
  const resp = wire(id, pdu);
  if (f.badCrc && !mtcp) resp[resp.length - 1] ^= 0xff;
  if (f.badMbapLen && mtcp) resp[5] = (resp[5] + 1) & 0xff;
  const delay = f.delayMaxMs > f.delayMs ? f.delayMs + Math.floor(Math.random() * (f.delayMaxMs - f.delayMs + 1)) : f.delayMs;
  if (f.delayMaxMs > f.delayMs) frames(ev(`DELAY ${delay} ms (fault)`));
  if (f.forceException) frames(ev(`EXCEPTION ${hex2(f.forceException)} → id ${id} fc ${fcKey}`));
  later(Math.min(delay, 500), () => frames({ ...data("tx", resp, null, peer), sum }));
}
/** TCP 서버로 시작 — 실제처럼 LISTEN, 상대 둘이 붙는다 */
function slaveTcpStart(c, ch) {
  if (S) return fail(tr("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting"));
  if (!c.host.trim() || !hostOk(c.host) || unresolvable(c.host)) return fail(tr(`${c.host}:${c.port}: 주소를 찾지 못했습니다`, `${c.host}:${c.port}: address not found`));
  if (c.port === 445) return fail(inUse(`${c.host}:${c.port}`));
  const local = `${c.host}:${c.port || 50502}`;
  const s = newSession("slave-tcp", ch, { cfg: { ...c }, port: local, server: true, online: true });
  slave.options.ignoreUnitId = !!c.ignoreUnitId;
  later(10, () => {
    frames(ev(`LISTEN ${local}`));
    status("listening", local, null);
  });
  const join = (addr) => {
    s.peers.push({ id: ++s.seq, addr });
    frames(ev(`ACCEPT ${addr}`));
    send({ type: "peers", peers: peerList() });
  };
  later(300, () => join("192.168.0.20:51234"));
  later(900, () => join("192.168.0.21:50000"));
  every(500, slaveTick);
  return Promise.resolve(local);
}

// ---- TCP 앱
function tcpStart(config, framing, rxCheck, ch, sim = false) {
  if (S) return fail(ALREADY());
  if (config.mode === "client") {
    if (!config.host.trim() || !(config.port > 0)) return fail(tr("접속할 주소와 포트(1~65535)를 넣어 주세요", "Enter the host and port (1–65535) to connect to"));
    if (!hostOk(config.host) || unresolvable(config.host)) return fail(tr(`${config.host}:${config.port}: 주소를 찾지 못했습니다`, `${config.host}:${config.port}: address not found`));
    const target = `${config.host}:${config.port}`;
    const s = newSession(sim ? "sim-tcp" : "tcp", ch, { cfg: { ...config }, rxCheck, framing, target, port: target });
    // 10.0.0.99 는 늘 실패(재접속 대기 시험), 그 밖은 0.2초 뒤 붙는다
    const attempt = () => {
      if (config.host === "10.0.0.99") {
        const why = tr("연결 시간 초과 — 상대가 꺼져 있거나 방화벽이 막음", "Connection timed out — the peer is off or a firewall blocks it");
        frames(ev(`CONNECT FAIL ${why}`));
        status("disconnected", target, why);
        // 실제처럼 마지막 실패 이유를 닫힘 문구에 붙인다
        if (!config.autoReconnect) return endSession(target, [], tr(`멈춤 — 마지막 이유: ${why}`, `Stopped — last reason: ${why}`));
        status("reconnecting", target, tr(`${(config.reconnectMs / 1000).toFixed(1)}초 뒤 다시 — 마지막 이유: ${why}`, `Retrying in ${(config.reconnectMs / 1000).toFixed(1)} s — last reason: ${why}`));
        later(Math.max(200, config.reconnectMs), attempt);
        return;
      }
      s.online = true;
      s.peers = [{ id: ++s.seq, addr: target }];
      frames(ev(`CONNECT ${target}`));
      send({ type: "peers", peers: peerList() });
      status("connected", target, null);
    };
    later(200, attempt);
    every(800, () => netRx());
    return Promise.resolve(null);
  }
  // 서버
  if (!hostOk(config.host) || unresolvable(config.host)) return fail(tr(`${config.host}:${config.port}: 주소를 찾지 못했습니다`, `${config.host}:${config.port}: address not found`));
  if (config.port === 445) return fail(inUse(`${config.host}:${config.port}`));
  const local = `${config.host}:${config.port || 50123}`;
  const s = newSession(sim ? "sim-tcp" : "tcp", ch, { cfg: { ...config }, rxCheck, framing, port: local, server: true, failOnce: true });
  later(30, () => status("listening", local, null));
  const join = (addr) => {
    s.online = true;
    s.peers.push({ id: ++s.seq, addr });
    frames(ev(`ACCEPT ${addr}`));
    send({ type: "peers", peers: peerList() });
  };
  later(400, () => join("192.168.0.20:51234"));
  later(1200, () => join("192.168.0.21:50000"));
  later(1600, () => join("[fe80::1c2b:3d4e:5f60:7182%12]:49152"));
  every(800, () => netRx());
  return Promise.resolve(local);
}
function netRx() {
  const s = S;
  if (!s.peers.length) return;
  s.tick = (s.tick ?? 0) + 1;
  const p = s.peers[s.tick % s.peers.length];
  const rx = s.tick % 4 === 0 ? withCrc([1, 3, 4, 0, 10, 0, 20]) : ascii(`READY,TEMP=24.8C,SEQ=${s.tick}\r\n`);
  frames(data("rx", rx, verify(s.rxCheck, rx), p.addr));
  if (s.kind.startsWith("sim")) simReply(rx, p.addr);
  else if (s.cfg?.echo) frames(data("tx", rx, null, p.addr));
}
function kick(id) {
  const s = S;
  if (!s) return fail(NO_SESSION());
  const p = s.peers.find((x) => x.id === id);
  if (!p) return Promise.resolve(null);
  s.peers = s.peers.filter((x) => x.id !== id);
  frames(ev(`CLOSE ${p.addr} (${tr("사용자가 끊음", "disconnected by user")})`));
  send({ type: "peers", peers: peerList() });
  return Promise.resolve(null);
}

// ---- UDP 앱
function udpStart(config, rxCheck, ch, sim = false) {
  if (S) return fail(ALREADY());
  if (!hostOk(config.bindHost) || unresolvable(config.bindHost)) return fail(tr(`${config.bindHost}:${config.bindPort}: 주소를 찾지 못했습니다`, `${config.bindHost}:${config.bindPort}: address not found`));
  if (config.bindPort === 445) return fail(inUse(`${config.bindHost}:${config.bindPort}`));
  const g = (config.multicastGroup ?? "").trim();
  if (g) {
    const m = g.match(/^(\d+)\.\d+\.\d+\.\d+$/);
    if (!m) return fail(tr(`멀티캐스트 주소가 아닙니다: ${g}`, `Not a multicast address: ${g}`));
    if (+m[1] < 224 || +m[1] > 239) return fail(tr(`${g} 는 멀티캐스트 주소(224.0.0.0~239.255.255.255)가 아닙니다`, `${g} is not a multicast address (224.0.0.0–239.255.255.255)`));
  }
  const local = `${config.bindHost}:${config.bindPort || 50124}`;
  const s = newSession(sim ? "sim-udp" : "udp", ch, { cfg: { ...config }, rxCheck, port: local, online: true, remote: `${config.remoteHost}:${config.remotePort}`, seen: [] });
  later(10, () => {
    frames(ev(`BIND ${local}`));
    status("listening", local, null);
  });
  every(900, () => {
    s.tick = (s.tick ?? 0) + 1;
    const from = s.tick % 3 === 0 ? "192.168.0.31:6001" : "192.168.0.30:5000";
    if (!s.seen.includes(from)) {
      s.seen.push(from);
      s.peers.push({ id: s.peers.length + 1, addr: from });
      send({ type: "peers", peers: peerList() });
    }
    s.last = from;
    const rx = s.tick % 2 ? ascii(`PING ${s.tick}`) : [0x02, 0x10, 0x20, 0x03, 0x33];
    frames(data("rx", rx, verify(s.rxCheck, rx), from));
    if (sim) simReply(rx, from);
    else if (s.cfg.echo) frames(data("tx", rx, null, from));
  });
  return Promise.resolve(local);
}
const looksBroadcast = (h) => /\.255$/.test(h) || h === "255.255.255.255";
function udpSend(to, spec) {
  const s = S;
  const b = buildOrFail(spec);
  if (b.err) return fail(b.err);
  if (!s) return fail(NO_SESSION());
  let dest;
  if (to == null) {
    if (!s.remote || s.remote.endsWith(":0")) return fail(tr("보낼 곳이 정해지지 않았습니다", "No destination is set"));
    dest = s.remote;
  } else if (to === "last") {
    if (!s.last) return fail(tr("아직 받은 데이터가 없습니다", "Nothing has been received yet"));
    dest = s.last;
  } else {
    if (!/^.+:\d+$/.test(to)) return fail(tr(`주소 형식이 틀립니다: ${to} (예: 192.168.0.10:5000)`, `Bad address: ${to} (e.g. 192.168.0.10:5000)`));
    dest = to;
  }
  if (looksBroadcast(dest.replace(/:\d+$/, "")) && !s.cfg.broadcast)
    return fail(
      `${dest}: ${tr("접근 거부 — 브로드캐스트 주소면 «브로드캐스트» 를 켜고, 아니면 방화벽·예약된 포트 확인", "Access denied — for a broadcast address enable «Broadcast»; otherwise check firewall / reserved ports")}`,
    );
  frames(data("tx", b.bytes, null, dest));
  return Promise.resolve(dest);
}

// ---- Simulator 앱(규칙 응답)
const sim = { rules: [], hits: {}, opts: { stripTerminator: true, logNoMatch: true } };
/** 규칙 패턴 → [바이트 | null(??) | "*"(**)] */
function compilePattern(r) {
  if (r.patternMode === "hex") {
    const out = [];
    for (const tok of r.pattern.trim().split(/[\s,]+/).filter(Boolean)) {
      if (tok === "??") out.push(null);
      else if (tok === "**") out.push("*");
      else out.push(...parseHex(tok));
    }
    return out;
  }
  const out = [];
  const parts = r.pattern.split("*");
  parts.forEach((p, i) => {
    out.push(...parseAscii(p).map((b) => (b === 0x3f ? null : b)));
    if (i < parts.length - 1) out.push("*");
  });
  return out;
}
function matchAt(pat, bytes, pi = 0, bi = 0) {
  if (pi === pat.length) return bi === bytes.length;
  if (pat[pi] === "*") {
    for (let k = bi; k <= bytes.length; k++) if (matchAt(pat, bytes, pi + 1, k)) return true;
    return false;
  }
  if (bi >= bytes.length) return false;
  return (pat[pi] === null || pat[pi] === bytes[bi]) && matchAt(pat, bytes, pi + 1, bi + 1);
}
function simReply(rx, peer) {
  let req = rx;
  if (sim.opts.stripTerminator) while (req.length && (req[req.length - 1] === 13 || req[req.length - 1] === 10)) req = req.slice(0, -1);
  for (const r of sim.rules) {
    let ok = false;
    try {
      const pat = compilePattern(r);
      ok = r.kind === "exact" ? matchAt(pat, req) : matchAt(["*", ...pat, "*"], req);
    } catch {
      continue;
    }
    if (!ok) continue;
    let bytes;
    try {
      bytes = build(r.reply);
    } catch {
      continue;
    }
    sim.hits[r.name] = (sim.hits[r.name] ?? 0) + 1;
    later(Math.min(r.delayMs, 300), () => frames(data("tx", bytes, null, peer)));
    return;
  }
  if (sim.opts.logNoMatch) frames(ev(`NO MATCH ${req.length} B`));
}
function simSerialTick() {
  const s = S;
  if (!s.online) return;
  s.seq++;
  const rx = s.seq % 2 ? ascii("READ?\r\n") : withCrc([1, 3, 0, 0, 0, 10]);
  frames(data("rx", rx, null));
  simReply(rx);
}

// ---------------------------------------------------------------- 시험 도구용 손잡이
const files = new Map();
// 파일 보내기 흉내 — 4096바이트를 0.12초마다 512씩
let fileSeq = 0;
const fileJobs = [];
window.__pdMock = {
  /** ask() 의 답(true = 예). save/open 이 돌려줄 경로(null = 취소) */
  dialog: { ask: false, save: null, open: null },
  calls: [],
  errors: [],
  files,
  get session() {
    return S ? { kind: S.kind, online: S.online, peers: S.peers.length } : null;
  },
  unplug,
  /** 블루투스 COM7 을 꽂는다/뺀다 */
  plug(on = true) {
    com7 = on;
  },
  /** 백엔드 오류 사건(연결은 유지) */
  error(message) {
    send({ type: "error", message });
  },
};

// ---------------------------------------------------------------- 명령
async function handle(cmd, a) {
  switch (cmd) {
    // ---- 공통
    case "set_lang":
      lang = a.lang === "en" ? "en" : "ko";
      return null;
    case "report_env":
      return { app: "preview", version: "0.1.0", os: "windows 10.0.26100", arch: "x86_64", reportsDir: "C:\\Users\\me\\AppData\\Local\\dev.portdock.x\\reports" };
    case "report_pending":
      return [];
    case "report_dismiss":
      return null;
    case "write_text":
      if (/[<>|"?*]/.test(a.path.replace(/^[A-Za-z]:/, ""))) return fail(`${a.path}: ${tr("파일 이름이 잘못되었습니다", "The filename is invalid")} (os error 123)`);
      files.set(a.path, a.text);
      return null;
    case "read_text":
      if (!files.has(a.path)) return fail(`${a.path}: ${tr("지정된 파일을 찾을 수 없습니다.", "The system cannot find the file specified.")} (os error 2)`);
      return files.get(a.path);
    case "preview":
      try {
        return build(a.spec);
      } catch (e) {
        return fail(String(e));
      }
    case "verify_checksum":
      return verify(a.kind, a.bytes);
    case "list_ports":
      return listPorts();
    case "plugin:dialog|message":
      return window.__pdMock.dialog.ask ? "Yes" : "No";
    case "plugin:dialog|save":
      return window.__pdMock.dialog.save;
    case "plugin:dialog|open":
      return window.__pdMock.dialog.open;
    case "plugin:opener|open_url":
      return null;

    // ---- Serial (open_session: id = 포트 이름)
    case "open_session": {
      const r = await openSerial("serial", a.config, a.onEvent, { rxCheck: a.rxCheck, framing: a.framing });
      if (S?.kind === "serial") {
        frames(ev(framingNote(a.framing)), ...(a.rxCheck ? [ev(`RXCHECK ${ckName(a.rxCheck)}`)] : []));
        S.lines = { cts: true, dsr: false, ri: false, cd: true };
        send({ type: "lines", ...S.lines });
        every(700, serialTick);
      }
      return r;
    }
    case "close_session":
      if (S && S.port === a.id) endSession(a.id);
      return null;
    case "set_framing":
      if (!S) return null; // 멈춘 직후 늦게 온 호출 — Simulator 는 실제로도 조용히 넘긴다
      // 실제처럼 바뀐 것만 사건 줄로
      if (JSON.stringify(S.framing) !== JSON.stringify(a.framing)) frames(ev(framingNote(a.framing)));
      if (JSON.stringify(S.rxCheck ?? null) !== JSON.stringify(a.rxCheck ?? null)) frames(ev(`RXCHECK ${a.rxCheck ? ckName(a.rxCheck) : "none"}`));
      S.framing = a.framing;
      S.rxCheck = a.rxCheck ?? null;
      return null;
    case "reconfigure": {
      if (!S) return fail(NO_SESSION());
      const d = diffCfg(S.cfg, a.config);
      S.cfg = { ...S.cfg, ...a.config, port: S.cfg.port };
      if (d.length) frames(ev(`SET ${d.join(", ")}${S.online ? "" : tr(" (다시 연결될 때 적용)", " (applies on reconnect)")}`));
      return null;
    }
    case "set_log_options":
      window.__pdMock.logOptions = { ...a.options };
      return null;
    case "send_file": {
      // Serial: {id, path, pace} → 진행은 세션 사건(progress) · TCP: {target, path, pace, onProgress} → 진행은 onProgress
      if (!S) return fail(NO_SESSION());
      if (!a.path) return fail(tr("파일을 고르세요", "Choose a file"));
      if (/missing/i.test(a.path)) return fail(`${a.path}: ${tr("지정된 파일을 찾을 수 없습니다.", "The system cannot find the file specified.")} (os error 2)`);
      const id = ++fileSeq;
      const total = 4096;
      const out = a.onProgress ? (p) => a.onProgress.onmessage?.(p) : (p) => send({ type: "progress", ...p });
      const job = { id, sent: 0, total, cancelled: false };
      fileJobs.push(job);
      const step = () => {
        if (!S) return;
        if (job.cancelled) {
          frames(ev(`SEND CANCELLED ${job.sent}/${total}`));
          return out({ id, sent: job.sent, total, done: true, cancelled: true });
        }
        const n = Math.min(512, total - job.sent);
        job.sent += n;
        frames(data("tx", Array.from({ length: Math.min(n, 32) }, (_, i) => (i + job.sent) & 0xff), null, S.peers?.[0]?.addr));
        out({ id, sent: job.sent, total, done: job.sent >= total, cancelled: false });
        if (job.sent < total) later(Math.max(120, a.pace?.lineDelayMs ?? 0), step);
      };
      later(50, step);
      return { id, total };
    }
    case "cancel_send":
      for (const j of fileJobs) j.cancelled = true;
      return null;
    case "file_size":
      return /missing/i.test(a.path) ? fail(`${a.path}: ${tr("지정된 파일을 찾을 수 없습니다.", "The system cannot find the file specified.")} (os error 2)`) : 4096;
    case "send_break":
      if (!S) return fail(NO_SESSION());
      if (!S.online) return fail(tr("포트가 끊겨 있습니다", "The port is disconnected"));
      if (!(a.ms >= 1 && a.ms <= 10000)) return fail(tr("Break 길이는 1~10000 ms 입니다", "Break duration must be 1–10000 ms"));
      frames(ev(`BREAK ${a.ms}ms`));
      return null;
    case "set_log":
      if (!S) return fail(NO_SESSION());
      if (a.path && /readonly|denied/i.test(a.path)) return fail(`${a.path}: ${tr("액세스가 거부되었습니다.", "Access is denied.")} (os error 5)`);
      frames(ev(a.path ? `LOG START ${a.path}` : "LOG STOP"));
      return null;
    case "send": {
      // Serial: {id, spec} → 바이트 · TCP: {target, spec} → {sent,total} · UDP: {to, spec} → 주소 · Simulator: {spec}
      if ("to" in a) return udpSend(a.to, a.spec);
      const b = buildOrFail(a.spec);
      if (b.err) return fail(b.err);
      if (!S) return fail(tr("세션이 닫혔습니다", "The session is closed"));
      if (S.kind === "serial" || S.kind === "sim-serial") {
        if (!S.online) return fail(tr("포트가 끊겨 있습니다", "The port is disconnected"));
        frames(data("tx", b.bytes, null));
        if (S.kind === "serial") later(60, () => frames(data("rx", withCrc([1, 3, 2, 0, 42]), verify(S.rxCheck, withCrc([1, 3, 2, 0, 42])))));
        return S.kind === "serial" ? b.bytes : null;
      }
      if (S.kind === "sim-udp") return udpSend(null, a.spec).then(() => null);
      // TCP · Simulator TCP
      if (!S.peers.length) return fail(tr("연결된 상대가 없습니다", "No peer is connected"));
      if ("target" in a && a.target != null) {
        const p = S.peers.find((x) => x.id === a.target);
        if (!p) return fail(tr("그 상대는 이미 끊겼습니다", "That peer is already gone"));
        frames(data("tx", b.bytes, null, p.addr));
        return { sent: 1, total: 1 };
      }
      const total = S.peers.length;
      let sent = total;
      // 서버에서 처음 «모두에게» 보낼 때 IPv6 상대 하나는 실패하고 닫힌다 — 일부만 나간 경우 시험
      if (S.server && S.failOnce && total >= 3) {
        S.failOnce = false;
        const bad = S.peers[S.peers.length - 1];
        S.peers = S.peers.slice(0, -1);
        sent = total - 1;
        frames(ev(tr(`SEND FAIL ${bad.addr} (os error 10054) — 연결을 닫습니다`, `SEND FAIL ${bad.addr} (os error 10054) — closing the connection`)));
        send({ type: "peers", peers: peerList() });
      }
      frames(...S.peers.map((p) => data("tx", b.bytes, null, p.addr)));
      return S.kind === "tcp" ? { sent, total } : null;
    }
    case "decode_modbus": {
      const b = a.bytes;
      if (b.length < 4) return null;
      const crcOk = verify("crc16-modbus", b) === true;
      const fn = b[1];
      const names = { 1: "Read Coils", 2: "Read Discrete Inputs", 3: "Read Holding Registers", 4: "Read Input Registers", 5: "Write Single Coil", 6: "Write Single Register", 15: "Write Multiple Coils", 16: "Write Multiple Registers" };
      if (!names[fn & 0x7f]) return null;
      if (fn & 0x80) return { slave: b[0], function: fn, function_name: names[fn & 0x7f], kind: "exception", crc_ok: crcOk, fields: [["exception", String(b[2])]], values: [] };
      if (b.length === 8 && fn <= 6) return { slave: b[0], function: fn, function_name: names[fn], kind: "request", crc_ok: crcOk, fields: [["address", String((b[2] << 8) | b[3])], ["quantity", String((b[4] << 8) | b[5])]], values: [] };
      const n = b[2];
      const vals = [];
      for (let i = 0; i + 1 < n && 4 + i < b.length; i += 2) vals.push((b[3 + i] << 8) | b[4 + i]);
      return { slave: b[0], function: fn, function_name: names[fn], kind: "response", crc_ok: crcOk, fields: [["byte count", String(n)]], values: vals };
    }

    // ---- Modbus Slave
    case "open": {
      const r = await openSerial("slave", a.config, a.onEvent);
      if (S?.kind === "slave") {
        slave.options.ignoreUnitId = false;
        frames(ev(`FRAMING modbus-rtu-request @${a.config.baud} min gap 20ms`), ev("RXCHECK crc16-modbus"));
        every(600, slaveTick);
      }
      return r;
    }
    case "open_tcp":
      return slaveTcpStart(a.config, a.onEvent);
    case "close":
      if (S) endSession(S.port, S.kind === "slave-tcp" ? [...S.peers.map((p) => `CLOSE ${p.addr} (${tr("사용자가 끊음", "disconnected by user")})`), "STOP LISTEN"] : ["CLOSE"]);
      return null;
    case "set_faults": {
      const t = a.faults.target ?? {};
      if ((t.probability ?? 100) > 100) return fail(tr("확률은 0~100% 입니다", "Probability is 0–100%"));
      if (t.addrFrom != null && t.addrTo != null && t.addrFrom > t.addrTo) return fail(tr("주소 범위의 시작이 끝보다 큽니다", "The address range starts after it ends"));
      slave.faults = { ...a.faults };
      return null;
    }
    case "set_options":
      slave.options = { ...a.options };
      return null;
    case "set_device_id":
      if ([a.device.vendor, a.device.productCode, a.device.revision].some((x) => enc.encode(x).length > 80)) return fail(tr("장치 식별이 80바이트를 넘습니다", "Device ID is longer than 80 bytes"));
      slave.device = { ...a.device };
      return null;
    case "set_sims":
      if (!slave.ids.includes(a.id)) return fail(tr("없는 슬레이브", "Unknown slave ID"));
      if (a.sims.length) slave.sims.set(`${a.id}:${a.table}`, a.sims);
      else slave.sims.delete(`${a.id}:${a.table}`);
      return null;
    case "set_addr_style":
      slave.style = { base: a.style.base, plc: !!a.style.plc };
      return null;
    case "set_slave_ids":
      if (!a.ids?.length) return fail(tr("슬레이브 주소가 하나는 있어야 합니다", "At least one slave ID is required"));
      if (a.ids.some((x) => !Number.isInteger(x) || x < 1 || x > 247)) return fail(tr("슬레이브 주소는 1~247", "Slave IDs are 1–247"));
      slave.ids = [...a.ids];
      for (const k of [...slave.sims.keys()]) if (!slave.ids.includes(Number(k.split(":")[0]))) slave.sims.delete(k);
      return null;
    case "set_range": {
      const e = spanErr(a.start, a.count);
      if (e) return fail(e);
      slave.ranges.set(`${a.id}:${a.table}`, { start: a.start, count: a.count });
      return null;
    }
    case "get_values": {
      const e = spanErr(a.start, a.count);
      if (e) return fail(e);
      const m = tbl(a.id, a.table);
      return Array.from({ length: a.count }, (_, i) => m.get(a.start + i) ?? 0);
    }
    case "set_values": {
      if (!a.values.length) return null;
      const e = spanErr(a.start, a.values.length);
      if (e) return fail(e);
      const bits = a.table === "coils" || a.table === "discrete-inputs";
      const m = tbl(a.id, a.table);
      a.values.forEach((v, i) => m.set(a.start + i, bits ? (v ? 1 : 0) : v & 0xffff));
      return null;
    }
    case "get_stats":
      return JSON.parse(JSON.stringify(slave.stats));
    case "reset_stats":
      slave.stats = newSlaveStats();
      return null;

    // ---- TCP · UDP (둘 다 «start» — 설정 모양으로 가린다)
    case "start":
      return "mode" in a.config ? tcpStart(a.config, a.framing, a.rxCheck, a.onEvent) : udpStart(a.config, a.rxCheck, a.onEvent);
    case "stop":
      if (S) endSession(S.port, S.peers.length ? S.peers.map((p) => `CLOSE ${p.addr} (${tr("사용자가 끊음", "disconnected by user")})`) : ["CLOSE"]);
      return null;
    case "set_echo":
      if (!S) return fail(NO_SESSION());
      S.cfg.echo = a.on;
      return null;
    case "kick":
      return kick(a.id);
    case "set_remote":
      if (!S) return fail(NO_SESSION());
      if (!hostOk(a.host) || unresolvable(a.host)) return fail(tr(`${a.host}:${a.port}: 주소를 찾지 못했습니다`, `${a.host}:${a.port}: address not found`));
      S.remote = `${a.host}:${a.port}`;
      frames(ev(`REMOTE ${S.remote}`));
      return null;
    case "set_rx_check":
      if (!S) return fail(NO_SESSION());
      S.rxCheck = a.rxCheck ?? null;
      return null;
    case "rejoin":
      if (!S) return fail(NO_SESSION());
      if (!S.cfg.multicastGroup) return fail(tr("멀티캐스트 그룹이 없습니다", "No multicast group"));
      frames(ev(`JOIN ${S.cfg.multicastGroup}`));
      return null;

    // ---- Simulator
    case "start_serial": {
      const r = await openSerial("sim-serial", a.config, a.onEvent, { framing: a.framing });
      if (S?.kind === "sim-serial") every(900, simSerialTick);
      return r;
    }
    case "start_tcp":
      return tcpStart(a.config, a.framing, null, a.onEvent, true);
    case "start_udp":
      return udpStart(a.config, null, a.onEvent, true);
    case "set_rules": {
      const errors = [];
      const active = [];
      (a.rules ?? []).forEach((r, index) => {
        if (!r.enabled) return;
        try {
          if (!r.pattern.trim()) throw tr("패턴이 비어 있습니다", "The pattern is empty");
          compilePattern(r);
          build(r.reply);
          active.push(r);
        } catch (e) {
          errors.push({ index, name: r.name, message: String(e) });
        }
      });
      sim.rules = active;
      return { active: active.length, errors };
    }
    case "set_match_options":
      sim.opts = { stripTerminator: a.stripTerminator, logNoMatch: a.logNoMatch };
      return null;
    case "get_hits":
      return { ...sim.hits };
    case "reset_hits":
      sim.hits = {};
      return null;
  }
  // 창 관련(plugin:window|·plugin:event|) 등은 조용히 넘긴다
  if (!cmd.startsWith("plugin:")) console.warn(`[mock] 모르는 명령: ${cmd}`);
  return null;
}

mockIPC(
  (cmd, args) => {
    const a = args ?? {};
    if (!cmd.startsWith("plugin:event") && !["get_values", "get_stats", "get_hits", "list_ports"].includes(cmd)) window.__pdMock.calls.push(cmd);
    if (window.__pdMock.calls.length > 2000) window.__pdMock.calls.splice(0, 1000);
    // Net Scan 명령은 맨 아래 따로 둔 부분이 받는다
    return NETSCAN.has(cmd) ? netscan(cmd, a) : handle(cmd, a);
  },
  { shouldMockEvents: true },
);

// ================================================================ Net Scan (apps/netscan — 명령: apps/netscan/src-tauri/src/lib.rs)
// 위 공용 세션(S)과 따로 논다. 범위의 주소를 0.5초에 하나씩 «찾는다»(/24 는 2분 남짓 — 다 눌러 보기 동안 계속 찾는 중이도록).
// 일부러 실패하는 입력: 범위 4096개 초과, 감시 장비 «nohost»(찾지 못함), 감시 IP 끝이 .99(늘 시간 초과).
const NETSCAN = new Set(["list_nics", "range_info", "scan_start", "scan_cancel", "modbus_ident", "wake", "open_web", "monitor_start", "monitor_stop", "monitor_set_log"]);
const nsIp = (s) => {
  const p = s.trim().split(".");
  if (p.length !== 4 || !p.every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255)) throw `${tr("IP 주소가 아닙니다", "Not an IP address")}: «${s.trim()}»`;
  return ((Number(p[0]) << 24) >>> 0) + (Number(p[1]) << 16) + (Number(p[2]) << 8) + Number(p[3]);
};
const nsStr = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
/** range.rs 와 같은 규칙(간단히) → [[처음, 끝], …] */
function nsSpans(text) {
  const parts = text.split(/[,;\s]+/).filter(Boolean);
  if (!parts.length) throw tr("찾을 범위가 비어 있습니다", "The range is empty");
  return parts.map((p) => {
    if (p.includes("/")) {
      const [a, b] = p.split("/");
      const pre = Number(b);
      if (!/^\d+$/.test(b) || pre > 32) throw `${tr("접두사 길이는 0~32 입니다", "Prefix length must be 0–32")}: «${p}»`;
      const mask = pre === 0 ? 0 : (0xffffffff << (32 - pre)) >>> 0;
      const net = (nsIp(a) & mask) >>> 0;
      const bc = (net | (~mask >>> 0)) >>> 0;
      return pre >= 31 ? [net, bc] : [net + 1, bc - 1];
    }
    if (p.includes("-")) {
      const [a, b] = p.split("-");
      const f = nsIp(a);
      let l;
      if (b.includes(".")) l = nsIp(b);
      else if (/^\d{1,3}$/.test(b) && Number(b) <= 255) l = ((f & 0xffffff00) >>> 0) + Number(b);
      else throw `${tr("범위 끝은 0~255 숫자나 IP 주소입니다", "The range end must be 0–255 or an IP address")}: «${p}»`;
      if (l < f) throw `${tr("범위의 끝이 시작보다 앞입니다", "The range ends before it starts")}: «${p}»`;
      return [f, l];
    }
    const x = nsIp(p);
    return [x, x];
  });
}
function nsInfo(text) {
  const s = nsSpans(text);
  const count = s.reduce((n, [a, b]) => n + b - a + 1, 0);
  return { count, first: nsStr(Math.min(...s.map((x) => x[0]))), last: nsStr(Math.max(...s.map((x) => x[1]))), tooMany: count > 4096 };
}
const nsNics = () => [
  { id: "{A1}", name: tr("이더넷", "Ethernet"), desc: "Intel(R) Ethernet Connection I219-LM", addrs: [{ ip: "192.168.0.5", prefix: 24, mask: "255.255.255.0" }, { ip: "192.168.1.200", prefix: 24, mask: "255.255.255.0" }], gateway: "192.168.0.1", mac: "B4:2E:99:F6:AB:3D", up: true, wireless: false, vendor: "GIGA-BYTE" },
  { id: "{B2}", name: "Wi-Fi", desc: "Killer(R) Wi-Fi 6 AX1650x", addrs: [{ ip: "10.0.0.23", prefix: 24, mask: "255.255.255.0" }], gateway: "10.0.0.1", mac: "50:E0:85:E3:47:39", up: true, wireless: true, vendor: "Intel Corporate" },
  { id: "{C3}", name: tr("이더넷 2", "Ethernet 2"), desc: "Realtek USB GbE Family Controller", addrs: [{ ip: "169.254.12.7", prefix: 16, mask: "255.255.0.0" }], gateway: null, mac: "00:E0:4C:68:01:02", up: false, wireless: false, vendor: "REALTEK SEMICONDUCTOR" },
];
// 끝 숫자 → 장비(어느 대역이든 같은 끝 숫자에)
const NS_DEVICES = {
  1: { mac: "28:4E:E9:A9:62:7E", vendor: "mercury corperation", rtt: 1, ports: [80, 443], name: "router.local" },
  5: { me: true, mac: "B4:2E:99:F6:AB:3D", vendor: "GIGA-BYTE", rtt: 0, ports: [] },
  10: { mac: "00:1B:1B:12:34:56", vendor: "Siemens", rtt: 2, ports: [102, 80, 502], ident: { unit: 1, vendor: "PortDock", product: "SIM-PLC", revision: "1.0" } },
  11: { mac: "00:0B:29:0A:0B:0C", vendor: "LS Industrial Systems", rtt: null, ports: [2004, 80] },
  20: { mac: "00:26:92:01:02:03", vendor: "Mitsubishi Electric", rtt: 3, ports: [5000, 5001, 5002] },
  30: { mac: "00:00:BC:11:22:33", vendor: "Rockwell Automation", rtt: 4, ports: [44818, 4840, 80, 443] },
  40: { mac: "00:30:DE:44:55:66", vendor: "WAGO Kontakttechnik GmbH & Co. KG, a very long vendor name", rtt: 6, ports: [502, 1883, 23] },
  55: { mac: "00:01:C0:AA:BB:CC", vendor: "CompuLab", rtt: 12, ports: [5025, 21], name: "scope-lab-2.factory.example" },
  77: { mac: "DA:A1:19:00:00:01", vendor: null, randomMac: true, rtt: 35, ports: [] },
  100: { mac: "B4:2E:99:00:00:64", vendor: "GIGA-BYTE", rtt: null, ports: [], name: "DESKTOP-OFFICE1" },
};
let NS = null; // 지금 찾기 { ch, timer, cancelled, finished }
let NSM = null; // 지금 감시 { ch, timer, log }
function nsSend(ch, e) {
  try {
    ch?.onmessage?.(e);
  } catch (err) {
    window.__pdMock.errors.push(String(err?.stack ?? err));
    setTimeout(() => {
      throw err;
    });
  }
}
function nsScanStart(cfg, ch) {
  if (NS && !NS.finished) return fail(tr("이미 찾는 중입니다", "A scan is already running"));
  let info;
  try {
    info = nsInfo(cfg.range);
  } catch (e) {
    return fail(String(e));
  }
  if (info.tooMany) return fail(`${tr("한 번에 찾을 수 있는 주소 수를 넘었습니다 — 범위를 좁히세요", "Too many addresses for one scan — narrow the range")} (${info.count} > 4096)`);
  if (!cfg.ping && !cfg.arp) return fail(tr("핑과 ARP 가운데 하나는 켜야 합니다", "Turn on ping or ARP (at least one)"));
  const addrs = [];
  for (const [a, b] of nsSpans(cfg.range)) for (let x = a; x <= b; x++) addrs.push(x);
  const uniq = [...new Set(addrs)].sort((x, y) => x - y);
  const t0 = now();
  const job = { ch, cancelled: false, finished: false, found: [] };
  NS = job;
  const nic = cfg.nicIp ? nsIp(cfg.nicIp) : 0;
  let i = 0;
  const finish = () => {
    clearInterval(job.timer);
    const check = cfg.ports.length || cfg.names || cfg.modbusId;
    const n = job.found.length;
    let k = 0;
    const done = () => {
      job.finished = true;
      nsSend(ch, { type: "done", found: n, total: uniq.length, ms: now() - t0, cancelled: job.cancelled });
    };
    if (!check || job.cancelled || !n) {
      for (const h of job.found) nsSend(ch, { type: "host", host: { ...h.host, done: true } });
      return done();
    }
    job.timer = setInterval(() => {
      if (job.cancelled || k >= n) {
        clearInterval(job.timer);
        return done();
      }
      const { host, dev } = job.found[k++];
      const ports = (dev.ports || []).filter((p) => cfg.ports.includes(p));
      nsSend(ch, { type: "host", host: { ...host, ports, name: cfg.names ? (dev.name ?? null) : null, modbus: cfg.modbusId && ports.includes(502) ? (dev.ident ?? null) : null, done: true } });
      nsSend(ch, { type: "progress", phase: "check", done: k, total: n, found: n });
    }, 300);
  };
  job.timer = setInterval(() => {
    if (job.cancelled || i >= uniq.length) return finish();
    const ip = uniq[i++];
    const d = NS_DEVICES[ip & 255];
    const sameNet = (ip & 0xffffff00) >>> 0 === (nic & 0xffffff00) >>> 0;
    const me = !!d?.me && ip === nic;
    if (d && (!d.me || me)) {
      const viaArp = cfg.arp && sameNet;
      const rtt = cfg.ping ? d.rtt : null;
      if (viaArp || rtt != null || me) {
        const known = viaArp || me;
        const host = { ip: nsStr(ip), mac: known ? d.mac : null, vendor: known ? d.vendor : null, randomMac: !!d.randomMac && known, rtt, arp: viaArp && !me, name: null, ports: [], modbus: null, me, done: false };
        job.found.push({ host, dev: d });
        nsSend(ch, { type: "host", host });
      }
    }
    nsSend(ch, { type: "progress", phase: "find", done: i, total: uniq.length, found: job.found.length });
  }, 500);
  return uniq.length;
}
function nsMonitorStart(cfg, logPath, ch) {
  if (!cfg.hosts.length) return fail(tr("감시할 장비를 추가하세요", "Add a host to monitor"));
  const bad = cfg.hosts.filter((h) => unresolvable(h.trim()) || !hostOk(h.trim()));
  if (bad.length) return fail(bad.map((h) => `${tr("주소를 찾지 못했습니다", "Address not found")}: «${h.trim()}»`).join(" · "));
  if (NSM) clearInterval(NSM.timer);
  const targets = cfg.hosts.map((h) => ({ host: h.trim(), ip: /^(\d{1,3}\.){3}\d{1,3}$/.test(h.trim()) ? h.trim() : "192.168.0.50" }));
  const m = { ch, log: logPath ?? null, n: 0 };
  NSM = m;
  if (logPath) files.set(logPath, "time,host,ip,result,rtt_ms,event\n");
  const tick = () => {
    if (NSM !== m) return;
    m.n++;
    const samples = targets.map((t) => {
      const last = Number(t.ip.split(".").pop());
      const down = last === 99 || (last === 30 && m.n % 6 >= 4);
      return { host: t.host, rtt: down ? null : 1 + ((m.n * 7 + last) % 9) };
    });
    nsSend(ch, { type: "tick", ts: now(), samples });
    if (m.log) files.set(m.log, (files.get(m.log) ?? "") + samples.map((s) => `T,${s.host},,${s.rtt == null ? "timeout" : "ok"},${s.rtt ?? ""},`).join("\n") + "\n");
  };
  m.timer = setInterval(tick, Math.max(500, Math.min(cfg.intervalMs, 3000)));
  setTimeout(tick, 50);
  return targets;
}
async function netscan(cmd, a) {
  switch (cmd) {
    case "list_nics":
      await sleep(120);
      return nsNics();
    case "range_info":
      try {
        return nsInfo(a.text);
      } catch (e) {
        return fail(String(e));
      }
    case "scan_start":
      return nsScanStart(a.config, a.onEvent);
    case "scan_cancel":
      if (NS && !NS.finished) NS.cancelled = true;
      return null;
    case "modbus_ident":
      await sleep(300);
      if (a.ip.endsWith(".10")) return { unit: 1, vendor: "PortDock", product: "SIM-PLC", revision: "1.0" };
      return fail(`${tr("예외", "exception")} 01 (${tr("지원하지 않는 기능", "illegal function")})`);
    case "wake": {
      if (!/^([0-9a-f]{2}[:-]?){5}[0-9a-f]{2}$/i.test(a.mac.replace(/[.\s]/g, ""))) return fail(`${tr("MAC 주소 형식이 아닙니다", "Not a MAC address")}: «${a.mac}»`);
      const bc = a.nicIp ? a.nicIp.replace(/\.\d+$/, ".255") : null;
      return [...(bc ? [`${bc}:9`, `${bc}:7`] : []), "255.255.255.255:9", "255.255.255.255:7"];
    }
    case "open_web":
      window.__pdMock.opened = `${a.https ? "https" : "http"}://${a.ip}${a.port && a.port !== 80 && a.port !== 443 ? `:${a.port}` : ""}/`;
      return null;
    case "monitor_start":
      return nsMonitorStart(a.config, a.logPath, a.onEvent);
    case "monitor_stop":
      if (NSM) clearInterval(NSM.timer);
      NSM = null;
      return null;
    case "monitor_set_log":
      if (!NSM) return fail(tr("감시 중이 아닙니다", "Monitor is not running"));
      NSM.log = a.path ?? null;
      if (a.path && !files.has(a.path)) files.set(a.path, "time,host,ip,result,rtt_ms,event\n");
      return null;
  }
  return null;
}
