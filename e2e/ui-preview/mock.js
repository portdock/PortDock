// 화면 확인용 가짜 백엔드 — 실제 장비·통신 없이 화면을 그리고 눌러 본다.
// 실제 명령·반환 모양은 apps/*/src-tauri/src/lib.rs, 사건 모양은 crates/core/src/event.rs 를 따른다.
// 앱 코드는 가져오지 않는다(데이터만). 시험 도구는 window.__pdMock 으로 상태를 보고 바꾼다.
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
mockWindows("main");

// ---- 바깥 네트워크 막기 — 미리보기·smoke 가 오류 자동 전송(Sentry, shared/report.ts)이나 다른 주소로 실제 요청을 보내지 않게.
// 같은 서버(vite) 말고는 모두 여기서 받아 «보낸 셈» 으로 200 을 돌려주고 window.__pdMock.net 에 남긴다(vite.config 의 CSP 가 한 번 더 막는다).
const net = [];
const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  if (url.origin === location.origin) return realFetch(input, init);
  net.push({ url: url.origin + url.pathname, method: init?.method ?? "GET" });
  return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
};
if (navigator.sendBeacon) navigator.sendBeacon = (u) => (net.push({ url: String(u), method: "BEACON" }), true);

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
/** 가짜 장비의 Modbus 읽기 응답(국번 + PDU, CRC·MBAP 없이) — 요청 PDU(01~04)가 아니면 null.
 *  레지스터: 0 = 1812(0x0714), 1 = 0xFFFF(-1), 2·3 = 40 48 F5 C3(F32 3.14), 그 밖은 주소×10. 비트: 주소가 3의 배수면 ON. 주소 1000 이상은 예외 02 */
