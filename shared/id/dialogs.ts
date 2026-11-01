// 인도네시아어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Id<K extends string> = Partial<Record<K, string>>;

export const ID_DEVICE: Id<DeviceTextKey> = {
  masterTitle: "Muat profil perangkat",
  slaveTitle: "Muat emulasi perangkat",
  search: "Cari (pabrikan, model, tipe)",
  none: "Tidak ada perangkat yang cocok",
  close: "Tutup",
  cancel: "Batal",
  apply: "Muat",
  regs: "{n} register",
  comm: "Komunikasi bawaan",
  commOpt: "Terapkan juga pengaturan serial (baud, data, paritas, stop)",
  commNone: "Tidak ada pengaturan komunikasi bawaan yang dipastikan di manual",
  gapOpt: "Baca register dengan celah kecil dalam satu tabel (hingga {n} — matikan jika perangkat menolak alamat yang tidak dipakai)",
  masterPlan: "Menambah {n} tabel polling (Slave ID {u}): {a}",
  masterSkip: "{n} register hanya-tulis tidak di-polling",
  slavePlan: "Mengisi nama, tipe, dan nilai contoh ke Slave ID {u} saat ini. Rentang respons diperluas bila perlu.",
  slaveUnit: "Slave ID bawaan perangkat ini adalah {u}",
  sources: "Sumber",
  caution: "Fakta diambil dari manual pabrikan (tidak berafiliasi dengan pabrikan). Bisa berbeda menurut firmware atau model — periksa manual perangkat sebelum menulis.",
  thAddr: "Alamat (manual)",
  thName: "Nama",
  thType: "Tipe",
  thUnit: "Satuan",
  thRw: "R/W",
  notes: "Catatan",
  behaveOpt: "Tambahkan juga generator nilai dan aturan tautan — fluktuasi tegangan/arus, akumulasi energi, perintah jalan → ramp frekuensi keluaran",
  guardOpt: "Terapkan hanya-baca dan hanya-tulis",
  slaveNote: "Nilai ini diambil dari tabel manual — perilaku perangkat nyata (waktu ramp, dll.) bisa berbeda.",
};

export const ID_PORTCHECK: Id<PortCheckTextKey> = {
  title: "Periksa koneksi",
  close: "Tutup (Esc)",
  reading: "Membaca…",
  readFail: "Tidak terbaca",
  device: "Perangkat dan driver",
  settings: "Pengaturan",
  power: "Hemat daya",
  test: "Uji koneksi",
  cannot: "Yang tidak terlihat oleh PC",
  guides: "Panduan:",
  name: "Nama",
  chip: "VID:PID · chip",
  driver: "Driver",
  problem: "Kode masalah",
  action: "Yang bisa dicoba",
  latency: "FTDI latency timer",
  suspend: "USB selective suspend",
  canOff: "PC boleh mematikannya",
  on: "aktif",
  off: "mati",
  connected: "Putuskan koneksi dulu untuk menjalankan uji (uji membuka port sendiri).",
  copy: "Salin teks",
  copied: "Tersalin",
  more: "Untuk riwayat driver, nomor COM yang dicadangkan, dan perangkat tersembunyi, gunakan PortDock Port Inspector.",
  readOnly: "Hanya baca, tanpa hak administrator.",
};

