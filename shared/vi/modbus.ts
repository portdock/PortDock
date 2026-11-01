// 베트남어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 앱 vi 사전과 같게(Slave ID·thanh ghi·cách ghi·Mã hàm).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Vi<K extends string> = Partial<Record<K, string>>;

export const VI_MB_BUILDER: Vi<MbBuilderTextKey> = {
  title: "Tạo yêu cầu Modbus",
  titleTcp: "Tạo yêu cầu Modbus TCP",
  slave: "Slave ID",
  slaveHint: "1–247 (ghi: 0 = broadcast, không phản hồi)",
  unitHint: "0–255 — đưa vào trường Unit ID của MBAP. Thường là 1; là Slave ID RTU phía sau gateway; giá trị nào cũng được nếu thiết bị bỏ qua",
  tid: "Transaction ID",
  tidHint: "0–65535 — phản hồi trả lại đúng giá trị này. Nếu bật «Transaction ID tự động» trên thanh gửi thì đổi sau mỗi lần gửi",
  func: "Mã hàm",
  addr: "Địa chỉ bắt đầu",
  zero: "Từ 0",
  plc: "Cách ghi {a}",
  qty: "Số lượng",
  qtyHint: "1–{a}",
  values: "Giá trị",
  valuesHint: "Cách nhau bằng dấu phẩy/khoảng trắng. Thập phân hoặc hex 0x; được dùng số âm",
  coilsHint: "1 (ON) / 0 (OFF), cách nhau bằng dấu phẩy/khoảng trắng — giá trị đầu là địa chỉ bắt đầu",
  coil: "Giá trị",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} giá trị",
  preview: "Yêu cầu (trước CRC)",
  previewTcp: "Yêu cầu (header MBAP + PDU)",
  crcNote: "+ 2 byte CRC16 Modbus do thanh gửi thêm vào",
  tcpNote: "Modbus TCP không có CRC — gửi nguyên trạng, không checksum",
  put: "Đưa vào ô nhập",
  send: "Gửi",
  sendTip: "Gửi yêu cầu này ngay (HEX, thêm CRC16 Modbus, không ký tự cuối dòng). Nhấn Enter trong hộp thoại này cũng vậy",
  toPlc: "Chuyển sang cách ghi {a}",
  putTip: "Đặt thanh gửi là HEX, checksum CRC16 Modbus, không ký tự cuối dòng, rồi điền các byte này",
  putTipTcp: "Đặt thanh gửi là HEX, không checksum, không ký tự cuối dòng, rồi điền các byte này",
  add: "Lưu vào danh sách",
  added: "Đã thêm «{a}» vào danh sách lệnh",
  close: "Đóng",
  bcast: "Slave ID 0 ghi tới mọi thiết bị; không thiết bị nào phản hồi.",
  help: "Lần đầu?",
  helpLink: "Xem hướng dẫn",
  helpTip: "Mở hướng dẫn Modbus trong Trợ giúp (hộp thoại này sẽ đóng)",
};

export const VI_MB_VALUES: Vi<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Ghép với yêu cầu",
  from: "Slave ID {u} · {f} · {a} ({n})",
  tid: "transaction {t}",
  fmt: "Định dạng giá trị",
  notation: "Địa chỉ",
  zero: "Từ 0",
  plc: "Cách ghi {a}",
  write: "OK — thiết bị đã nhận lệnh ghi",
  exc: "Ngoại lệ {a}",
};

export const VI_MBAP: Vi<MbapTextKey> = {
  tid: "Transaction ID",
  len: "Trường độ dài",
  lenBad: "trường độ dài không khớp",
  unit: "Unit ID (Slave ID)",
  values: "Giá trị",
  head: "Modbus TCP",
};

export const VI_MB_BUILD: Partial<MbBuildText> = {
  slave: "Slave ID là 1–247 (0 = broadcast cho hàm ghi — không phản hồi).",
  slaveRead: "Hàm đọc không dùng được Slave ID 0 (broadcast) — sẽ không có phản hồi. Hãy dùng 1–247.",
  func: "Mã hàm không được hỗ trợ.",
  addrEmpty: "Hãy nhập địa chỉ.",
  addrNum: "Địa chỉ phải là số (thập phân; với kiểu từ 0 được dùng hex 0x).",
  addrZero: "Địa chỉ từ 0 là 0–65535.",
  addrPlcLen: "Cách ghi PLC có 5 chữ số (vd. 40001) hoặc 6 chữ số (vd. 400001).",
  addrPlcOff: "Cách ghi PLC đếm từ 1 (5 chữ số 0001–9999, 6 chữ số 00001–65536).",
  addrPrefix: "«{a}» là cách ghi {b}. Hàm này dùng {c}.",
  addrBadPrefix: "Chữ số đầu {a} không phải cách ghi Modbus (0 coil, 1 đầu vào rời rạc, 3 thanh ghi đầu vào, 4 thanh ghi giữ).",
  addrPlcNote: "{a} → từ 0 là {b} (0x{c})",
  addrLooksPlc: "«{a}» trông như cách ghi {p}xxxx. Như đã nhập sẽ đọc địa chỉ từ 0 là {a} (0x{c}) — theo cách ghi {p}xxxx là địa chỉ {b}.",
  qty: "Số lượng là 1–{a} (giới hạn giao thức).",
  overflow: "Địa chỉ cuối vượt 65535 (bắt đầu {a} + số lượng {b}).",
  valEmpty: "Hãy nhập giá trị cần ghi.",
  valBad: "«{a}» không phải giá trị — dùng thập phân hoặc hex 0x.",
  valReg: "Giá trị thanh ghi «{a}» phải trong -32768–65535 (số âm gửi dạng bù hai).",
  valCoil: "Giá trị coil «{a}» phải là 1 (ON) hoặc 0 (OFF).",
  valOne: "Hàm này chỉ ghi một giá trị.",
  valCount: "{n} giá trị — hàm này nhận 1–{a}.",
  plcNames: { "0": "0xxxx (coil)", "1": "1xxxx (đầu vào rời rạc, FC02)", "3": "3xxxx (thanh ghi đầu vào, FC04)", "4": "4xxxx (thanh ghi giữ, FC03/06/10)" },
};