function mbReadReply(p) {
  if (p.length !== 6 || p[1] < 1 || p[1] > 4) return null;
  const [unit, fc] = p;
  const addr = (p[2] << 8) | p[3];
  const qty = (p[4] << 8) | p[5];
  if (addr >= 1000) return [unit, fc | 0x80, 2];
  if (fc <= 2) {
    const out = new Array(Math.ceil(qty / 8)).fill(0);
    for (let i = 0; i < qty; i++) if ((addr + i) % 3 === 0) out[i >> 3] |= 1 << (i & 7);
    return [unit, fc, out.length, ...out];
  }
  const reg = (a) => (a === 0 ? 0x0714 : a === 1 ? 0xffff : a === 2 ? 0x4048 : a === 3 ? 0xf5c3 : (a * 10) & 0xffff);
  const out = [];
  for (let i = 0; i < qty; i++) out.push(reg(addr + i) >> 8, reg(addr + i) & 0xff);
  return [unit, fc, out.length, ...out];
}
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
  { name: "COM5", kind: "usb", vid: 0x0403, pid: 0x6001, serial_number: "PD000001", manufacturer: "FTDI", product: "USB Serial Port" },
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
  autoReply(rx);
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
function tcpStart(config, framing, rxCheck, ch, sim = false, upstream = null) {
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
  // 서버 · 중계
  if (!hostOk(config.host) || unresolvable(config.host)) return fail(tr(`${config.host}:${config.port}: 주소를 찾지 못했습니다`, `${config.host}:${config.port}: address not found`));
  if (config.port === 445) return fail(inUse(`${config.host}:${config.port}`) + heldBy());
  if (notLocal(config.host)) return fail(notHere(`${config.host}:${config.port}`));
  const local = `${config.host}:${config.port || 50123}`;
  if (config.mode === "relay") return relayStart(config, upstream, rxCheck, framing, ch, local);
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
/** 중계(모니터): A 가 둘 붙고, A→B 요청과 B→A 응답이 번갈아 온다. B 가 nohost·10.0.0.99 면 RELAY FAIL */
function relayStart(config, upstream, rxCheck, framing, ch, local) {
  if (!upstream || !String(upstream.host ?? "").trim() || !(upstream.port > 0)) return fail(tr("이어 줄 장비(B)의 주소와 포트(1~65535)를 넣어 주세요", "Enter the device (B) host and port (1–65535) to relay to"));
  const b = `${upstream.host.trim()}:${upstream.port}`;
  const s = newSession("tcp", ch, { cfg: { ...config }, rxCheck, framing, port: local, server: true, relay: true, upstream: b });
  later(10, () => frames(ev(`RELAY LISTEN ${local} → ${b}`)));
  later(30, () => status("listening", local, null));
  const join = (addr) => {
    if (unresolvable(upstream.host) || upstream.host === "10.0.0.99") {
      frames(ev(tr(`RELAY FAIL ${addr} → ${b}: 응답 없음(시간 초과) — A 쪽 접속을 닫습니다`, `RELAY FAIL ${addr} → ${b}: no answer (timed out) — closing the A side`)));
      return;
    }
    s.online = true;
    s.peers.push({ id: ++s.seq, addr });
    frames(ev(`RELAY ${addr} ⇄ ${b}`));
    send({ type: "peers", peers: peerList() });
  };
  later(400, () => join("192.168.0.20:51234"));
  later(1200, () => join("192.168.0.21:50000"));
  every(700, () => {
    if (!s.peers.length) return;
    s.tick = (s.tick ?? 0) + 1;
    const p = s.peers[s.tick % s.peers.length];
    const tid = s.tick & 0xffff;
    const req = [tid >> 8, tid & 0xff, 0, 0, 0, 6, 1, 3, 0, 0, 0, 2];
    const rsp = [tid >> 8, tid & 0xff, 0, 0, 0, 7, 1, 3, 4, 0, 100 + (s.tick % 50), 0, 200];
    frames(data("rx", req, verify(s.rxCheck, req), p.addr));
    later(40, () => frames(data("tx", rsp, verify(s.rxCheck, rsp), p.addr)));
  });
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
  else {
    if (s.cfg?.echo) frames(data("tx", rx, null, p.addr));
    autoReply(rx, p.addr);
  }
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
  if (config.bindPort === 445) return fail(inUse(`${config.bindHost}:${config.bindPort}`) + heldBy());
  if (notLocal(config.bindHost)) return fail(notHere(`${config.bindHost}:${config.bindPort}`));
  const mif = (config.multicastIf ?? "0.0.0.0").trim() || "0.0.0.0";
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(mif)) return fail(tr(`랜카드 주소가 아닙니다: ${mif}`, `Not a network interface address: ${mif}`));
  if (notLocal(mif)) return fail(tr(`${mif} 는 이 PC 의 랜카드 주소가 아닙니다.`, `${mif} is not an address of this PC.`));
  const ttl = config.multicastTtl ?? 1;
  if (!(ttl >= 1 && ttl <= 255)) return fail(tr("멀티캐스트 TTL 은 1~255 입니다", "Multicast TTL must be 1–255"));
  const g = (config.multicastGroup ?? "").trim();
  if (g) {
    const m = g.match(/^(\d+)\.\d+\.\d+\.\d+$/);
    if (!m) return fail(tr(`멀티캐스트 주소가 아닙니다: ${g}`, `Not a multicast address: ${g}`));
    if (+m[1] < 224 || +m[1] > 239) return fail(tr(`${g} 는 멀티캐스트 주소(224.0.0.0~239.255.255.255)가 아닙니다`, `${g} is not a multicast address (224.0.0.0–239.255.255.255)`));
  }
  const local = `${config.bindHost}:${config.bindPort || 50124}`;
  const s = newSession(sim ? "sim-udp" : "udp", ch, { cfg: { ...config }, rxCheck, port: local, online: true, remote: `${config.remoteHost}:${config.remotePort}`, seen: [] });
  later(10, () => {
    frames(ev(`BIND ${local}${g ? ` multicast ${g}` : ""}${mif !== "0.0.0.0" ? ` if ${mif}` : ""}${ttl !== 1 ? ` ttl ${ttl}` : ""}${config.multicastLoop === false ? " noloop" : ""}`));
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
    else {
      if (s.cfg.echo) frames(data("tx", rx, null, from));
      autoReply(rx, from);
    }
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

// ---- 자동응답(Simulator 규칙 + Serial·TCP·UDP «자동응답») — core autoreply.rs 흉내
// enabled: Serial·TCP·UDP 의 «켜기»(set_auto_reply). Simulator 는 늘 응답한다
const sim = { rules: [], hits: {}, matched: {}, opts: { stripTerminator: true, logNoMatch: true }, enabled: false };
const PLACE = /\{(req|counter|rand|time|unix|crc)(?: ([^}]*))?\}/g;
/** «a..b»·«a» → [처음, 끝] (끝 포함, 음수는 끝에서) */
function span(text, len) {
  const [a, b] = text.includes("..") ? text.split("..") : [text, text];
  const at = (x, d) => (x === "" ? d : Number(x) < 0 ? len + Number(x) : Number(x));
  const lo = at(a, 0);
  const hi = at(b, len - 1);
  if (!(lo >= 0 && hi < len && lo <= hi) || Number.isNaN(lo + hi)) throw tr(`범위 ${text} 가 길이 ${len} 바이트를 벗어납니다`, `range ${text} is outside the ${len}-byte length`);
  return [lo, hi + 1];
}
const putNum = (v, size, le, dec) => {
  if (dec) return ascii(String(v));
  const out = [];
  for (let i = size - 1; i >= 0; i--) out.push(Math.floor(v / 2 ** (8 * i)) & 0xff);
  return le ? out.reverse() : out;
};
/** 응답 템플릿 → 바이트(요청·횟수로 채움). 틀리면 문자열을 던진다 */
function renderTpl(spec, req, counter = 0) {
  const body = [];
  const crcs = [];
  let last = 0;
  const lit = (t) => body.push(...(spec.mode === "hex" ? parseHex(t) : parseAscii(t)));
  for (const m of (spec.text ?? "").matchAll(PLACE)) {
    lit(spec.text.slice(last, m.index));
    last = m.index + m[0].length;
    const w = (m[2] ?? "").trim().split(/\s+/).filter(Boolean);
    const size = Number(w.find((x) => /^[1248]$/.test(x)) ?? 0);
    const le = w.includes("le");
    const dec = w.includes("dec");
    if (m[1] === "req") {
      const [a, b] = span(w[0] ?? "..", req.length);
      body.push(...req.slice(a, b));
    } else if (m[1] === "counter") body.push(...putNum(counter, size || 1, le, dec));
    else if (m[1] === "rand") {
      const [lo, hi] = (w[0] ?? "0..255").split("..").map(Number);
      const v = lo + Math.floor(Math.random() * (hi - lo + 1));
      body.push(...putNum(v, size || (hi < 256 ? 1 : hi < 65536 ? 2 : 4), le, dec));
    } else if (m[1] === "time") body.push(...ascii(new Date().toTimeString().slice(0, 8)));
    else if (m[1] === "unix") body.push(...ascii(String(w[0] === "ms" ? Date.now() : Math.floor(Date.now() / 1000))));
    else crcs.push({ at: body.length, kind: w[0], range: w.find((x) => x.includes("..")), swap: w.includes("swap") });
  }
  lit((spec.text ?? "").slice(last));
  const sums = crcs.map((c) => {
    const [a, b] = c.range ? span(c.range, body.length) : [0, c.at];
    if (b <= a) throw tr("{crc} 앞에 계산할 바이트가 없습니다", "{crc} has no bytes before it");
    const v = compute(c.kind === "modbus" ? "crc16-modbus" : c.kind, body.slice(a, b));
    return { at: c.at, v: c.swap ? [...v].reverse() : v };
  });
  for (const x of sums.reverse()) body.splice(x.at, 0, ...x.v);
  return build({ text: body.map(hex2).join(" "), mode: "hex", checksum: spec.checksum, suffix: spec.suffix });
}
/** 이 PC 랜카드(core net.rs interfaces 모양) */
const IFACES = [
  { name: tr("이더넷", "Ethernet"), description: "Intel(R) Ethernet Connection I219-LM", ipv4: "192.168.0.15", prefix: 24, mask: "255.255.255.0", gateway: "192.168.0.1", up: true, loopback: false },
  { name: tr("이더넷 2 (장비망)", "Ethernet 2 (machines)"), description: "ASIX AX88179 USB 3.0 to Gigabit Ethernet Adapter", ipv4: "10.10.1.23", prefix: 16, mask: "255.255.0.0", up: true, loopback: false },
  { name: "Loopback Pseudo-Interface 1", description: "Software Loopback Interface 1", ipv4: "127.0.0.1", prefix: 8, mask: "255.0.0.0", up: true, loopback: true },
  { name: "Wi-Fi", description: "Intel(R) Wi-Fi 6 AX201 160MHz", ipv4: "169.254.33.7", prefix: 16, mask: "255.255.0.0", up: false, loopback: false },
];
/** 이 PC 에 없는 주소(0.0.0.0·127.x·이름은 통과) */
const notLocal = (h) => /^\d+\.\d+\.\d+\.\d+$/.test(h) && h !== "0.0.0.0" && !h.startsWith("127.") && !IFACES.some((i) => i.ipv4 === h);
const notHere = (addr) =>
  `${addr}: ${tr("이 PC 에 없는 주소입니다(랜카드 주소 확인)", "Address not available on this PC (check the network adapter address)")} (os error 10049) — ${tr("이 PC 주소: 192.168.0.15 (이더넷), 10.10.1.23 (이더넷 2) · 0.0.0.0 = 모든 랜카드", "This PC: 192.168.0.15 (Ethernet), 10.10.1.23 (Ethernet 2) · 0.0.0.0 = all adapters")}`;
const heldBy = () => tr(" — 쥔 프로그램: System (PID 4)", " — held by System (PID 4)");
/** core tcp.rs decode_mbap 흉내 */
function decodeMbap(b) {
  if (b.length < 8 || b[2] !== 0 || b[3] !== 0) return null;
  const length = (b[4] << 8) | b[5];
  const unit = b[6];
  const fn = b[7];
  const names = { 1: "Read Coils", 2: "Read Discrete Inputs", 3: "Read Holding Registers", 4: "Read Input Registers", 5: "Write Single Coil", 6: "Write Single Register", 15: "Write Multiple Coils", 16: "Write Multiple Registers" };
  const name = names[fn & 0x7f] ?? "Unknown";
  let modbus;
  if (fn & 0x80) modbus = { slave: unit, function: fn, function_name: name, kind: "exception", crc_ok: true, fields: [["exception", `0x${hex2(b[8] ?? 0)}`]], values: [] };
  else if (b.length === 12 && fn <= 6) modbus = { slave: unit, function: fn, function_name: name, kind: "request", crc_ok: true, fields: [["start", String((b[8] << 8) | b[9])], ["quantity", String((b[10] << 8) | b[11])]], values: [] };
  else {
    const vals = [];
    for (let i = 9; i + 1 < b.length; i += 2) vals.push((b[i] << 8) | b[i + 1]);
    modbus = { slave: unit, function: fn, function_name: name, kind: "response", crc_ok: true, fields: [["byte count", String(b[8] ?? 0)]], values: vals };
  }
  const summary = modbus.kind === "request" ? `id${unit} FC${hex2(fn)} HR ${modbus.fields[0][1]}.. (${modbus.fields[1][1]})` : `id${unit} FC${hex2(fn & 0x7f)} ${tr("정상", "OK")}`;
  return { transaction: (b[0] << 8) | b[1], protocol: 0, length, unit, lengthOk: length === b.length - 6, modbus, summary };
}
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
  // 와일드카드를 끈 ASCII 규칙(core wild:false)은 ?·* 도 글자 그대로. 칸이 없으면 켜짐(예전 규칙)
  if (r.wild === false) return parseAscii(r.pattern);
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
function ruleMatches(r, req) {
  try {
    const pat = compilePattern(r);
    return r.kind === "exact" ? matchAt(pat, req) : matchAt(["*", ...pat, "*"], req);
  } catch {
    return false;
  }
}
function simReply(rx, peer) {
  let req = rx;
  if (sim.opts.stripTerminator) while (req.length && (req[req.length - 1] === 13 || req[req.length - 1] === 10)) req = req.slice(0, -1);
  for (const r of sim.rules) {
    if (!ruleMatches(r, req)) continue;
    const m = (sim.matched[r.name] = (sim.matched[r.name] ?? 0) + 1);
    if (r.dropEvery > 0 && m % r.dropEvery === 0) return frames(ev(tr(`DROP ${r.name} — ${r.dropEvery}번째마다 무응답`, `DROP ${r.name} — every ${r.dropEvery}th request unanswered`)));
    if (r.dropPct > 0 && Math.random() * 100 < r.dropPct) return frames(ev(tr(`DROP ${r.name} — 확률 ${r.dropPct}%`, `DROP ${r.name} — ${r.dropPct}% chance`)));
    const all = [r.reply, ...(r.moreReplies ?? [])];
    const count = sim.hits[r.name] ?? 0;
    const pick = all.length < 2 ? 0 : r.replyOrder === "random" ? Math.floor(Math.random() * all.length) : count % all.length;
    let bytes;
    try {
      bytes = renderTpl(all[pick], rx, count);
    } catch (e) {
      return frames(ev(`AUTO ${r.name} — ${e}`));
    }
    sim.hits[r.name] = count + 1;
    const delay = (r.delayMaxMs ?? 0) > r.delayMs ? r.delayMs + Math.floor(Math.random() * (r.delayMaxMs - r.delayMs + 1)) : r.delayMs;
    frames(ev(`AUTO ${r.name}${all.length > 1 ? ` [${pick + 1}/${all.length}]` : ""}${(r.delayMaxMs ?? 0) > r.delayMs ? ` +${delay}ms` : ""}`));
    later(Math.min(delay, 300), () => frames(data("tx", bytes, null, peer)));
    return;
  }
  if (sim.opts.logNoMatch && sim.rules.length) frames(ev("NO MATCH"));
}
/** Serial·TCP·UDP — «켜기» 일 때만 */
const autoReply = (rx, peer) => sim.enabled && simReply(rx, peer);
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
  /** 오류로 꺼진 기록이 하나 남아 있는 것처럼(report_pending) — 켤 때 묻는 창. 주소에 «?pendingCrash=1» 이어도 켜진다. 지우기(report_dismiss)하면 꺼진다 */
  pendingCrash: new URLSearchParams(location.search).has("pendingCrash"),
  /** true 면 open_app 이 «이 PC 에서 찾지 못함»(false) — 복사 + 내려받기 페이지 알림. openedApp 에 연 대상이 남는다 */
  noApp: false,
  openedApp: null,
  /** 막아 둔 바깥 요청(오류 자동 전송 등) — 실제로는 나가지 않는다 */
  net,
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
      // CrashReport(crates/core/src/report.rs, camelCase) — 덤프 없는 화면 쪽 기록 하나
      return window.__pdMock.pendingCrash ? [{ name: "crash-20261025-101500.txt", text: "PortDock crash report\nmessage: preview crash\n", dump: null, dumpSize: null }] : [];
    case "report_dismiss":
      window.__pdMock.pendingCrash = false;
      return null;
    case "report_read_dump":
      return new Uint8Array([0x4d, 0x44, 0x4d, 0x50]).buffer;
    // 명령줄 인자(0.2.0, Modbus Master) — 주소 «?args=["--tcp","1.2.3.4:502"]»(JSON 배열)
    case "launch_args":
      try {
        const v = JSON.parse(new URLSearchParams(location.search).get("args") ?? "[]");
        return Array.isArray(v) ? v.map(String) : [];
      } catch {
        return [];
      }
    // 다른 PortDock 프로그램으로 열기(0.3.0, core launch::Target) — 연 것을 남긴다. __pdMock.noApp = true 면 «찾지 못함»
    case "open_app":
      if (!a.target || !["modbus-master", "serial", "tcp"].includes(a.target.app)) return fail(tr("넘길 값이 잘못되었습니다", "Invalid value to pass"));
      if (window.__pdMock.noApp) return false;
      window.__pdMock.openedApp = { ...a.target };
      return true;
    // 연결·기록 중 절전 막기(0.3.0) — 실제로는 아무것도 하지 않고 지금 값만 남긴다
    case "keep_awake":
      window.__pdMock.awake = !!a.on;
      return !!a.on;
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
        // Modbus RTU 읽기 요청(CRC 맞음)이면 그 요청에 맞는 응답, 아니면 늘 같은 짧은 응답
        const mb = b.bytes.length === 8 && verify("crc16-modbus", b.bytes) === true ? mbReadReply(b.bytes.slice(0, 6)) : null;
        const reply = withCrc(mb ?? [1, 3, 2, 0, 42]);
        if (S.kind === "serial") later(60, () => frames(data("rx", reply, verify(S.rxCheck, reply))));
        return S.kind === "serial" ? b.bytes : null;
      }
      if (S.kind === "sim-udp") return udpSend(null, a.spec).then(() => null);
      // TCP · Simulator TCP
      if (!S.peers.length) return fail(S.relay ? tr("이어진 중계 쌍이 없습니다", "No relayed pair is connected") : tr("연결된 상대가 없습니다", "No peer is connected"));
      if (a.mbapTid && b.bytes.length >= 8 && b.bytes[2] === 0 && b.bytes[3] === 0 && ((b.bytes[4] << 8) | b.bytes[5]) === b.bytes.length - 6) {
        S.tid = ((S.tid ?? 0) + 1) & 0xffff;
        b.bytes[0] = S.tid >> 8;
        b.bytes[1] = S.tid & 0xff;
      }
      if (S.relay) {
        const pairs = a.target != null ? S.peers.filter((x) => x.id === a.target) : S.peers;
        if (!pairs.length) return fail(tr("그 상대는 이미 끊겼습니다", "That peer is already gone"));
        const toB = a.side === "b";
        if (!toB) frames(ev(tr(`INJECT → A (${b.bytes.length}바이트)`, `INJECT → A (${b.bytes.length} bytes)`)));
        for (const p of pairs) {
          if (toB) frames(ev(tr(`INJECT → B ${S.upstream} (${b.bytes.length}바이트)`, `INJECT → B ${S.upstream} (${b.bytes.length} bytes)`)));
          frames(data(toB ? "rx" : "tx", b.bytes, null, p.addr));
        }
        return { sent: pairs.length, total: pairs.length };
      }
      // Modbus TCP 읽기 요청이면 상대(가짜 장비)가 같은 트랜잭션 ID 로 답한다
      const mbTcp = (to) => {
        const q = b.bytes;
        if (!(q.length === 12 && q[2] === 0 && q[3] === 0 && ((q[4] << 8) | q[5]) === 6)) return;
        const r = mbReadReply(q.slice(6));
        if (!r) return;
        const reply = [q[0], q[1], 0, 0, (r.length >> 8) & 0xff, r.length & 0xff, ...r];
        later(60, () => frames(data("rx", reply, null, to)));
      };
      if ("target" in a && a.target != null) {
        const p = S.peers.find((x) => x.id === a.target);
        if (!p) return fail(tr("그 상대는 이미 끊겼습니다", "That peer is already gone"));
        frames(data("tx", b.bytes, null, p.addr));
        mbTcp(p.addr);
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
      if (S.kind === "tcp" && S.peers.length) mbTcp(S.peers[0].addr);
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
      return "mode" in a.config ? tcpStart(a.config, a.framing, a.rxCheck, a.onEvent, false, a.upstream) : udpStart(a.config, a.rxCheck, a.onEvent);
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
          for (const x of [r.reply, ...(r.moreReplies ?? [])]) renderTpl(x, Array(260).fill(0));
          if ((r.dropPct ?? 0) > 100) throw tr("버릴 확률은 0~100% 입니다", "Drop probability must be 0–100%");
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
    case "set_auto_reply":
      sim.enabled = !!a.on;
      return null;
    case "preview_rule": {
      const r = a.rule;
      let request;
      try {
        if (!r.pattern.trim()) throw tr("패턴이 비어 있습니다", "The pattern is empty");
        compilePattern(r);
        request = r.patternMode === "hex" ? parseHex(a.sample ?? "") : parseAscii(a.sample ?? "");
      } catch (e) {
        return fail(String(e));
      }
      let core = request;
      if (sim.opts.stripTerminator) while (core.length && (core[core.length - 1] === 13 || core[core.length - 1] === 10)) core = core.slice(0, -1);
      const replies = [r.reply, ...(r.moreReplies ?? [])].map((x) => {
        try {
          return { bytes: renderTpl(x, request, 0) };
        } catch (e) {
          return { error: String(e) };
        }
      });
      const dynamic = [r.reply, ...(r.moreReplies ?? [])].some((x) => /\{(req|counter|rand|time|unix)\b/.test(x.text));
      return { request, matches: request.length ? ruleMatches(r, core) || ruleMatches(r, request) : null, replies, dynamic };
    }
    case "interfaces":
      return IFACES.map((i) => ({ ...i }));
    case "decode_mbap":
      return decodeMbap(a.bytes);
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
    // Modbus Master 는 이름이 겹치는 명령(open·close …)이 있어 창 제목으로 가린다
    // SCPI 도 이름이 겹치는 명령(open_tcp·close·query …)이 있어 창 제목으로 가린다
    // Plot 명령은 이름이 plot_ 으로 시작해 겹치지 않는다(write_bytes 도 Plot 만 쓴다)
    if (PLOT_CMDS.has(cmd)) return plot(cmd, a);
    // Port Inspector·Serial «연결 점검…» 명령은 pi_·loop_ 으로 시작해 겹치지 않는다
    if (PI_CMDS.has(cmd)) return pinsp(cmd, a);
    // Hardware Tester 명령(rec_·bt_·wifi_signal)은 다른 앱과 겹치지 않는다
    if (HW_CMDS.has(cmd)) return hwsim(cmd, a);
    // PLC Simulator 도 이름이 겹치는 명령(start·stop·set_faults·get_values …)이 있어 창 제목으로 가린다
    if (PLC_CMDS.has(cmd) && isPLC()) return plcsim(cmd, a);
    if (SCPI_CMDS.has(cmd) && isSCPI()) return scpi(cmd, a);
    if (MM_CMDS.has(cmd) && isMM()) return mmaster(cmd, a);
    return NETSCAN.has(cmd) ? netscan(cmd, a) : handle(cmd, a);
  },
  { shouldMockEvents: true },
);

// ================================================================ Net Scan (apps/netscan — 명령: apps/netscan/src-tauri/src/lib.rs)
// 위 공용 세션(S)과 따로 논다. 범위의 주소를 0.5초에 하나씩 «찾는다»(/24 는 2분 남짓 — 다 눌러 보기 동안 계속 찾는 중이도록).
// 일부러 실패하는 입력: 범위 4096개 초과, 감시 장비 «nohost»(찾지 못함), 감시 IP 끝이 .99(늘 시간 초과).
const NETSCAN = new Set(["list_nics", "range_info", "scan_start", "scan_cancel", "modbus_ident", "wake", "open_web", "open_master", "monitor_start", "monitor_stop", "monitor_set_log"]);
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
  { id: "{A1}", name: tr("이더넷", "Ethernet"), desc: "Intel(R) Ethernet Connection I219-LM", addrs: [{ ip: "192.168.0.5", prefix: 24, mask: "255.255.255.0" }, { ip: "192.168.1.200", prefix: 24, mask: "255.255.255.0" }], gateway: "192.168.0.1", mac: "02:00:5E:10:00:05", up: true, wireless: false, vendor: "GIGA-BYTE" },
  { id: "{B2}", name: "Wi-Fi", desc: "Wireless Network Adapter", addrs: [{ ip: "10.0.0.23", prefix: 24, mask: "255.255.255.0" }], gateway: "10.0.0.1", mac: "02:00:5E:10:00:17", up: true, wireless: true, vendor: "Intel Corporate" },
  { id: "{C3}", name: tr("이더넷 2", "Ethernet 2"), desc: "Realtek USB GbE Family Controller", addrs: [{ ip: "169.254.12.7", prefix: 16, mask: "255.255.0.0" }], gateway: null, mac: "00:E0:4C:68:01:02", up: false, wireless: false, vendor: "REALTEK SEMICONDUCTOR" },
];
// 끝 숫자 → 장비(어느 대역이든 같은 끝 숫자에)
const NS_DEVICES = {
  1: { mac: "28:4E:E9:A9:62:7E", vendor: "mercury corperation", rtt: 1, ports: [80, 443], name: "router.local" },
  5: { me: true, mac: "02:00:5E:10:00:05", vendor: "GIGA-BYTE", rtt: 0, ports: [] },
  // .10 — 확인 단계에서 MAC 이 하나 더 보임(IP 충돌 의심, 0.2.0)
  10: { mac: "00:1B:1B:12:34:56", vendor: "Siemens", rtt: 2, ports: [102, 80, 502], ident: { unit: 1, vendor: "PortDock", product: "SIM-PLC", revision: "1.0" }, conflict: ["00:1B:1B:12:34:56", "00:0B:29:0A:0B:99"] },
  11: { mac: "00:0B:29:0A:0B:0C", vendor: "LS Industrial Systems", rtt: null, ports: [2004, 80] },
  20: { mac: "00:26:92:01:02:03", vendor: "Mitsubishi Electric", rtt: 3, ports: [5000, 5001, 5002] },
  30: { mac: "00:00:BC:11:22:33", vendor: "Rockwell Automation", rtt: 4, ports: [44818, 4840, 80, 443] },
  40: { mac: "00:30:DE:44:55:66", vendor: "WAGO Kontakttechnik GmbH & Co. KG, a very long vendor name", rtt: 6, ports: [502, 1883, 23] },
  55: { mac: "00:01:C0:AA:BB:CC", vendor: "CompuLab", rtt: 12, ports: [5025, 21], name: "scope-lab-2.factory.example" },
  77: { mac: "DA:A1:19:00:00:01", vendor: null, randomMac: true, rtt: 35, ports: [] },
  100: { mac: "02:00:5E:10:00:64", vendor: "GIGA-BYTE", rtt: null, ports: [], name: "DESKTOP-OFFICE1" },
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
      nsSend(ch, { type: "host", host: { ...host, ports, name: cfg.names ? (dev.name ?? null) : null, modbus: cfg.modbusId && ports.includes(502) ? (dev.ident ?? null) : null, conflict: host.mac && dev.conflict ? dev.conflict : [], done: true } });
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
        const host = { ip: nsStr(ip), mac: known ? d.mac : null, vendor: known ? d.vendor : null, randomMac: !!d.randomMac && known, rtt, arp: viaArp && !me, name: null, ports: [], modbus: null, me, done: false, conflict: [] };
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
    // Modbus Master 로 열기(0.2.0) — 연 것을 남긴다. __pdMock.noMaster = true 면 «찾지 못함»
    case "open_master":
      try {
        nsIp(a.ip);
      } catch (e) {
        return fail(String(e));
      }
      if (window.__pdMock.noMaster) return false;
      window.__pdMock.master = { ip: a.ip, port: a.port, unit: a.unit };
      return true;
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

// ================================================================ Modbus Master (apps/modbus-master — 명령: apps/modbus-master/src-tauri/src/lib.rs)
// 창 제목이 «… PortDock Modbus Master» 일 때만 이 부분이 받는다(open·close 같은 이름이 다른 앱과 겹친다).
// 가짜 장비: 국번 1·2 는 모든 표의 0~199 에 답하고(밖은 예외 02), 17 은 늘 예외 01, 나머지는 무응답(타임아웃).
// 입력 레지스터 0 = 카운터, 1 = 사인, 보유 레지스터 10~11 = F32(CDAB) 온도, 코일 0 = 깜빡임.
const MM_CMDS = new Set(["open", "open_tcp", "close", "reconfigure", "set_tables", "set_timing", "set_addr_style", "set_paused", "read_once", "write", "preview_write", "scan_ids", "scan_addrs", "scan_cancel", "get_stats", "reset_stats", "set_log", "append_text"]);
const isMM = () => /Modbus Master/.test(document.title);
const mmNewStats = () => ({ requests: 0, ok: 0, exceptions: 0, timeouts: 0, crc: 0, bad: 0, sendErrors: 0, avgMs: 0, maxMs: 0, lastMs: 0, _sum: 0, _n: 0 });
const MMD = { coils: new Array(200).fill(0), discrete: Array.from({ length: 200 }, (_, i) => (i % 3 === 0 ? 1 : 0)), holding: Array.from({ length: 200 }, (_, i) => i * 10), input: new Array(200).fill(0) };
let MMS = null; // { wire, tables, timing, paused, style, next: {}, tid, stats: {total, tables}, scan, t0 }
function mmF32Cdab(v) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, v);
  return [dv.getUint16(2), dv.getUint16(0)];
}
function mmSimTick() {
  const t = (now() - (MMS?.t0 ?? now())) / 1000;
  MMD.input[0] = (MMD.input[0] + 1) & 0xffff;
  MMD.input[1] = Math.round(1000 + 500 * Math.sin(t / 2)) & 0xffff;
  [MMD.holding[10], MMD.holding[11]] = mmF32Cdab(21.5 + Math.sin(t / 3) * 2);
  MMD.coils[0] = Math.floor(t) % 2;
}
const MM_TB = { 1: ["CO", "0", MMD.coils], 2: ["DI", "1", MMD.discrete], 3: ["HR", "4", MMD.holding], 4: ["IR", "3", MMD.input] };
const mmAddr = (fc, a) => (MMS?.style?.plc ? MM_TB[[5, 15].includes(fc) ? 1 : [6, 16].includes(fc) ? 3 : fc][1] + String(a + 1).padStart(a < 9999 ? 4 : 5, "0") : String(a + (MMS?.style?.base ?? 0)));
const mmSpan = (fc, a, n) => (n > 1 ? `${mmAddr(fc, a)}..${mmAddr(fc, a + n - 1)}` : mmAddr(fc, a));
const mmTbl = (fc) => MM_TB[[5, 15].includes(fc) ? 1 : [6, 16].includes(fc) ? 3 : fc][0];
const mmFrame = (unit, pdu) => (MMS.wire === "tcp" ? mbap(MMS.tid, unit, pdu) : withCrc([unit, ...pdu]));
const mmList = (v, max = 8) => v.slice(0, max).join(", ") + (v.length > max ? ", …" : "");
const MM_EXC = { 1: ["지원하지 않는 함수", "Illegal Function"], 2: ["없는 주소", "Illegal Data Address"] };
const mmExcText = (c) => tr(`예외 0${c} ${MM_EXC[c][0]} (${MM_EXC[c][1]})`, `exception 0${c} ${MM_EXC[c][1]}`);
/** 요청 하나 — { lines, outcome, rttMs } */
function mmTransact(unit, fc, start, qtyOrVals, table, timeoutMs = MMS.timing.timeoutMs) {
  MMS.tid = (MMS.tid + 1) & 0xffff;
  const ts = now();
  const write = [5, 6, 15, 16].includes(fc);
  const qty = write ? (fc === 5 || fc === 6 ? 1 : qtyOrVals.length) : qtyOrVals;
  let pdu;
  if (fc === 5) pdu = [5, start >> 8, start & 255, qtyOrVals[0] ? 0xff : 0, 0];
  else if (fc === 6) pdu = [6, start >> 8, start & 255, qtyOrVals[0] >> 8, qtyOrVals[0] & 255];
  else if (fc === 15) {
    const bytes = new Array(Math.ceil(qty / 8)).fill(0);
    qtyOrVals.forEach((b, i) => b && (bytes[i >> 3] |= 1 << (i & 7)));
    pdu = [15, start >> 8, start & 255, qty >> 8, qty & 255, bytes.length, ...bytes];
  } else if (fc === 16) pdu = [16, start >> 8, start & 255, qty >> 8, qty & 255, qty * 2, ...qtyOrVals.flatMap((v) => [v >> 8, v & 255])];
  else pdu = [fc, start >> 8, start & 255, qty >> 8, qty & 255];
  const head = MMS.wire === "tcp" ? `#${MMS.tid} ` : "";
  const what = write ? `${mmTbl(fc)} ${mmSpan(fc, start, qty)} ← ${mmList(fc === 5 ? [qtyOrVals[0] ? "ON" : "OFF"] : qtyOrVals)}` : `${mmTbl(fc)} ${mmSpan(fc, start, qty)} (${qty})`;
  const req = mmFrame(unit, pdu);
  const lines = [{ ts, dir: "tx", bytes: req, check: null, sum: `${head}id${unit} FC${hex2(fc)} ${what}`, table }];
  if (!S?.online) {
    const why = tr("포트가 끊겨 있습니다", "The port is disconnected");
    return { lines: [{ ts, dir: "ev", bytes: [], check: null, note: `SEND FAIL ${why}`, table }], outcome: { result: "send-error", why }, rttMs: 0, ts };
  }
  if (unit !== 1 && unit !== 2 && unit !== 17) {
    lines.push({ ts: ts + timeoutMs, dir: "ev", bytes: [], check: null, note: `TIMEOUT ${timeoutMs} ms · id${unit}`, table });
    return { lines, outcome: { result: "timeout" }, rttMs: 0, ts };
  }
  const rtt = 3 + Math.round(Math.random() * 9);
  const reply = (rpdu, sum, outcome) => {
    lines.push({ ts: ts + rtt, dir: "rx", bytes: mmFrame(unit, rpdu), check: MMS.wire === "tcp" ? null : true, sum: `${head}id${unit} FC${hex2(fc)} ${mmTbl(fc)} ${mmSpan(fc, start, qty)} → ${sum} · ${rtt} ms`, table });
    return { lines, outcome, rttMs: rtt, ts };
  };
  if (unit === 17) return reply([fc | 0x80, 1], mmExcText(1), { result: "exception", code: 1 });
  if (start + qty > 200) return reply([fc | 0x80, 2], mmExcText(2), { result: "exception", code: 2 });
  const ok = tr("정상", "OK");
  if (write) {
    const arr = fc === 5 || fc === 15 ? MMD.coils : MMD.holding;
    (fc === 5 ? [qtyOrVals[0] ? 1 : 0] : qtyOrVals).forEach((v, i) => (arr[start + i] = fc === 15 || fc === 5 ? (v ? 1 : 0) : v & 0xffff));
    return reply(fc === 5 || fc === 6 ? pdu : pdu.slice(0, 5), ok, { result: "ok", values: [] });
  }
  const vals = MM_TB[fc][2].slice(start, start + qty);
  const data = fc <= 2 ? (() => {
    const b = new Array(Math.ceil(qty / 8)).fill(0);
    vals.forEach((v, i) => v && (b[i >> 3] |= 1 << (i & 7)));
    return b;
  })() : vals.flatMap((v) => [v >> 8, v & 255]);
  return reply([fc, data.length, ...data], `${ok}: ${mmList(vals, fc <= 2 ? 16 : 8)}`, { result: "ok", values: vals });
}
function mmCount(table, o, rtt) {
  for (const st of [MMS.stats.total, ...(table != null ? [(MMS.stats.tables[String(table)] ??= mmNewStats())] : [])]) {
    st.requests++;
    if (o.result === "ok" || o.result === "broadcast") st.ok++;
    else if (o.result === "exception") st.exceptions++;
    else if (o.result === "timeout") st.timeouts++;
    else if (o.result === "send-error") st.sendErrors++;
    else st.bad++;
    if (rtt > 0) {
      st._sum += rtt;
      st._n++;
      st.avgMs = st._sum / st._n;
      st.maxMs = Math.max(st.maxMs, rtt);
      st.lastMs = rtt;
    }
  }
}
function mmPoll(t, batch) {
  const r = mmTransact(t.unit, t.fc, t.start, t.qty, t.id);
  mmCount(t.id, r.outcome, r.rttMs);
  batch.lines.push(...r.lines);
  batch.polls.push({ table: t.id, ts: r.ts, outcome: r.outcome, rttMs: r.rttMs, tries: 1 });
}
function mmTick() {
  if (!MMS || MMS.scan) return;
  mmSimTick();
  const batch = { type: "batch", lines: [], polls: [] };
  const n = now();
  if (!MMS.paused)
    for (const t of MMS.tables) {
      if (!t.enabled || !t.intervalMs) continue;
      // 가짜라 너무 빨리 돌지 않게 0.3초보다 짧은 주기는 0.3초로
      if ((MMS.next[t.id] ?? 0) > n) continue;
      MMS.next[t.id] = n + Math.max(300, t.intervalMs);
      mmPoll(t, batch);
    }
  if (batch.lines.length || batch.polls.length) send(batch);
}
function mmStart(ch, wire, setup, extra) {
  MMS = { wire, tables: setup.tables, timing: setup.timing, paused: setup.paused, style: setup.style, next: {}, tid: 0, stats: { total: mmNewStats(), tables: {} }, scan: null, t0: now(), ...extra };
  every(100, mmTick);
}
function mmStatsOut() {
  const strip = (s) => {
    const { _sum, _n, ...rest } = s;
    void _sum;
    void _n;
    return rest;
  };
  if (!MMS) return { total: strip(mmNewStats()), tables: {} };
  return { total: strip(MMS.stats.total), tables: Object.fromEntries(Object.entries(MMS.stats.tables).map(([k, v]) => [k, strip(v)])) };
}
function mmScanRun(kind, cfg) {
  const s = S;
  const units = kind === "ids" ? Array.from({ length: cfg.to - cfg.from + 1 }, (_, i) => cfg.from + i) : null;
  const total = kind === "ids" ? units.length : cfg.to - cfg.from + 1;
  let i = 0;
  let found = 0;
  const ranges = [];
  MMS.scan = { cancelled: false };
  const job = MMS.scan;
  const finish = (stopped = null) => {
    clearInterval(job.timer);
    if (MMS && MMS.scan === job) MMS.scan = null;
    if (S === s) send({ type: "scan-done", kind, found, cancelled: job.cancelled, stopped });
  };
  job.timer = setInterval(() => {
    if (S !== s || !MMS) return clearInterval(job.timer);
    if (job.cancelled) return finish();
    const batch = { type: "batch", lines: [], polls: [] };
    if (kind === "ids") {
      // 한 번에 4개씩
      for (let k = 0; k < 4 && i < units.length; k++, i++) {
        const r = mmTransact(units[i], cfg.fc, cfg.addr, 1, undefined, cfg.timeoutMs);
        mmCount(null, r.outcome, r.rttMs);
        batch.lines.push(...r.lines);
        if (r.outcome.result !== "timeout" && r.outcome.result !== "send-error") {
          found++;
          send({ type: "scan-hit", unit: units[i], outcome: r.outcome, rttMs: r.rttMs });
        }
      }
      send(batch);
      send({ type: "scan-progress", done: i, total });
      if (i >= units.length) finish();
      return;
    }
    // 주소: 덩어리 하나씩
    const a = cfg.from + i;
    const n = Math.min(cfg.block, cfg.to - a + 1);
    const r = mmTransact(cfg.unit, cfg.fc, a, n, undefined, cfg.timeoutMs);
    mmCount(null, r.outcome, r.rttMs);
    batch.lines.push(...r.lines);
    send(batch);
    i += n;
    if (r.outcome.result === "ok") {
      const last = ranges[ranges.length - 1];
      if (last && last[1] + 1 >= a) last[1] = a + n - 1;
      else ranges.push([a, a + n - 1]);
      found += n;
      send({ type: "scan-ranges", ranges: ranges.map((x) => [...x]) });
    }
    send({ type: "scan-progress", done: Math.min(i, total), total });
    if (r.outcome.result === "exception" && r.outcome.code === 1) return finish(mmExcText(1));
    if (r.outcome.result === "timeout") return finish(tr("세 번 이어서 응답이 없어 멈췄습니다 — 국번·통신 설정을 확인하세요", "Stopped after three requests in a row got no valid reply — check the slave ID and line settings"));
    if (a + n > 199 || i >= total) finish();
  }, 60);
}
async function mmaster(cmd, a) {
  switch (cmd) {
    case "open": {
      const r = await openSerial("modbus-master", a.config, a.onEvent);
      if (S?.kind === "modbus-master") mmStart(a.onEvent, "rtu", a.setup);
      return r;
    }
    case "open_tcp": {
      if (S) return fail(tr("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting"));
      if (!a.config.host || unresolvable(a.config.host)) return fail(`${a.config.host}:${a.config.port}: ${tr("주소를 찾지 못했습니다", "address not found")}`);
      const s = newSession("modbus-master", a.onEvent, { port: `${a.config.host}:${a.config.port}` });
      mmStart(a.onEvent, a.config.wire, a.setup);
      later(250, () => {
        s.online = true;
        frames(ev(`CONNECT ${s.port}`));
        status("connected", s.port, null);
      });
      return null;
    }
    case "close":
      if (MMS?.scan) MMS.scan.cancelled = true;
      if (S) endSession(S.port);
      MMS = null;
      return null;
    case "reconfigure":
      if (!S) return fail(NO_SESSION());
      return null;
    case "set_tables":
      if (MMS) MMS.tables = a.tables;
      return null;
    case "set_timing":
      if (a.timing.timeoutMs < 10 || a.timing.timeoutMs > 60000) return fail(tr("응답 기다림은 10~60000 ms 입니다", "Response timeout must be 10–60000 ms"));
      if (MMS) MMS.timing = a.timing;
      return null;
    case "set_addr_style":
      if (MMS) MMS.style = a.style;
      return null;
    case "set_paused":
      if (MMS) MMS.paused = a.paused;
      return null;
    case "read_once": {
      if (!MMS) return fail(tr("연결돼 있지 않습니다", "Not connected"));
      const t = MMS.tables.find((x) => x.id === a.table);
      if (t) {
        const batch = { type: "batch", lines: [], polls: [] };
        mmPoll(t, batch);
        setTimeout(() => send(batch), 30);
      }
      return null;
    }
    case "preview_write":
    case "write": {
      const q = a.req;
      if (!q.values.length || q.values.length > (q.bits ? 1968 : 123)) return fail(tr(`한 번에 1~${q.bits ? 1968 : 123}개까지 씁니다 (지금 ${q.values.length})`, `1–${q.bits ? 1968 : 123} items per write (now ${q.values.length})`));
      if (q.start + q.values.length > 65536) return fail(tr("주소 끝을 넘습니다", "Runs past 65535"));
      const multi = q.values.length > 1 || q.forceMulti;
      const fc = q.bits ? (multi ? 15 : 5) : multi ? 16 : 6;
      if (cmd === "preview_write") {
        let pdu;
        if (fc === 5) pdu = [5, q.start >> 8, q.start & 255, q.values[0] ? 0xff : 0, 0];
        else if (fc === 6) pdu = [6, q.start >> 8, q.start & 255, q.values[0] >> 8, q.values[0] & 255];
        else if (fc === 15) {
          const b = new Array(Math.ceil(q.values.length / 8)).fill(0);
          q.values.forEach((v, i) => v && (b[i >> 3] |= 1 << (i & 7)));
          pdu = [15, q.start >> 8, q.start & 255, 0, q.values.length, b.length, ...b];
        } else pdu = [16, q.start >> 8, q.start & 255, 0, q.values.length, q.values.length * 2, ...q.values.flatMap((v) => [v >> 8, v & 255])];
        return a.wire === "tcp" ? mbap(0, q.unit, pdu) : withCrc([q.unit, ...pdu]);
      }
      if (!MMS) return fail(tr("연결돼 있지 않습니다", "Not connected"));
      const r = mmTransact(q.unit, fc, q.start, fc === 5 || fc === 6 ? [q.values[0]] : q.values, a.table);
      mmCount(a.table, r.outcome, r.rttMs);
      setTimeout(() => {
        send({ type: "batch", lines: r.lines, polls: [] });
        send({ type: "write", token: a.token, table: a.table, outcome: r.outcome, rttMs: r.rttMs });
        const t = MMS?.tables.find((x) => x.id === a.table);
        if (t && r.outcome.result === "ok") {
          const batch = { type: "batch", lines: [], polls: [] };
          mmPoll(t, batch);
          send(batch);
        }
      }, 40);
      return null;
    }
    case "scan_ids":
    case "scan_addrs":
      if (!MMS) return fail(tr("연결돼 있지 않습니다", "Not connected"));
      if (MMS.scan) return fail(tr("이미 찾는 중입니다", "A scan is already running"));
      mmScanRun(cmd === "scan_ids" ? "ids" : "addrs", a.config);
      return null;
    case "scan_cancel":
      if (MMS?.scan) MMS.scan.cancelled = true;
      return null;
    case "get_stats":
      return mmStatsOut();
    case "reset_stats":
      if (MMS) MMS.stats = { total: mmNewStats(), tables: {} };
      return null;
    case "set_log":
      if (!S) return fail(tr("연결돼 있지 않습니다", "Not connected"));
      if (a.path) files.set(a.path, files.get(a.path) ?? "");
      return null;
    case "append_text":
      files.set(a.path, (files.get(a.path) ?? "") + a.text);
      return null;
  }
  return null;
}