export const ID_LOOP: Id<LoopTextKey> = {
  mode: "Uji",
  loop: "Loopback — TX disambung ke RX",
  loopHint: "Pada DB9 sambungkan pin 2 (RX) ke pin 3 (TX); pada adaptor TTL sambungkan TX ke RX. Memeriksa byte kembali tanpa berubah di tiap kecepatan dan mengukur pulang-pergi 1 byte.",
  two: "Dua port — dua adaptor saling disambung",
  twoHint: "Dengan dua adaptor/kabel yang saling disambung, mengirim port ini → port lain dan port lain → port ini di tiap kecepatan lalu membandingkan yang tiba. Berguna untuk memeriksa adaptor RS-485.",
  peer: "Port lain",
  peerNone: "Tidak ada port lain",
  pattern: "Pola",
  patRandom: "Byte campuran",
  patRamp: "0x00–0xFF berurutan",
  patAlt: "0x55/0xAA bergantian",
  length: "Panjang (byte)",
  wiring: "Cara menyambung",
  overall: "Keseluruhan",
  colDir: "Arah",
  echo: "Echo RS-485 2 kabel",
  echoHint: "Tanpa perangkat di bus, memeriksa apakah adaptor menerima byte yang dikirimnya.",
  bauds: "Kecepatan",
  more: "Kecepatan lain",
  start: "Mulai uji",
  cancel: "Berhenti",
  sure: "Apakah perangkat sudah dilepas dari jalur/bus? Byte uji bisa sampai ke perangkat sebagai perintah.",
  sureYes: "Sudah dilepas — mulai",
  sureNo: "Batal",
  running: "Menguji",
  noPort: "Pilih port dulu.",
  colBaud: "Kecepatan",
  colResult: "Hasil",
  colBytes: "Terkirim · sama · hilang · berubah",
  colRtt: "Pulang-pergi 1 byte ms (median · maks)",
  colFlags: "Flag error",
  flagsNone: "tidak ada",
  flagsUnread: "tidak terbaca",
  flagFrame: "framing",
  flagParity: "paritas",
  flagOverrun: "overrun",
  flagRxOver: "buffer overflow",
  flagsNote: "Flag error hanya muncul saat driver menaikkannya — «tidak ada» tidak menjamin tidak ada error. Waktu pulang-pergi termasuk latensi USB, driver, dan program.",
  echoBack: "Byte kembali",
  firstMs: "Sampai byte pertama",
};

/** Cara menyambung (dalam teks) */
export const ID_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, jantan atau betina)", "  pin 2 (RX) ──┐", "  pin 3 (TX) ──┘   sambung pin 2 ke pin 3", "", "Adaptor TTL", "  TX ──┐", "  RX ──┘   sambung TX ke RX", "", "RS-485 tidak bisa loopback di satu port — pilih «Dua port»."].join("\n"),
  two: ["RS-232 (bersilang, null modem)", "  port A        port B", "  pin 2 RX ──── pin 3 TX", "  pin 3 TX ──── pin 2 RX", "  pin 5 GND ─── pin 5 GND", "", "RS-485 (2 kabel)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Satu adaptor RS-485 — perangkat dilepas dari bus", "  A(D+)  B(D−)  tidak tersambung apa pun"].join("\n"),
};

export const ID_IFACE: Id<IfaceTextKey> = {
  title: "PC ini",
  all: "semua adaptor",
  local: "hanya PC ini",
  down: "tidak terhubung",
  none: "Alamat adaptor tidak terbaca",
  refresh: "Muat ulang",
  use: "Pakai alamat ini",
  gw: "gateway",
  notHere: "«{a}» bukan alamat PC ini — memulai akan gagal dengan «address not available». Pilih dari daftar di bawah.",
  downHere: "Adaptor untuk «{a}» ({b}) tidak terhubung (periksa kabel / Wi-Fi).",
};

export const ID_OPEN_APP: Id<OpenAppTextKey> = {
  opened: "{a} dibuka — {b}. Tekan sambungkan di jendela itu.",
  missing: "{a} tidak ditemukan di PC ini, jadi «{b}» disalin — tempelkan di sana.",
  get: "Halaman unduh",
};

/** Konfirmasi tutup (exitGuard.ts) */
export const ID_EXIT = "Koneksi atau log file sedang aktif. Menutup akan memutus koneksi dan menghentikan log. Tetap tutup?";

/** Perintah contoh (examples.ts) — awalan nama dan nama Inggris → nama Indonesia */
export const ID_EXAMPLE_PREFIX = "mis. ";
export const ID_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (cek balasan)",
  "ATI (device info)": "ATI (info perangkat)",
  "AT+GMR (firmware version)": "AT+GMR (versi firmware)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus Slave ID 1 baca 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus Slave ID 1 baca 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (ID instrumen SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP Slave ID 1 baca 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP Slave ID 1 baca 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "Request HTTP halaman utama (port 80)",
  "text hello": "teks hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (ID instrumen)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (tegangan DC)",
  "SYST:ERR? (one error)": "SYST:ERR? (satu error)",
};
