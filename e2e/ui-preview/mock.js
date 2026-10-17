// 화면 확인용 가짜 백엔드 — 실제 장비·통신 없이 화면만 그린다
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
mockWindows("main");
const now = () => Date.now();
const b = (s) => [...s].map((c) => c.charCodeAt(0));
const PORTS = [
  { name: "COM3", kind: "usb", vid: 0x1a86, pid: 0x7523, serial_number: null, manufacturer: "wch.cn", product: "USB-SERIAL CH340" },
  { name: "COM5", kind: "usb", vid: 0x0403, pid: 0x6001, serial_number: "A10KQ2XZ", manufacturer: "FTDI", product: "USB Serial Port" },
  { name: "COM1", kind: "pci", vid: null, pid: null, serial_number: null, manufacturer: "(표준 포트 유형)", product: "통신 포트" },
];
function sampleFrames() {
  const t = now();
  return [
    { ts: t, dir: "ev", bytes: [], check: null, note: "OPEN COM5 9600 8N1 flow none · DTR on RTS on · framing gap 20ms" },
    { ts: t + 10, dir: "tx", bytes: [1, 3, 0, 0, 0, 10, 0xc5, 0xcd], check: true },
    { ts: t + 42, dir: "rx", bytes: [1, 3, 20, 0, 100, 0, 200, 1, 44, 1, 144, 1, 244, 2, 88, 2, 188, 3, 32, 3, 132, 3, 232, 0x3a, 0x7f], check: true, peer: "192.168.0.20:51234" },
    { ts: t + 300, dir: "tx", bytes: b("STATUS?\r\n"), check: null },
    { ts: t + 330, dir: "rx", bytes: b("READY,TEMP=24.8C,HUM=41%,VOLT=12.03V,FW=v2.4.1-build.20261017,SERIAL=PD-00042-XYZ\r\n"), check: false, peer: "192.168.0.21:50000" },
    { ts: t + 900, dir: "ev", bytes: [], check: null, note: "LOST COM5 — 장치가 목록에서 사라졌습니다 (USB 뽑힘)" },
    { ts: t + 2100, dir: "ev", bytes: [], check: null, note: "RECONNECT COM5 (같은 장치 FTDI A10KQ2XZ)" },
  ];
}
let peersSent = false;
function connect(ch, port) {
  if (!ch || !ch.onmessage) return;
  setTimeout(() => {
    ch.onmessage({ type: "status", state: "connected", port: port ?? "COM5", message: null });
    ch.onmessage({ type: "frames", frames: sampleFrames() });
    ch.onmessage({ type: "lines", cts: true, dsr: false, ri: false, cd: true });
    if ((port ?? "").includes(":")) ch.onmessage({ type: "peers", peers: [{ id: 1, addr: "192.168.0.20:51234" }, { id: 2, addr: "192.168.0.21:50000" }, { id: 3, addr: "[fe80::1c2b:3d4e:5f60:7182%12]:49152" }] });
  }, 150);
}
mockIPC((cmd, args) => {
  switch (cmd) {
    case "list_ports": return PORTS;
    case "report_env": return { app: "preview", version: "0.1.0", os: "windows", arch: "x86_64", reportsDir: "C:\Users\me\AppData\Local\dev.portdock.x\reports" };
    case "report_pending": return [];
    case "open_session": connect(args.onEvent, args.config?.port); return null;
    case "open": connect(args.onEvent, args.config?.port); return null;
    case "start": connect(args.onEvent, "0.0.0.0:5000"); return "0.0.0.0:5000";
    case "start_serial": connect(args.onEvent, "COM5"); return null;
    case "start_tcp": connect(args.onEvent, "0.0.0.0:5000"); return "0.0.0.0:5000";
    case "start_udp": connect(args.onEvent, "0.0.0.0:5001"); return "0.0.0.0:5001";
    case "preview": { const s = args.spec; try { return s.mode === "hex" ? (s.text.match(/[0-9a-f]{2}/gi) ?? []).map((x) => parseInt(x, 16)) : b(s.text); } catch { return []; } }
    case "decode_modbus": return { slave: 1, function: 3, function_name: "Read Holding Registers", kind: "response", crc_ok: true, fields: [["byte count", "20"]], values: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] };
    case "get_values": return Array.from({ length: args.count }, (_, i) => (i * 7) % 300);
    case "get_stats": return { requests: 1284, ok: 1270, exceptions: 9, ignored: 5, writes: 37 };
    case "get_hits": return { "modbus read": 12, status: 3 };
    case "set_rules": return { active: (args.rules ?? []).length, errors: [] };
    case "send": return cmd === "send" && args.target !== undefined ? { sent: 2, total: 3 } : "192.168.0.21:50000";
    case "read_text": return "";
    default: return null;
  }
}, { shouldMockEvents: true });