// ================================================================ SCPI (apps/scpi — 명령: apps/scpi/src-tauri/src/lib.rs, 오류 모양: crates/core/src/scpi.rs ScpiError)
// 창 제목이 «… PortDock SCPI» 일 때만 이 부분이 받는다(open_tcp·close 같은 이름이 다른 앱과 겹친다). 가짜 멀티미터 하나:
// *IDN? → PORTDOCK,SCPI-SIM,0001,1.0 · MEAS:VOLT:DC?·READ?·FETC? → 5 V 근처 · MEAS:CURR:DC? · MEAS:RES? → 9.9E37(넘침)
// DATA? → PNG 머리로 시작하는 300바이트 블록(#3300) · TEXT? → #15hello · *OPC? → 0.4초 뒤 1 · SYST:ERR? → 쌓인 오류, 없으면 +0
// 일부러 실패: 모르는 명령 → 오류 큐 -113(질의면 답 없음 → 시간 초과), SLOW? → 답 없음, NOEND? → 줄 끝 없는 «1.23»,
// 장비 주소 10.0.0.99 → 연결 시간 초과, nohost → 주소 못 찾음, 포트 445 → 거부, 시리얼 COM9 → 사용 중
const SCPI_CMDS = new Set(["open_tcp", "open_serial", "close", "cancel", "set_term", "write_cmd", "read_reply", "query", "drain_errors", "save_block", "append_text"]);
const isSCPI = () => /PortDock SCPI/.test(document.title);
let SC = null;
const scErr = (kind, message, partial) => Promise.reject(partial ? { kind, message, partial } : { kind, message });
const scTermBytes = () => ({ lf: [10], crlf: [13, 10], cr: [13] })[SC?.term ?? "lf"] ?? [10];
const scVolt = () => `+${(5 + (Math.random() - 0.5) * 0.002).toExponential(8).toUpperCase().replace("E+", "E+0")}`;
const SC_KNOWN = /^(\*(RST|CLS|OPC|WAI|ESE|SRE|TRG|SAV|RCL)\b|CONF|OUTP|VOLT|CURR|SOUR|INIT|ABOR|DISP|SYST:PRES|STAT:PRES|TRIG|SENS|FUNC)/i;
const notConn = () => scErr("not-connected", tr("연결돼 있지 않습니다", "Not connected"));
/** 명령 하나 → 장비가 내보낼 응답 또는 null(답 없음) */
function scDevice(cmd) {
  const c = cmd.trim().toUpperCase();
  const text = (t) => ({ bytes: ascii(t + "\n") });
  if (c === "*IDN?") return text("PORTDOCK,SCPI-SIM,0001,1.0");
  if (c === "*OPC?") return { ...text("1"), delay: 400 };
  if (/^\*(ESR|STB|TST|OPT)\?$/.test(c)) return text("+0");
  if (/^SYST(EM)?:ERR(OR)?(:NEXT)?\?$/.test(c)) return text(SC.errs.shift() ?? '+0,"No error"');
  if (/^SYST(EM)?:VERS(ION)?\?$/.test(c)) return text("1999.0");
  if (/^(MEAS(URE)?:VOLT(AGE)?(:DC)?\?|READ\?|FETC(H)?\?)/.test(c)) return text(scVolt());
  if (/^MEAS(URE)?:CURR(ENT)?(:DC)?\?/.test(c)) return text("+1.23450000E-03");
  if (/^MEAS(URE)?:RES(ISTANCE)?\?/.test(c)) return text("+9.90000000E+37");
  if (c === "DATA?" || c === "HCOP:DATA?") {
    const body = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array.from({ length: 292 }, (_, i) => (i * 7) & 255)];
    return { bytes: [...ascii("#3300"), ...body, 10], block: { header: "#3300", data: body } };
  }
  if (c === "TEXT?") return { bytes: ascii("#15hello\n"), block: { header: "#15", data: ascii("hello") } };
  if (c === "NOEND?") return { bytes: ascii("1.23"), noend: true };
  if (c === "SLOW?") return null;
  if (c === "*CLS") SC.errs = [];
  if (SC_KNOWN.test(c) && !c.endsWith("?")) return null;
  SC.errs.push('-113,"Undefined header"');
  return null;
}
/** ms 동안 기다림 — 멈춤·끊기면 그 이유 */
async function scWait(ms) {
  const until = now() + ms;
  while (now() < until) {
    if (!SC) return "closed";
    if (SC.cancel) {
      SC.cancel = false;
      return "cancelled";
    }
    await sleep(Math.min(20, until - now()));
  }
  return null;
}
function scReplyOut(r) {
  if (r.block) {
    const d = r.block.data;
    const binary = !d.every((b) => (b >= 0x20 && b !== 0x7f) || b === 9 || b === 10 || b === 13);
    return { kind: "block", text: binary ? "" : String.fromCharCode(...d), header: r.block.header, len: d.length, indefinite: false, binary, preview: d.slice(0, 1024), raw: r.bytes.slice(0, 4096), rawLen: r.bytes.length };
  }
  const t = String.fromCharCode(...r.bytes).replace(/\r?\n$/, "");
  return { kind: "text", text: t, header: "", len: t.length, indefinite: false, binary: false, preview: [], raw: r.bytes, rawLen: r.bytes.length };
}
const scSent = (cmd) => [...ascii(cmd.replace(/[\r\n]+$/, "")), ...scTermBytes()];
/** 답 하나 읽기 — 없으면 기다림 시간까지(가짜 장비는 0.9초까지만 — 화면 점검이 오래 걸리지 않게) */
async function scRead(timeoutMs, sentAt) {
  const t0 = now();
  const stopped = () => scErr("cancelled", tr("멈췄습니다", "Stopped"));
  for (;;) {
    const r = SC?.out[0];
    if (r && now() >= r.at) {
      SC.out.shift();
      if (r.noend) {
        if ((await scWait(Math.min(timeoutMs, 900))) === "cancelled") return stopped();
        return scErr("timeout", `${tr("응답이 끝나지 않았습니다 — 줄 끝(LF·CR)이 오지 않음", "The reply did not end — no line ending (LF/CR) arrived")} (${timeoutMs} ms)`, String.fromCharCode(...r.bytes));
      }
      const ms = Math.max(0.3, now() - sentAt) + Math.random();
      return { ts: sentAt, rxTs: sentAt + Math.round(ms), sent: [], stale: 0, reply: scReplyOut(r), ms };
    }
    if (now() - t0 >= Math.min(timeoutMs, 900)) return scErr("timeout", `${tr("응답 없음 — 응답 기다림 시간을 넘었습니다", "No reply — the response timeout passed")} (${timeoutMs} ms)`);
    const why = await scWait(20);
    if (why === "closed") return scErr("closed", tr("장비가 연결을 끊었습니다", "The instrument closed the connection"));
    if (why === "cancelled") return stopped();
  }
}
function scSend(cmd) {
  const r = scDevice(cmd);
  if (r) SC.out.push({ ...r, at: now() + (r.delay ?? 3 + Math.random() * 10) });
}
async function scpi(cmd, a) {
  switch (cmd) {
    case "open_tcp": {
      if (SC) return fail(tr("이미 연결돼 있습니다", "Already connected"));
      const host = a.config.host.trim();
      const port = a.config.port;
      await sleep(150);
      if (!host) return fail(tr("장비 주소(IP)를 넣으세요", "Enter the instrument address (IP)"));
      if (host === "nohost") return fail(`${host}:${port}: ${tr("주소를 찾지 못했습니다", "Could not resolve the address")}`);
      if (host === "10.0.0.99") {
        await sleep(600);
        return fail(`${host}:${port}: ${tr("응답 없음(시간 초과) — 주소·방화벽·케이블 확인", "No answer (timed out) — check address, firewall, cable")}`);
      }
      if (port === 445) return fail(`${host}:${port}: ${tr("연결 거부 — 상대가 그 포트에서 듣고 있지 않습니다", "Connection refused — nothing is listening on that port")}`);
      SC = { term: a.config.term, errs: [], out: [], cancel: false };
      return null;
    }
    case "open_serial": {
      if (SC) return fail(tr("이미 연결돼 있습니다", "Already connected"));
      const p = a.config.port;
      if (p === "COM9") return fail(`${p}: ${tr("포트가 사용 중입니다 — 다른 프로그램(또는 다른 PortDock 창)이 열고 있는지 확인", "Port is busy — check whether another program (or another PortDock window) has it open")}`);
      if (!listPorts().some((x) => x.name === p)) return fail(`${p}: ${tr("포트를 찾을 수 없습니다 — 케이블·드라이버·포트 이름 확인", "Port not found — check cable, driver and port name")}`);
      SC = { term: a.config.term, errs: [], out: [], cancel: false };
      return null;
    }
    case "close":
      SC = null;
      return null;
    case "cancel":
      if (SC) SC.cancel = true;
      return null;
    case "set_term":
      if (!SC) return notConn();
      SC.term = a.term;
      return null;
    case "write_cmd": {
      if (!SC) return notConn();
      if (!a.cmd.trim()) return scErr("invalid", tr("보낼 명령이 비어 있습니다", "The command is empty"));
      const ts = now();
      scSend(a.cmd);
      return { ts, rxTs: 0, sent: scSent(a.cmd), stale: 0, reply: null, ms: 0 };
    }
    case "read_reply":
      if (!SC) return notConn();
      SC.cancel = false;
      return scRead(a.timeoutMs, now());
    case "query": {
      if (!SC) return notConn();
      if (!a.cmd.trim()) return scErr("invalid", tr("보낼 명령이 비어 있습니다", "The command is empty"));
      SC.cancel = false;
      const stale = SC.out.reduce((n, r) => n + r.bytes.length, 0);
      SC.out = [];
      const ts = now();
      scSend(a.cmd);
      const x = await scRead(a.timeoutMs, ts);
      return { ...x, sent: scSent(a.cmd), stale };
    }
    case "drain_errors": {
      if (!SC) return notConn();
      const q = a.cmd || "SYST:ERR?";
      const out = { errors: [], exchanges: [], complete: false };
      for (let i = 0; i < (a.max ?? 50); i++) {
        const ts = now();
        scSend(q);
        const x = { ...(await scRead(a.timeoutMs, ts)), sent: scSent(q), stale: 0 };
        out.exchanges.push(x);
        const m = /^\s*([+-]?\d+)\s*(?:,\s*"?(.*?)"?\s*)?$/.exec(x.reply.text);
        if (!m) {
          out.errors.push({ code: null, message: "", raw: x.reply.text });
          return out;
        }
        if (Number(m[1]) === 0) {
          out.complete = true;
          return out;
        }
        out.errors.push({ code: Number(m[1]), message: m[2] ?? "", raw: x.reply.text });
      }
      return out;
    }
    case "save_block":
      files.set(a.path, "<block 300 bytes>");
      return 300;
    case "append_text":
      files.set(a.path, (files.get(a.path) ?? "") + a.text);
      return null;
  }
  return null;
}

