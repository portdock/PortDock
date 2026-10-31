// lib/checksum.ts 문구(영어 문장 → 일본어). {} 는 그 자리에 들어가는 값, 번역에서는 {0} {1} … 로 쓴다(lib/tr.ts)
export default {
  "Poly 0xA001 (reflected 0x8005), init 0xFFFF, low byte first": "多項式 0xA001(0x8005 の反転)、初期値 0xFFFF、下位バイトが先",
  "Poly 0x1021, init 0xFFFF, high byte first (CCITT-FALSE)": "多項式 0x1021、初期値 0xFFFF、上位バイトが先(CCITT-FALSE)",
  "Poly 0x1021, init 0x0000, high byte first": "多項式 0x1021、初期値 0x0000、上位バイトが先",
  "Poly 0x07, init 0x00": "多項式 0x07、初期値 0x00",
  "Two's complement of the byte sum": "バイトの和の 2 の補数",
  "XOR of all bytes": "全バイトの XOR",
  "Byte sum, low 8 bits": "バイトの和の下位 8 ビット",
  "Byte sum, 16 bits, high byte first": "バイトの和 16 ビット、上位バイトが先",
  "Not a HEX digit: «{}»": "HEX ではない文字: «{0}»",
  "Odd number of HEX digits: «{}»": "HEX の桁数が奇数です: «{0}»",
  "Bad \\x escape: «\\x{}» (two HEX digits)": "\\x エスケープが不正です: «\\x{0}»(HEX 2 桁)",
  "Unknown escape: «\\{}»": "不明なエスケープ: «\\{0}»",
};
