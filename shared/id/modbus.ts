// 인도네시아어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 앱 id 사전과 같게(Slave ID·register·notasi·Fungsi·Basis 0).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Id<K extends string> = Partial<Record<K, string>>;

export const ID_MB_BUILDER: Id<MbBuilderTextKey> = {
  title: "Buat request Modbus",
  titleTcp: "Buat request Modbus TCP",
  slave: "Slave ID",
  slaveHint: "1–247 (tulis: 0 = broadcast, tanpa balasan)",
  unitHint: "0–255 — masuk ke field Unit ID MBAP. Biasanya 1; Slave ID RTU di balik gateway; nilai apa pun jika perangkat mengabaikannya",
  tid: "Transaction ID",
  tidHint: "0–65535 — balasan mengembalikannya. Jika «Transaction ID otomatis» aktif di bilah kirim, berubah tiap kirim",
  func: "Fungsi",
  addr: "Alamat awal",
  zero: "Basis 0",
  plc: "Notasi {a}",
  qty: "Jumlah",
  qtyHint: "1–{a}",
  values: "Nilai",
  valuesHint: "Dipisah koma/spasi. Desimal atau hex 0x; boleh negatif",
  coilsHint: "1 (ON) / 0 (OFF), dipisah koma/spasi — nilai pertama di alamat awal",
  coil: "Nilai",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} nilai",
  preview: "Request (sebelum CRC)",
  previewTcp: "Request (header MBAP + PDU)",
  crcNote: "+ CRC16 Modbus 2 byte ditambahkan oleh bilah kirim",
  tcpNote: "Modbus TCP tidak punya CRC — dikirim apa adanya, tanpa checksum",
  put: "Taruh di input",
  send: "Kirim",
  sendTip: "Mengirim request ini sekarang (HEX, CRC16 Modbus ditambahkan, tanpa akhir baris). Enter di dialog ini sama",
  toPlc: "Ganti ke notasi {a}",
  putTip: "Mengatur bilah kirim ke HEX, checksum CRC16 Modbus, tanpa akhir baris, lalu mengisi byte ini",
  putTipTcp: "Mengatur bilah kirim ke HEX, tanpa checksum, tanpa akhir baris, lalu mengisi byte ini",
  add: "Simpan ke daftar",
  added: "«{a}» ditambahkan ke daftar perintah",
  close: "Tutup",
  bcast: "Slave ID 0 menulis ke semua perangkat; tidak ada yang membalas.",
  help: "Pertama kali?",
  helpLink: "Lihat panduan",
  helpTip: "Membuka panduan Modbus di Bantuan (dialog ini tertutup)",
};

export const ID_MB_VALUES: Id<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Dipasangkan dengan request",
  from: "Slave ID {u} · {f} · {a} ({n})",
  tid: "transaksi {t}",
  fmt: "Format nilai",
  notation: "Alamat",
  zero: "Basis 0",
  plc: "Notasi {a}",
  write: "OK — perangkat menerima penulisan",
  exc: "Exception {a}",
};

export const ID_MBAP: Id<MbapTextKey> = {
  tid: "Transaction ID",
  len: "Field panjang",
  lenBad: "field panjang tidak cocok",
  unit: "Unit ID (Slave ID)",
  values: "Nilai",
  head: "Modbus TCP",
};

export const ID_MB_BUILD: Partial<MbBuildText> = {
  slave: "Slave ID adalah 1–247 (0 = broadcast untuk fungsi tulis — tanpa balasan).",
  slaveRead: "Fungsi baca tidak bisa memakai Slave ID 0 (broadcast) — tidak akan ada balasan. Gunakan 1–247.",
  func: "Fungsi tidak didukung.",
  addrEmpty: "Masukkan alamat.",
  addrNum: "Alamat harus angka (desimal; hex 0x boleh untuk basis 0).",
  addrZero: "Alamat basis 0 adalah 0–65535.",
  addrPlcLen: "Notasi PLC punya 5 digit (mis. 40001) atau 6 digit (mis. 400001).",
  addrPlcOff: "Notasi PLC dihitung dari 1 (5 digit 0001–9999, 6 digit 00001–65536).",
  addrPrefix: "«{a}» adalah notasi {b}. Fungsi ini memakai {c}.",
  addrBadPrefix: "Digit awal {a} bukan notasi Modbus (0 coil, 1 input diskret, 3 input register, 4 holding register).",
  addrPlcNote: "{a} → basis 0 {b} (0x{c})",
  addrLooksPlc: "«{a}» tampak seperti notasi {p}xxxx. Seperti yang diketik, yang dibaca alamat basis 0 {a} (0x{c}) — dalam notasi {p}xxxx itu alamat {b}.",
  qty: "Jumlah adalah 1–{a} (batas protokol).",
  overflow: "Alamat akhir melewati 65535 (awal {a} + jumlah {b}).",
  valEmpty: "Masukkan nilai yang akan ditulis.",
  valBad: "«{a}» bukan nilai — gunakan desimal atau hex 0x.",
  valReg: "Nilai register «{a}» harus -32768–65535 (negatif dikirim sebagai komplemen dua).",
  valCoil: "Nilai coil «{a}» harus 1 (ON) atau 0 (OFF).",
  valOne: "Fungsi ini menulis satu nilai.",
  valCount: "{n} nilai — fungsi ini menerima 1–{a}.",
  plcNames: { "0": "0xxxx (coil)", "1": "1xxxx (input diskret, FC02)", "3": "3xxxx (input register, FC04)", "4": "4xxxx (holding register, FC03/06/10)" },
};