// ================================================================ Plot (apps/plot — 명령: apps/plot/src-tauri/src/lib.rs, 사건: 그 파일의 PlotEvent)
// 위 공용 세션(S)과 따로 논다. 가짜 장비가 0.05초마다 10줄(200 Hz)을 보낸다: 첫 묶음에 머리글 «sin,cos,noise», 그다음
// 사인파(±10, 0.5 Hz)·코사인(20±5, 0.2 Hz)·잡음(±1) CSV 줄. 3초마다 해석 실패 줄 «ERR? overflow»(빨강·이유).
// 해석은 Rust 몫이라 여기서는 만든 숫자를 그대로 넘긴다(바이너리 형식이면 원시 줄만 HEX 로).
// 일부러 실패: 시리얼 COM9 사용 중, TCP 주소 10.0.0.99 → 시작은 되고 «다시 연결하는 중», UDP 포트 445 → 묶기 실패,
// 기록 경로에 «readonly» → 쓰기 거부. window.__pdMock.plot 으로 상태를 본다.
const PLOT_CMDS = new Set(["plot_start", "plot_stop", "plot_set_format", "plot_record", "write_bytes"]);
let PL = null;
const plSend = (e) => {
  try {
    PL?.ch?.onmessage?.(e);
  } catch (err) {
    window.__pdMock.errors.push(String(err?.stack ?? err));
  }
};
const plNoise = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.7;
function plTick() {
  if (!PL) return;
  const n = 10;
  const now = Date.now();
  const t = [];
  const rows = [];
  const raw = [];
  let bad = 0;
  let bytes = 0;
  for (let k = 0; k < n; k++) {
    const ts = now - (n - 1 - k) * 5;
    const s = (PL.k++ * 5) / 1000;
    const row = [Number((10 * Math.sin(2 * Math.PI * 0.5 * s)).toFixed(3)), Number((20 + 5 * Math.cos(2 * Math.PI * 0.2 * s)).toFixed(3)), Number(plNoise().toFixed(3))];
    t.push(ts);
    rows.push(row);
    const text = PL.format?.kind === "binary" ? ["AA", "55", ...row.flatMap((v) => [hex2(Math.round(v * 100) & 255), hex2((Math.round(v * 100) >> 8) & 255)])].join(" ") : row.join(",");
    bytes += text.length + 2;
    raw.push({ ts, text, ok: true });
  }
  PL.ticks++;
  if (PL.ticks % 60 === 0) {
    bad++;
    raw.push({ ts: now, text: "ERR? overflow", ok: false, why: tr("숫자가 없습니다: «ERR? overflow»", "No numbers: «ERR? overflow»") });
  }
  if (PL.rec) {
    PL.rec.rows += rows.length;
    files.set(PL.rec.path, files.get(PL.rec.path) + rows.map((r, i) => `${new Date(t[i]).toISOString()},${((t[i] - PL.rec.t0) / 1000).toFixed(3)},${r.join(",")}`).join("\r\n") + "\r\n");
  }
  const names = PL.names ? undefined : ["sin", "cos", "noise"];
  PL.names = true;
  plSend({ type: "data", t, rows, ...(names ? { names } : {}), raw: raw.slice(-40), bad, bytes, dropped: 0, ...(PL.rec ? { recRows: PL.rec.rows } : {}) });
}
async function plot(cmd, a) {
  switch (cmd) {
    case "plot_start": {
      if (PL) return fail(tr("이미 받는 중입니다", "Already receiving"));
      const src = a.source;
      await sleep(80);
      let desc;
      let st;
      if (src.kind === "serial") {
        const p = src.config.port;
        if (p === "COM9") return fail(busyPort(p));
        if (!listPorts().some((x) => x.name === p)) return fail(notFound(p));
        desc = `${p} ${src.config.baud} ${src.config.dataBits}N${src.config.stopBits}`;
        st = { type: "status", state: "connected", port: p, message: null };
      } else if (src.kind === "tcp") {
        if (!src.host.trim() || !src.port) return fail(tr("장비 주소와 포트(1~65535)를 넣어 주세요", "Enter the device address and port (1–65535)"));
        desc = `TCP ${src.host}:${src.port}`;
        st =
          src.host === "10.0.0.99"
            ? { type: "status", state: "reconnecting", port: `${src.host}:${src.port}`, message: tr("재접속 대기 · 마지막 실패: 응답 없음(시간 초과)", "Waiting to reconnect · last failure: timed out") }
            : { type: "status", state: "connected", port: `${src.host}:${src.port}`, message: null };
      } else {
        if (src.port === 445) return fail(inUse(`${src.host}:${src.port}`));
        desc = `UDP ${src.host}:${src.port}`;
        st = { type: "status", state: "listening", port: `${src.host}:${src.port}`, message: null };
      }
      PL = { ch: a.onEvent, format: a.format, k: 0, ticks: 0, names: false, rec: null, timer: 0, source: src };
      setTimeout(() => {
        plSend(st);
        plSend({ type: "data", t: [], rows: [], raw: [{ ts: Date.now(), text: `OPEN ${desc}`, ok: true, ev: true }], bad: 0, bytes: 0, dropped: 0 });
        if (st.state !== "reconnecting" && PL) PL.timer = setInterval(plTick, 50);
      }, 10);
      return desc;
    }
    case "plot_stop": {
      const p = PL;
      if (!p) return null;
      clearInterval(p.timer);
      PL = null;
      setTimeout(() => {
        try {
          p.ch?.onmessage?.({ type: "status", state: "closed", port: "", message: null });
        } catch {
          /* 화면이 이미 닫힘 */
        }
      }, 20);
      return null;
    }
    case "plot_set_format":
      if (a.format.kind === "binary" && !(a.format.channels >= 1 && a.format.channels <= 32)) return fail(tr("채널 수는 1~32 입니다", "Channels must be 1–32"));
      if (PL) {
        PL.format = a.format;
        PL.names = false;
      }
      return null;
    case "plot_record":
      if (!PL) return fail(tr("받는 중일 때만 기록할 수 있습니다", "Recording works only while receiving"));
      if (a.path && /readonly|denied/i.test(a.path)) return fail(`${a.path}: ${tr("액세스가 거부되었습니다.", "Access is denied.")} (os error 5)`);
      PL.rec = a.path ? { path: a.path, rows: 0, t0: Date.now() } : null;
      if (a.path) files.set(a.path, `\uFEFFtime,elapsed_s,${a.names.join(",")}\r\n`);
      return null;
    case "write_bytes":
      files.set(a.path, `<png ${a.data.length} bytes${a.data[0] === 0x89 && a.data[1] === 0x50 ? " PNG" : ""}>`);
      return null;
  }
  return null;
}
window.__pdMock.plot = () => (PL ? { format: PL.format, rec: PL.rec, ticks: PL.ticks } : null);

