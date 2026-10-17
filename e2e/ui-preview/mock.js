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
function compute(kind, data) {
  switch (kind) {
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
/** 수신 검증 — 끝 바이트가 체크섬과 맞는지. 짧으면 null */
function verify(kind, bytes) {
  if (!kind) return null;
  const n = compute(kind, [0]).length;
  if (bytes.length <= n) return null;
  const body = bytes.slice(0, -n);
  const c = compute(kind, body);
  return c.every((x, i) => x === bytes[bytes.length - n + i]);
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
function parseAscii(text) {
  const out = [];
  const cs = [...text];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c !== "\\") {
      out.push(...enc.encode(c));
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
/** codec::build — 본문 + 체크섬 + 끝 문자. 틀리면 문자열을 던진다 */
function build(spec) {
  const body = spec.mode === "hex" ? parseHex(spec.text ?? "") : parseAscii(spec.text ?? "");
  const ck = spec.checksum ? compute(spec.checksum, body) : [];
  return [...body, ...ck, ...parseAscii(spec.suffix ?? "")];
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
  const p = c.parity === "odd" ? "O" : c.parity === "even" ? "E" : "N";
  return `${c.port} ${c.baud} ${c.dataBits}${p}${c.stopBits} flow=${c.flow} DTR=${c.dtr ? 1 : 0} RTS=${c.rts ? 1 : 0}`;
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
  for (const k of ["baud", "dataBits", "parity", "stopBits", "flow", "dtr", "rts"]) if (a[k] !== b[k]) out.push(`${k} ${a[k]}→${b[k]}`);
  return out;
}

// ---- Modbus Slave 앱
const slave = {
  ids: [1],
  tables: new Map(), // "id:table" → Map(addr → value)
  ranges: new Map(),
  faults: { delayMs: 0, noResponse: false, forceException: 0, badCrc: false },
  stats: { requests: 0, ok: 0, exceptions: 0, ignored: 0, writes: 0 },
};
const tbl = (id, t) => {
  const k = `${id}:${t}`;
  if (!slave.tables.has(k)) slave.tables.set(k, new Map());
  return slave.tables.get(k);
};
const spanErr = (start, count) =>
  !Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count <= 0 || start + count > 65536 ? tr("주소 범위가 0~65535 를 벗어납니다", "Address range is outside 0–65535") : null;
function slaveTick() {
  const s = S;
  if (!s.online) return;
  s.seq++;
  const id = slave.ids[s.seq % slave.ids.length];
  slave.stats.requests++;
  // 마스터 요청: 읽기 위주, 가끔 쓰기(FC06 — 4x 주소 3 을 1씩 올린다)
  const write = s.seq % 6 === 0;
  const req = write ? withCrc([id, 6, 0, 3, 0, s.seq & 0xff]) : withCrc([id, 3, 0, 0, 0, 4]);
  frames(data("rx", req, true));
  const f = slave.faults;
  if (f.noResponse) {
    slave.stats.ignored++;
    frames(ev(tr("NO RESPONSE (장애 주입)", "NO RESPONSE (fault injection)")));
    return;
  }
  let resp;
  if (f.forceException) {
    slave.stats.exceptions++;
    resp = withCrc([id, write ? 0x86 : 0x83, f.forceException]);
  } else if (write) {
    tbl(id, "holding-registers").set(3, s.seq & 0xff);
    slave.stats.writes++;
    slave.stats.ok++;
    resp = req;
  } else {
    slave.stats.ok++;
    const m = tbl(id, "holding-registers");
    const vals = [0, 1, 2, 3].flatMap((a) => [((m.get(a) ?? 0) >> 8) & 0xff, (m.get(a) ?? 0) & 0xff]);
    resp = withCrc([id, 3, 8, ...vals]);
  }
  if (f.badCrc) resp[resp.length - 1] ^= 0xff;
  later(Math.min(f.delayMs, 500), () => frames(data("tx", resp, null)));
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
        frames(ev(framingNote(a.framing)), ...(a.rxCheck ? [ev(`RXCHECK ${a.rxCheck}`)] : []));
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
      if ((S.rxCheck ?? null) !== (a.rxCheck ?? null)) frames(ev(`RXCHECK ${a.rxCheck ?? "none"}`));
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
      if (S?.kind === "slave") every(600, slaveTick);
      return r;
    }
    case "close":
      if (S) endSession(S.port);
      return null;
    case "set_faults":
      slave.faults = { ...a.faults };
      return null;
    case "set_slave_ids":
      if (!a.ids?.length) return fail(tr("슬레이브 주소가 하나는 있어야 합니다", "At least one slave ID is required"));
      if (a.ids.some((x) => !Number.isInteger(x) || x < 1 || x > 247)) return fail(tr("슬레이브 주소는 1~247", "Slave IDs are 1–247"));
      slave.ids = [...a.ids];
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
      return { ...slave.stats };
    case "reset_stats":
      slave.stats = { requests: 0, ok: 0, exceptions: 0, ignored: 0, writes: 0 };
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
    return handle(cmd, a);
  },
  { shouldMockEvents: true },
);
