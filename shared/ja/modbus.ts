// 일본어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 ja 와 같게(局番·保持レジスタ·入力ステータス).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Ja<K extends string> = Partial<Record<K, string>>;

export const JA_MB_BUILDER: Ja<MbBuilderTextKey> = {
  title: "Modbus 要求を作る",
  titleTcp: "Modbus TCP 要求を作る",
  slave: "局番",
  slaveHint: "1~247(書き込み: 0 = ブロードキャスト、応答なし)",
  unitHint: "0~255 — MBAP の Unit ID 欄に入ります。普通は 1。ゲートウェイの先の RTU 局番、機器が見ないなら何でも",
  tid: "トランザクション ID",
  tidHint: "0~65535 — 応答に同じ値が返ります。送信欄の «トランザクション ID 自動» がオンなら送るたびに変わります",
  func: "ファンクション",
  addr: "開始アドレス",
  zero: "0 基準",
  plc: "{a} 表記",
  qty: "個数",
  qtyHint: "1~{a}",
  values: "値",
  valuesHint: "カンマ・空白区切り。10 進または 0x の 16 進、負の値も可",
  coilsHint: "1 (ON) / 0 (OFF) をカンマ・空白区切りで — 最初の値が開始アドレス",
  coil: "値",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} 個の値",
  preview: "要求(CRC の前)",
  previewTcp: "要求(MBAP ヘッダー + PDU)",
  crcNote: "+ 2 バイトの CRC16 Modbus は送信欄が付けます",
  tcpNote: "Modbus TCP には CRC がありません — チェックサムなしでそのまま送ります",
  put: "入力欄に入れる",
  send: "送信",
  sendTip: "この要求を今すぐ送ります(HEX、CRC16 Modbus 付き、行末なし)。このダイアログで Enter でも同じです",
  toPlc: "{a} 表記に切り替え",
  putTip: "送信欄を HEX・チェックサム CRC16 Modbus・行末なしにして、このバイト列を入れます",
  putTipTcp: "送信欄を HEX・チェックサムなし・行末なしにして、このバイト列を入れます",
  add: "一覧に保存",
  added: "コマンド一覧に «{a}» を追加しました",
  close: "閉じる",
  bcast: "局番 0 はすべての機器に書き込み、どの機器も応答しません。",
  help: "初めてですか?",
  helpLink: "手順を見る",
  helpTip: "ヘルプの Modbus 手順を開きます(このダイアログは閉じます)",
};

export const JA_MB_VALUES: Ja<Exclude<MbValuesTextKey, "fmts">> = {
  head: "要求と対応",
  from: "局番 {u} · {f} · {a}({n} 個)",
  tid: "トランザクション {t}",
  fmt: "値の形式",
  notation: "アドレス表記",
  zero: "0 基準",
  plc: "{a} 表記",
  write: "OK — 機器が書き込みを受け付けました",
  exc: "例外 {a}",
};

export const JA_MBAP: Ja<MbapTextKey> = {
  tid: "トランザクション ID",
  len: "長さ欄",
  lenBad: "長さ欄が実際の長さと違う",
  unit: "Unit ID(局番)",
  values: "値",
  head: "Modbus TCP",
};

export const JA_MB_BUILD: Partial<MbBuildText> = {
  slave: "局番は 1~247 です(書き込みファンクションでは 0 = ブロードキャスト — 応答なし)。",
  slaveRead: "読み出しファンクションでは局番 0(ブロードキャスト)は使えません — 応答が返りません。1~247 にしてください。",
  func: "対応していないファンクションです。",
  addrEmpty: "アドレスを入力してください。",
  addrNum: "アドレスは数値です(10 進。0 基準なら 0x の 16 進も可)。",
  addrZero: "0 基準のアドレスは 0~65535 です。",
  addrPlcLen: "PLC 表記は 5 桁(例 40001)か 6 桁(例 400001)です。",
  addrPlcOff: "PLC 表記は 1 から数えます(5 桁 0001~9999、6 桁 00001~65536)。",
  addrPrefix: "«{a}» は {b} 表記です。このファンクションは {c} を使います。",
  addrBadPrefix: "先頭の数字 {a} は Modbus の表記ではありません(0 コイル、1 入力ステータス、3 入力レジスタ、4 保持レジスタ)。",
  addrPlcNote: "{a} → 0 基準 {b} (0x{c})",
  addrLooksPlc: "«{a}» は {p}xxxx 表記に見えます。入力どおりなら 0 基準のアドレス {a} (0x{c}) — {p}xxxx 表記ならアドレス {b} です。",
  qty: "個数は 1~{a} です(プロトコルの上限)。",
  overflow: "終了アドレスが 65535 を超えます(開始 {a} + 個数 {b})。",
  valEmpty: "書き込む値を入力してください。",
  valBad: "«{a}» は値ではありません — 10 進か 0x の 16 進で入力してください。",
  valReg: "レジスタの値 «{a}» は -32768~65535 です(負の値は 2 の補数で送ります)。",
  valCoil: "コイルの値 «{a}» は 1 (ON) か 0 (OFF) です。",
  valOne: "このファンクションは値を 1 つだけ書き込みます。",
  valCount: "値が {n} 個 — このファンクションは 1~{a} 個です。",
  plcNames: { "0": "0xxxx(コイル)", "1": "1xxxx(入力ステータス、FC02)", "3": "3xxxx(入力レジスタ、FC04)", "4": "4xxxx(保持レジスタ、FC03/06/10)" },
};