// ================================================================ Port Inspector (apps/port-inspector — 명령: apps/port-inspector/src-tauri/src/lib.rs,
// 모양: crates/core/src/portinfo·loopback.rs). Serial «연결 점검…» 도 pi_report·loop_start 를 쓴다.
// 가짜 장치: COM3 CH340(문제 없음) · COM5 FTDI(지연 16ms·절전 켜짐 → 볼 것) · COM1 내장 포트 · COM9 Prolific(문제 코드 10, 시험하면 «사용 중»)
// · 숨은 COM12 Prolific(지금 없음). 루프백: COM5 왕복 ≈16ms, COM3 ≈2ms, COM1 은 아무것도 돌아오지 않음. 에코: COM1 말고는 에코 있음.
const PI_CMDS = new Set(["pi_list", "pi_report", "pi_com_numbers", "pi_events", "pi_nics", "pi_pc", "pi_wireless", "loop_start", "loop_cancel"]);
const piT = (ko, en) => ({ ko, en });
const PI_DEV = [
  { port: "COM1", name: "통신 포트(COM1)", instanceId: "ACPI\\PNP0501\\0", present: true, vid: null, pid: null, problem: null, class: "Ports", svc: "Serial", provider: "Microsoft", ver: "10.0.26100.1", inf: "msports.inf", chip: null },
  { port: "COM3", name: "USB-SERIAL CH340 (COM3)", instanceId: "USB\\VID_1A86&PID_7523\\5&2A1B3C&0&2", present: true, vid: 0x1a86, pid: 0x7523, problem: null, class: "Ports", svc: "CH341SER_A64", provider: "wch.cn", ver: "3.9.2024.9", inf: "oem42.inf", chip: { vendor: "WCH (Nanjing Qinheng)", chip: "CH340 / CH341", clue: false } },
  { port: "COM5", name: "USB Serial Port (COM5)", instanceId: "FTDIBUS\\VID_0403+PID_6001+PD000001A\\0000", present: true, vid: 0x0403, pid: 0x6001, problem: null, class: "Ports", svc: "FTSER2K", provider: "FTDI", ver: "2.12.36.4", inf: "oem7.inf", chip: { vendor: "FTDI", chip: "FT232R / FT232BM / FT245R", clue: false } },
  { port: "COM9", name: "Prolific USB-to-Serial Comm Port (COM9)", instanceId: "USB\\VID_067B&PID_2303\\6&1F2E3D&0&1", present: true, vid: 0x067b, pid: 0x2303, problem: 10, class: "Ports", svc: "Ser2pl", provider: "Prolific", ver: "3.9.6.2", inf: "oem51.inf", chip: { vendor: "Prolific", chip: "PL2303 (HX/HXD/TA/RA …)", clue: false, note: piT("PL2303 옛 리비전(HXA·XA)은 단종…", "Old PL2303 revisions (HXA, XA) are discontinued…") } },
  { port: "COM12", name: "Prolific USB-to-Serial Comm Port (COM12)", instanceId: "USB\\VID_067B&PID_2303\\6&99AA&0&4", present: false, vid: 0x067b, pid: 0x2303, problem: null, class: "Ports", svc: "Ser2pl", provider: "Prolific", ver: "3.9.6.2", inf: "oem51.inf", chip: { vendor: "Prolific", chip: "PL2303 (HX/HXD/TA/RA …)", clue: false } },
];
const piEntry = (d) => ({ port: d.port, name: d.name, instanceId: d.instanceId, present: d.present, vid: d.vid, pid: d.pid, problem: d.problem, class: d.class });
const piFind = (id) => PI_DEV.find((d) => d.instanceId === id || d.port === id);
const DAY = 86_400_000;
function piReport(d) {
  const ftdi = d.port === "COM5";
  return {
    entry: piEntry(d),
    readAt: now(),
    description: d.name.replace(/ \(COM\d+\)$/, ""),
    busDescription: ftdi ? "FT232R USB UART" : d.vid ? "USB-Serial Controller" : null,
    manufacturer: d.provider,
    location: d.vid ? "Port_#0002.Hub_#0001" : null,
    hardwareIds: d.vid ? [`USB\\VID_${hex2(d.vid >> 8)}${hex2(d.vid & 255)}&PID_${hex2(d.pid >> 8)}${hex2(d.pid & 255)}`] : ["ACPI\\PNP0501"],
    chip: d.chip,
    driver: { provider: d.provider, version: d.ver, date: now() - 400 * DAY, inf: d.inf, service: d.svc },
    status: {
      present: d.present,
      started: d.present && !d.problem,
      problem: d.problem ? { code: 10, meaning: piT("장치를 시작할 수 없습니다.", "This device cannot start."), action: piT("다른 USB 포트에 꽂고 제조사 드라이버를 다시 설치합니다.", "Plug it into another USB port and reinstall the vendor driver.") } : null,
      disabled: false,
    },
    lastArrival: now() - 2 * 3_600_000,
    lastRemoval: d.present ? now() - 3 * 3_600_000 : now() - 20 * DAY,
    firstInstall: now() - 300 * DAY,
    ancestors: d.vid ? [{ instanceId: ftdi ? "USB\\VID_0403&PID_6001\\PD000001" : "USB\\ROOT_HUB30\\4&1", name: ftdi ? "USB Serial Converter" : "USB 루트 허브(USB 3.0)", service: ftdi ? "FTDIBUS" : "USBHUB3" }] : [],
    params: [
      ...(ftdi ? [{ name: "LatencyTimer", value: "16", kind: "dword", num: 16, note: piT("FTDI 지연 타이머(ms). 기본값 16 …", "FTDI latency timer (ms). Default 16 …") }, { name: "MinReadTimeout", value: "0", kind: "dword", num: 0 }] : []),
      { name: "PortName", value: d.port, kind: "string", note: piT("이 장치에 붙은 COM 이름", "The COM name assigned to this device") },
    ],
    portDefault: d.port === "COM1" ? "9600,n,8,1" : null,
    ...(d.port === "COM1" ? { portDefaultNote: piT("9600 bps · 패리티 없음 · 8 비트 · 정지 1", "9600 bps · no parity · 8 data bits · 1 stop") } : {}),
    power: {
      usbSuspendAc: ftdi,
      usbSuspendDc: true,
      devices: d.vid ? [{ instanceId: d.instanceId, name: d.name, canTurnOff: ftdi, own: true }, ...(ftdi ? [{ instanceId: PI_HUB, name: "Generic USB Hub", canTurnOff: true, own: false }] : [])] : [],
    },
    // USB 경로(10/26): COM5 = 장치 → 버스 전원 허브(포트 3, High) → 루트 허브 → 컨트롤러, 다른 USB 장치 = 루트 허브에 바로
    usbPath: d.vid && d.present ? piUsbPath(d, ftdi) : null,
    errors: [],
  };
}
const PI_HUB = "USB\\VID_05E3&PID_0610\\5&1A2B3C&0&3";
function piUsbPath(d, ftdi) {
  const hop = (o) => ({ belowCapable: false, busPowered: null, ports: null, ...o });
  const root = hop({ instanceId: "USB\\ROOT_HUB30\\4&2AA8D0A4&0&0", name: tr("USB 루트 허브(USB 3.0)", "USB Root Hub (USB 3.0)"), kind: "root", port: null, speed: null, busPowered: false, ports: 18 });
  const ctl = hop({ instanceId: "PCI\\VEN_8086&DEV_06ED&SUBSYS_00008086&REV_00\\3&11583659&0&A0", name: tr("Intel(R) USB 3.1 확장 가능한 호스트 컨트롤러", "Intel(R) USB 3.1 eXtensible Host Controller"), kind: "controller", port: null, speed: null });
  if (ftdi)
    return {
      hops: [
        hop({ instanceId: "USB\\VID_0403&PID_6001\\PD000001", name: "USB Serial Converter", kind: "device", port: 2, speed: "full" }),
        hop({ instanceId: PI_HUB, name: "Generic USB Hub", kind: "hub", port: 3, speed: "high", busPowered: true, ports: 4 }),
        root,
        ctl,
      ],
      errors: [],
    };
  return { hops: [hop({ instanceId: d.instanceId, name: d.name, kind: "device", port: 1, speed: "full" }), root, ctl], errors: [] };
}
const piProp = (keyword, name, raw, display, o = {}) => ({ keyword, name, display, raw, default: raw, valid: [], min: null, max: null, ...o });
let PIL = null;
async function pinsp(cmd, a) {
  switch (cmd) {
    case "pi_list":
      await sleep(60);
      return PI_DEV.filter((d) => a.hidden || d.present).map(piEntry);
    case "pi_report": {
      // 시험이 포트마다 늦게 답하게 할 수 있다(__pdMock.piDelay = { COM5: 700 }) — 늦게 온 앞 포트 값이 덮지 않는지
      await sleep(80 + (window.__pdMock.piDelay?.[a.id] ?? window.__pdMock.piDelay?.[piFind(a.id)?.port] ?? 0));
      const d = piFind(a.id);
      return d ? piReport(d) : fail(tr(`장치를 찾을 수 없습니다: ${a.id}`, `Device not found: ${a.id}`));
    }
    case "pi_com_numbers":
      return { comdbFound: true, reserved: [1, 3, 4, 5, 9, 12, 17], present: [1, 3, 5, 9], hidden: [[12, "Prolific USB-to-Serial Comm Port (COM12)"]], orphan: [4, 17], shared: [], serialcomm: ["COM1", "COM3", "COM5", "COM9"], errors: [] };
    case "pi_events": {
      await sleep(150);
      const d = piFind(a.instanceId);
      if (!d) return { events: [], days: a.days, errors: [] };
      const started = tr("장치가 시작되었습니다.", "Device started.");
      const ev = (ago, id, kind, msg) => ({ time: now() - ago, id, provider: "Microsoft-Windows-Kernel-PnP", kind, level: kind === "problem" ? 3 : 4, message: `${d.instanceId} ${msg}`, device: d.instanceId });
      const list = [ev(2 * 3_600_000, 410, "start", started), ev(DAY, 410, "start", started), ev(40 * DAY, 400, "install", tr("장치가 구성되었습니다.", "Device configured."))];
      if (d.port === "COM5") for (let i = 0; i < 3; i++) list.push(ev(3 * DAY + i * 600_000, 410, "start", started));
      if (d.problem) list.push(ev(3_000_000, 411, "problem", tr("장치를 시작하는 동안 문제가 발생했습니다.", "Device had a problem starting.")));
      return { events: list.filter((e) => now() - e.time <= a.days * DAY).sort((x, y) => y.time - x.time), days: a.days, errors: [] };
    }
    case "pi_pc": {
      await sleep(120);
      // 이 PC 점검(10/26): 빠른 시작 켜짐·절전 30분·USB 선택적 절전·업데이트 정책 없음·업데이트 재시작 대기 → 장비 PC 면 «볼 것»,
      // 예기치 않은 종료(3일 전) → 일반 PC 도 «볼 것», disk 경고(20일 전) → 7일로 줄이면 빠진다
      const ev = (group, provider, id, level, count, ago) => ({ group, provider, id, level, count, last: now() - ago });
      const events = [
        ev("unexpected", "EventLog", 6008, 2, 2, 3 * DAY),
        ev("unexpected", "Microsoft-Windows-Kernel-Power", 41, 1, 2, 3 * DAY),
        ev("hardware", "disk", 7, 2, 1, 20 * DAY),
        ev("time", "Microsoft-Windows-Time-Service", 36, 3, 3, 2 * DAY),
        ev("time", "Microsoft-Windows-Time-Service", 37, 4, 12, DAY),
      ].filter((e) => now() - e.last <= a.days * DAY);
      return {
        readAt: now(),
        days: a.days,
        fastStartup: true,
        hibernateEnabled: true,
        scheme: tr("균형 조정", "Balanced"),
        power: [
          { id: "sleep", ac: 1800, dc: 900 },
          { id: "hibernate", ac: 0, dc: 0 },
          { id: "display", ac: 600, dc: 300 },
          { id: "aspm", ac: 0, dc: 2 },
          { id: "usbSuspend", ac: 1, dc: 1 },
        ],
        update: { noAutoUpdate: null, auOptions: null, noAutoReboot: null, alwaysAutoReboot: null, excludeDrivers: null, policyActiveHours: null, activeHours: [8, 17], smartActiveHours: 0 },
        rebootPending: ["windowsUpdate", "fileRename"],
        screenSaver: { active: true, program: null, timeout: null, secure: null },
        time: { type: "NTP", ntpServer: "time.windows.com,0x9", policy: false, serviceStart: 3 },
        events,
        errors: [],
      };
    }
    case "pi_wireless": {
      await sleep(140);
      // 무선 탭(0.5.0): Wi-Fi = 장치 절전 켜짐·전원 연결 절전 보통·3일 안에 끊김 26건(드라이버 20·직접 6 — 30일 기준 «잦음») → «볼 것»,
      // 드라이버 경고(20일 전) → 7일이면 빠짐. 블루투스 = USB 동글이 버스 전원 허브 경유·핸즈프리 끝점이 기본 출력 → «볼 것».
      // 이름은 예시 값(실제 장치·네트워크 이름 아님). 네트워크 이름(SSID)은 백엔드가 읽지 않는다
      const inDays = (ago) => ago <= a.days * DAY;
      const drv = (provider, version, svc) => ({ provider, version, date: now() - 300 * DAY, inf: "oem77.inf", service: svc });
      const btName = tr("인텔(R) 무선 Bluetooth(R)", "Intel(R) Wireless Bluetooth(R)");
      const hs = tr("헤드셋 (Example Buds Hands-Free AG Audio)", "Headset (Example Buds Hands-Free AG Audio)");
      return {
        readAt: now(),
        days: a.days,
        wifi: {
          adapters: [{ name: "Wi-Fi", description: "Intel(R) Wi-Fi 6E AX211 160MHz", connected: true, driver: drv("Intel", "23.60.1.2", "Netwtw14"), problem: null, canTurnOff: true }],
          powerSaveAc: 2,
          powerSaveDc: 3,
          disconnects: [
            { code: 0, reason: tr("드라이버에 의해 네트워크 연결이 끊어졌습니다.", "The network is disconnected by the driver."), count: 20, last: now() - 2 * 3_600_000 },
            { code: 1, reason: tr("사용자가 네트워크 연결을 끊었습니다.", "The network is disconnected by the user."), count: 6, last: now() - 3 * DAY + 60_000 },
          ],
          logRead: true,
          driverEvents: inDays(20 * DAY) ? [{ provider: "Netwtw14", id: 6062, level: 3, count: 4, last: now() - 20 * DAY }] : [],
        },
        bt: {
          radios: [
            {
              name: btName,
              vid: 0x8087,
              pid: 0x0033,
              driver: drv("Intel Corporation", "23.60.0.1", "BTHUSB"),
              started: true,
              problem: null,
              canTurnOff: false,
              usbPath: {
                hops: [
                  { instanceId: "USB\\VID_8087&PID_0033\\5&3C1D&0&1", name: btName, kind: "device", port: 1, speed: "full", belowCapable: false, busPowered: null, ports: null },
                  { instanceId: PI_HUB, name: "Generic USB Hub", kind: "hub", port: 3, speed: "high", belowCapable: false, busPowered: true, ports: 4 },
                  { instanceId: "USB\\ROOT_HUB30\\4&2AA8D0A4&0&0", name: tr("USB 루트 허브(USB 3.0)", "USB Root Hub (USB 3.0)"), kind: "root", port: null, speed: null, belowCapable: false, busPowered: false, ports: 18 },
                ],
                errors: [],
              },
            },
          ],
          services: [
            { name: "bthserv", found: true, state: "running", startType: 3 },
            { name: "BTAGService", found: true, state: "running", startType: 3 },
            { name: "BthAvctpSvc", found: true, state: "running", startType: 3 },
          ],
          events: [],
          logRead: true,
          audio: [
            { name: hs, flow: "render", kind: "handsFree", defaultConsole: true, defaultComms: true },
            { name: tr("헤드폰 (Example Buds Stereo)", "Headphones (Example Buds Stereo)"), flow: "render", kind: "stereo", defaultConsole: false, defaultComms: false },
            { name: hs, flow: "capture", kind: "handsFree", defaultConsole: true, defaultComms: true },
          ],
        },
        errors: [],
      };
    }
    case "pi_nics":
      await sleep(100);
      // 랜카드 점검(10/26): 이더넷 = 점보 꺼짐·버퍼 512/2048·절전 켜짐·공용 → 카메라 용도면 «볼 것», 이더넷 2 = 10 Mbps 반이중·EEE 켜짐·받기 오류
      return {
        nics: [
          {
            name: "이더넷",
            description: "Intel(R) Ethernet Connection I219-V",
            up: true,
            speed: 1e9,
            fullDuplex: true,
            ipv4: ["192.168.0.10/24"],
            gateway: "192.168.0.1",
            pnpId: "PCI\\VEN_8086&DEV_15B8&SUBSYS_00008086&REV_00\\3&11583659&0&FE",
            advanced: [
              piProp("*EEE", tr("에너지 효율 이더넷", "Energy Efficient Ethernet"), "0", tr("끄기", "Off"), { valid: ["0", "1"] }),
              piProp("*FlowControl", tr("흐름 제어", "Flow Control"), "3", tr("Rx 및 Tx 사용", "Rx & Tx Enabled"), { valid: ["0", "1", "2", "3"] }),
              piProp("*InterruptModeration", tr("인터럽트 조절", "Interrupt Moderation"), "1", tr("사용", "Enabled"), { valid: ["0", "1"] }),
              piProp("*JumboPacket", tr("점보 패킷", "Jumbo Packet"), "1514", tr("사용 안 함", "Disabled"), { valid: ["1514", "4088", "9014"] }),
              piProp("*ReceiveBuffers", tr("수신 버퍼", "Receive Buffers"), "512", "512", { min: 80, max: 2048 }),
              piProp("*SpeedDuplex", tr("속도 및 이중", "Speed & Duplex"), "0", tr("자동 협상", "Auto Negotiation"), { valid: ["0", "1", "2", "3", "4", "6"] }),
              piProp("*TransmitBuffers", tr("전송 버퍼", "Transmit Buffers"), "512", "512", { min: 80, max: 2048 }),
              piProp("ITR", tr("인터럽트 조절 비율", "Interrupt Moderation Rate"), null, tr("적응형", "Adaptive"), { default: "65535", valid: ["65535", "3600", "2000", "950", "400", "200", "0"] }),
              piProp("*WakeOnMagicPacket", tr("매직 패킷 웨이크 온", "Wake on Magic Packet"), "1", tr("사용", "Enabled"), { valid: ["0", "1"] }),
            ],
            canTurnOff: true,
            pnpCapabilities: null,
            stats: { inPackets: 1_284_330, outPackets: 902_114, inErrors: 0, inDiscards: 0, outErrors: 0, outDiscards: 0 },
            profile: "public",
            network: tr("네트워크", "Network"),
          },
          {
            name: "이더넷 2",
            description: "USB 10/100 LAN",
            up: true,
            speed: 1e7,
            fullDuplex: false,
            ipv4: ["10.0.0.5/24"],
            gateway: null,
            pnpId: "USB\\VID_0B95&PID_7720\\000001",
            advanced: [piProp("*EEE", "EEE", "1", tr("사용", "Enabled"), { valid: ["0", "1"] }), piProp("*SpeedDuplex", tr("속도 및 이중", "Speed & Duplex"), "0", tr("자동", "Auto"), { valid: ["0", "1", "2"] })],
            canTurnOff: false,
            pnpCapabilities: 24,
            stats: { inPackets: 5_120, outPackets: 4_870, inErrors: 12, inDiscards: 3, outErrors: 0, outDiscards: 0 },
            profile: "private",
            network: "PLC-LAN",
          },
          { name: "Wi-Fi", description: "Wireless Adapter", up: false, speed: null, fullDuplex: null, ipv4: [], gateway: null, pnpId: null, advanced: [], canTurnOff: null, pnpCapabilities: null, stats: null, profile: null, network: null },
        ],
        firewall: [
          { profile: "domain", enabled: true, current: false },
          { profile: "private", enabled: true, current: true },
          { profile: "public", enabled: true, current: true },
        ],
        errors: [],
      };
    case "loop_start": {
      if (PIL && !PIL.done) return fail(tr("이미 시험 중입니다", "A test is already running"));
      const c = a.config;
      const ch = a.onEvent;
      const out = (e) => {
        try {
          ch?.onmessage?.(e);
        } catch (err) {
          window.__pdMock.errors.push(String(err?.stack ?? err));
        }
      };
      PIL = { cancel: false, done: false, config: c };
      const me = PIL;
      const flags = { read: true, frame: false, parity: false, overrun: false, rxOver: false, break: false };
      (async () => {
        const t0 = now();
        if (c.port === "COM9") {
          await sleep(50);
          out({ type: "error", message: busyPort("COM9"), busy: true });
        } else if (c.mode === "echo") {
          await sleep(200);
          const back = c.port !== "COM1";
          out({ type: "echo", result: { baud: c.bauds[0], sent: 15, received: back ? 15 : 0, echoed: back, partial: false, firstMs: back ? 3.2 : null, flags } });
        } else {
          for (const b of c.bauds) {
            for (let p = 25; p <= 100; p += 25) {
              if (me.cancel) break;
              await sleep(60);
              out({ type: "progress", baud: b, done: Math.round(p * 2.76), total: 276 });
            }
            if (me.cancel) break;
            if (c.port === "COM1") out({ type: "baud", result: { baud: b, sent: 32, received: 0, same: 0, changed: 0, lost: 32, extra: 0, rtt: null, flags, nothingBack: true } });
            else {
              const m = c.port === "COM5" ? 16.4 : 2.1;
              out({ type: "baud", result: { baud: b, sent: 256, received: 256, same: 256, changed: 0, lost: 0, extra: 0, rtt: { samples: 20, lost: 0, min: m - 0.6, median: m, max: m + 1.3 }, flags, nothingBack: false } });
            }
          }
        }
        me.done = true;
        out({ type: "done", cancelled: me.cancel, ms: now() - t0 });
      })();
      return null;
    }
    case "loop_cancel":
      if (PIL) PIL.cancel = true;
      return null;
  }
  return null;
}
window.__pdMock.loop = () => (PIL ? { config: PIL.config, done: PIL.done, cancel: PIL.cancel } : null);

// ================================================================ PLC Simulator (apps/plc-simulator — 명령: apps/plc-simulator/src-tauri/src/lib.rs,
// 처리기 모양: crates/core/src/mc.rs). 시작하면 TCP 는 클라이언트 둘(UDP 는 보내온 곳 하나)이 붙고, 0.45초마다 «0401 D0 ×4 읽기»,
// 다섯 번에 한 번 «1401 D100 쓰기»(값이 1씩 오름)를 주고받는다. 일부러 실패하는 입력: 포트 445(사용 중), 주소 nohost(찾지 못함).
const PLC_CMDS = new Set(["start", "stop", "kick", "set_log", "set_faults", "set_options", "set_sims", "set_size", "devices", "get_values", "set_values", "get_stats", "reset_stats"]);
const isPLC = () => /PLC Simulator/.test(document.title);
const PLC_DEV = { X: [0x9c, 1, 8192], Y: [0x9d, 1, 8192], M: [0x90, 1, 8192], L: [0x92, 1, 8192], F: [0x93, 1, 2048], B: [0xa0, 1, 8192], SM: [0x91, 1, 2048], D: [0xa8, 0, 12288], W: [0xb4, 0, 8192], R: [0xaf, 0, 32768], ZR: [0xb0, 0, 65536], SD: [0xa9, 0, 2048], TS: [0xc1, 1, 1024], TC: [0xc0, 1, 1024], TN: [0xc2, 0, 1024], CS: [0xc4, 1, 1024], CC: [0xc3, 1, 1024], CN: [0xc5, 0, 1024] };
const plcNewStats = () => ({ requests: 0, ok: 0, errors: 0, ignored: 0, noResponse: 0, writes: 0, perCmd: {}, perEnd: {} });
const plc = { mem: new Map(), sizes: Object.fromEntries(Object.entries(PLC_DEV).map(([k, v]) => [k, v[2]])), faults: null, options: { ownStationOnly: false }, sims: new Map(), stats: plcNewStats(), format: { frame: "3e", code: "binary" } };
const plcTbl = (d) => plc.mem.get(d) ?? plc.mem.set(d, new Map()).get(d);
const plcRange = (d, start, count) =>
  !(d in PLC_DEV) ? tr("모르는 디바이스", "unknown device") : start + count > plc.sizes[d] ? tr(`${d} 범위 밖(${plc.sizes[d]}점)`, `${d} out of range (${plc.sizes[d]} points)`) : null;
const plcHx = (v, n) => v.toString(16).toUpperCase().padStart(n * 2, "0");
/** 요청·응답 바이트(3E/4E·이진/ASCII) — 머리 + (요청: 감시 타이머 + 명령 데이터 / 응답: 종료 코드 + 데이터) */
function plcFrame(f, body, resp, serial) {
  if (f.code === "ascii") {
    const sub = f.frame === "4e" ? `${resp ? "D400" : "5400"}${plcHx(serial, 2)}0000` : resp ? "D000" : "5000";
    return [...enc.encode(`${sub}00FF03FF00${plcHx(body.length, 2)}${body}`)];
  }
  const sub = f.frame === "4e" ? [resp ? 0xd4 : 0x54, 0, serial & 0xff, serial >> 8, 0, 0] : [resp ? 0xd0 : 0x50, 0];
  return [...sub, 0, 0xff, 0xff, 0x03, 0, body.length & 0xff, body.length >> 8, ...body];
}
const plcData = (dir, bytes, peer) => ({ ts: now(), dir, bytes, check: null, peer });
function plcTick() {
  const s = S;
  if (!s || !s.peers.length) return;
  s.tick = (s.tick ?? 0) + 1;
  const p = s.peers[s.tick % s.peers.length];
  const f = plc.format;
  const ascii = f.code === "ascii";
  const serial = s.tick & 0xffff;
  const write = s.tick % 5 === 0;
  const d = plcTbl("D");
  const st = plc.stats;
  const fl = plc.faults;
  const forced = fl && fl.forceEndCode > 0 ? fl.forceEndCode : 0;
  const cmd = write ? "1401" : "0401";
  st.requests++;
  st.perCmd[cmd] = (st.perCmd[cmd] ?? 0) + 1;
  let req;
  let data;
  let sumReq;
  if (write) {
    const v = ((d.get(100) ?? 0) + 1) & 0xffff;
    req = ascii ? `00101401000000D*0001000001${plcHx(v, 2)}` : [0x10, 0, 0x01, 0x14, 0, 0, 100, 0, 0, 0xa8, 1, 0, v & 0xff, v >> 8];
    if (!forced) {
      d.set(100, v);
      st.writes++;
    }
    data = ascii ? "" : [];
    sumReq = tr("1401 일괄 쓰기 (워드) D100 ×1", "1401 Write (words) D100 ×1");
  } else {
    req = ascii ? "00100401000000D*0000000004" : [0x10, 0, 0x01, 0x04, 0, 0, 0, 0, 0, 0xa8, 4, 0];
    const vals = [0, 1, 2, 3].map((i) => d.get(i) ?? 0);
    data = ascii ? vals.map((v) => plcHx(v, 2)).join("") : vals.flatMap((v) => [v & 0xff, v >> 8]);
    sumReq = tr("0401 일괄 읽기 (워드) D0 ×4", "0401 Read (words) D0 ×4");
  }
  if (f.frame === "4e") sumReq += ` · #${plcHx(serial, 2)}`;
  frames({ ...plcData("rx", plcFrame(f, req, false, serial), p.addr), sum: sumReq });
  if (fl && fl.noResponse) {
    st.noResponse++;
    frames(ev(`NO-RESPONSE (fault) ${cmd}`));
    return;
  }
  const end = forced;
  const endHex = plcHx(end, 2);
  if (end) {
    st.errors++;
    st.perEnd[endHex] = (st.perEnd[endHex] ?? 0) + 1;
    frames(ev(`END ${endHex} ${tr("강제·기타", "forced/other")} — ${cmd} (fault)`));
  } else st.ok++;
  const info = ascii ? `00FF03FF00${cmd}0000` : [0, 0xff, 0xff, 0x03, 0, 0x01, write ? 0x14 : 0x04, 0, 0];
  const body = ascii ? `${endHex}${end ? info : data}` : [end & 0xff, end >> 8, ...(end ? info : data)];
  const n = end ? 0 : data.length;
  const sumTx = `${tr("종료", "End")} ${endHex} ${end ? tr("강제·기타", "forced/other") : tr("완료", "OK")}${n ? ` · ${n} ${ascii ? tr("글자", "chars") : tr("바이트", "bytes")}` : ""}`;
  const delay = fl ? (fl.delayMaxMs > fl.delayMs ? fl.delayMs + Math.floor(Math.random() * (fl.delayMaxMs - fl.delayMs + 1)) : fl.delayMs) : 0;
  later(Math.min(delay, 400), () => frames({ ...plcData("tx", plcFrame(f, body, true, serial), p.addr), sum: sumTx }));
}
function plcStart(c, ch) {
  if (S) return fail(tr("이미 시작했거나 여는 중입니다", "Already started or starting"));
  if (!c.host.trim() || !hostOk(c.host) || unresolvable(c.host)) return fail(tr(`${c.host}:${c.port}: 주소를 찾지 못했습니다`, `${c.host}:${c.port}: address not found`));
  if (c.port === 445) return fail(inUse(`${c.host}:${c.port}`));
  plc.format = { ...c.format };
  const local = `${c.host.trim()}:${c.port || 50500}`;
  const s = newSession("plc", ch, { cfg: { ...c }, port: local, server: true, online: true });
  later(10, () => {
    frames(ev(`${c.transport === "udp" ? "BIND" : "LISTEN"} ${local}`));
    status("listening", local, null);
  });
  const join = (addr) => {
    s.peers.push({ id: ++s.seq, addr });
    if (c.transport === "tcp") frames(ev(`ACCEPT ${addr}`));
    send({ type: "peers", peers: peerList() });
  };
  const net3 = c.host.trim() === "0.0.0.0" ? "192.168.0" : "127.0.0";
  later(250, () => join(`${net3}.20:51234`));
  if (c.transport === "tcp") later(700, () => join(`${net3}.21:50000`));
  every(450, plcTick);
  return Promise.resolve(local);
}
function plcsim(cmd, a) {
  switch (cmd) {
    case "start":
      return plcStart(a.config, a.onEvent);
    case "stop":
      if (S) endSession(S.port, [...S.peers.map((p) => `CLOSE ${p.addr} (${tr("사용자가 끊음", "disconnected by user")})`), "STOP LISTEN"]);
      return null;
    case "kick":
      return kick(a.id);
    case "set_log":
      if (!S) return fail(NO_SESSION());
      frames(ev(a.path ? `LOG ${a.path}` : "LOG OFF"));
      return null;
    case "set_faults":
      if ((a.faults.target?.probability ?? 100) > 100) return fail(tr("확률은 0~100% 입니다", "Probability is 0–100%"));
      plc.faults = { ...a.faults };
      return null;
    case "set_options":
      plc.options = { ...a.options };
      return null;
    case "set_sims":
      if (!(a.dev in PLC_DEV)) return fail("device");
      if (a.sims.length) plc.sims.set(a.dev, a.sims);
      else plc.sims.delete(a.dev);
      return null;
    case "set_size":
      if (!(a.dev in PLC_DEV)) return fail("device");
      if (!Number.isInteger(a.size) || a.size < 1 || a.size > 65536) return fail(tr(`${a.dev} 크기는 1~65536 점입니다`, `${a.dev} size must be 1–65536 points`));
      plc.sizes[a.dev] = a.size;
      for (const k of [...plcTbl(a.dev).keys()]) if (k >= a.size) plcTbl(a.dev).delete(k);
      return null;
    case "devices":
      return Object.entries(PLC_DEV).map(([dev, v]) => ({ dev, code: v[0], bits: !!v[1], hex: ["X", "Y", "B", "W", "ZR"].includes(dev), defaultSize: v[2], size: plc.sizes[dev] }));
    case "get_values": {
      const e = plcRange(a.dev, a.start, a.count);
      if (e) return fail(e);
      const m = plcTbl(a.dev);
      return Array.from({ length: a.count }, (_, i) => m.get(a.start + i) ?? 0);
    }
    case "set_values": {
      const e = plcRange(a.dev, a.start, a.values.length);
      if (e) return fail(e);
      const m = plcTbl(a.dev);
      const bits = !!PLC_DEV[a.dev][1];
      a.values.forEach((v, i) => m.set(a.start + i, bits ? (v ? 1 : 0) : v & 0xffff));
      return null;
    }
    case "get_stats":
      return JSON.parse(JSON.stringify(plc.stats));
    case "reset_stats":
      plc.stats = plcNewStats();
      return null;
  }
  return null;
}
window.__pdMock.plc = () => ({ format: plc.format, faults: plc.faults, options: plc.options, sizes: { ...plc.sizes }, sims: [...plc.sims.keys()] });

// ================================================================ Hardware Tester (apps/hw-tester — 명령: apps/hw-tester/src-tauri/src/lib.rs,
// 모양: rec.rs·bt.rs·crates/core/src/wlan.rs). 주소·이름은 예시 값(실제 기기·네트워크 아님).
// 끊김 기록: 시작하면 90박자 치 지난 기록을 한꺼번에 보내고(게이트웨이까지 손실 → «공유기 쪽»), 그 뒤 간격마다 하나씩.
// 지난 기록 50번째에 Wi-Fi 끊김(이유 문구)·55번째에 다시 연결. 대상 «10.255.255.1» 은 인터넷 쪽만 늘 손실(«공유기 너머»).
// 블루투스: 짝지은 장치 셋, 장치 1 이 1.2초마다 끊김·연결을 번갈아. 신호: window.__pdMock.hwSignal 로 상태를 바꿈(기본 ok).
const HW_CMDS = new Set(["rec_start", "rec_stop", "bt_start", "bt_stop", "wifi_signal", "bt_audio"]);
const HW_GW = "192.168.0.1";
let hwRec = null;
let hwBt = null;
const hwOut = (ch) => (e) => {
  try {
    ch?.onmessage?.(e);
  } catch (err) {
    window.__pdMock.errors.push(String(err?.stack ?? err));
  }
};
function hwTick(i, beyond) {
  // 게이트웨이: 17번째마다 손실, 끊김 구간(i 50~54)은 둘 다 손실
  // 공유기 너머(beyond): 게이트웨이는 늘 응답, 인터넷만 손실
  const down = !beyond && i >= 50 && i <= 54;
  const gw = down || (!beyond && i % 17 === 0) ? -1 : 2 + (i % 5) + (i % 23 === 0 ? 60 : 0);
  const net = down || beyond || i % 17 === 0 ? -1 : 18 + (i % 7) * 2;
  const dns = i % 5 === 0 ? (down ? -1 : 24 + (i % 3) * 6) : null;
  return { gw, net, dns };
}
async function hwsim(cmd, a) {
  switch (cmd) {
    case "rec_start": {
      if (hwRec && !hwRec.done) return fail(tr("이미 기록 중입니다", "Already recording"));
      const c = a.config;
      const t = String(c.target ?? "").trim();
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(t) && !/^[A-Za-z0-9.-]+$/.test(t)) return fail(`${t}: ${tr("IPv4 주소나 이름이 아닙니다", "not an IPv4 address or host name")}`);
      const iv = Math.min(60000, Math.max(1000, c.intervalMs | 0));
      const out = hwOut(a.onEvent);
      const beyond = t === "10.255.255.1";
      const past = 90;
      const t0 = now() - past * iv;
      const me = { done: false, timer: 0, i: 0, out };
      hwRec = me;
      await sleep(30);
      out({ type: "started", ts: t0, gateway: HW_GW, target: /^\d/.test(t) ? t : "192.0.2.10", dnsName: c.dnsName ?? "", intervalMs: iv });
      for (; me.i < past; me.i++) out({ type: "tick", ts: t0 + me.i * iv, ...hwTick(me.i, beyond) });
      if (!beyond) out({ type: "wifi", ts: t0 + 50 * iv, connected: false, code: 0x48000, reason: tr("드라이버에 의해 네트워크 연결이 끊어졌습니다.", "The network is disconnected by the driver.") });
      if (!beyond) out({ type: "wifi", ts: t0 + 55 * iv, connected: true, code: null, reason: null });
      me.timer = setInterval(() => {
        if (me.done) return;
        out({ type: "tick", ts: now(), ...hwTick(me.i++, beyond) });
      }, iv);
      return null;
    }
    case "rec_stop":
      if (hwRec && !hwRec.done) {
        hwRec.done = true;
        clearInterval(hwRec.timer);
        hwRec.out({ type: "stopped", ts: now(), reason: "user" });
      }
      return null;
    case "bt_start": {
      if (hwBt && !hwBt.done) return fail(tr("이미 기록 중입니다", "Already recording"));
      const out = hwOut(a.onEvent);
      const me = { done: false, timer: 0, on: true, out };
      hwBt = me;
      await sleep(30);
      out({
        type: "snapshot",
        ts: now(),
        devices: [
          { n: 1, name: "Example Buds", connected: true },
          { n: 2, name: "Example Keyboard", connected: true },
          { n: 3, name: "Example Mouse", connected: false },
        ],
      });
      me.timer = setInterval(() => {
        if (me.done) return;
        me.on = !me.on;
        out({ type: "change", ts: now(), dev: { n: 1, name: "Example Buds", connected: me.on }, added: false, removed: false });
      }, 1200);
      return null;
    }
    case "bt_stop":
      if (hwBt && !hwBt.done) {
        hwBt.done = true;
        clearInterval(hwBt.timer);
        hwBt.out({ type: "stopped", ts: now(), reason: "user" });
      }
      return null;
    case "wifi_signal": {
      await sleep(60);
      const st = window.__pdMock.hwSignal ?? "ok";
      const empty = { quality: null, rssi: null, rxMbps: null, txMbps: null, phy: null, band: null, channel: null, channels: [], error: null };
      if (st !== "ok") return { ...empty, state: st };
      const q = 62 + Math.round(Math.sin(now() / 4000) * 8);
      return {
        state: "ok",
        quality: q,
        rssi: -68 + Math.round(Math.sin(now() / 4000) * 4),
        rxMbps: 433,
        txMbps: 390,
        phy: "802.11ac",
        band: "5",
        channel: 36,
        channels: [
          { band: "2.4", channel: 1, count: 4, mine: false },
          { band: "2.4", channel: 6, count: 7, mine: false },
          { band: "2.4", channel: 11, count: 3, mine: false },
          { band: "5", channel: 36, count: 3, mine: true },
          { band: "5", channel: 149, count: 1, mine: false },
        ],
        error: null,
      };
    }
    case "bt_audio":
      await sleep(80);
      return {
        audio: [
          { name: tr("헤드셋 (Example Buds Hands-Free AG Audio)", "Headset (Example Buds Hands-Free AG Audio)"), flow: "render", kind: "handsFree", defaultConsole: true, defaultComms: true },
          { name: tr("헤드폰 (Example Buds Stereo)", "Headphones (Example Buds Stereo)"), flow: "render", kind: "stereo", defaultConsole: false, defaultComms: false },
          { name: tr("헤드셋 마이크 (Example Buds Hands-Free AG Audio)", "Headset microphone (Example Buds Hands-Free AG Audio)"), flow: "capture", kind: "handsFree", defaultConsole: true, defaultComms: true },
        ],
        errors: [],
      };
  }
  return null;
}
window.__pdMock.hw = () => ({ rec: hwRec && { done: hwRec.done, i: hwRec.i }, bt: hwBt && { done: hwBt.done } });
