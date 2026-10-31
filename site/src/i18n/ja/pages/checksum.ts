// CRC·체크섬 계산기(views/ChecksumPage.astro)
export default {
  title: "CRC・チェックサム計算ツール",
  seo: "CRC16 Modbus・チェックサム計算ツール(オンライン)— PortDock",
  desc: "CRC16 Modbus・CCITT・XMODEM、CRC8、LRC、BCC(XOR)、SUM8、SUM16 をまとめて計算します。HEX と ASCII(\\r \\n \\xNN)入力に対応し、付加する順序で表示します。",
  input: "データ",
  mode: "入力形式",
  kind: "種類",
  value: "チェックサム(送信順)",
  frame: "本文+チェックサム",
  bytes: "バイト",
  hexHelp: "例: 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "例: STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "計算方式",
  how: "計算はすべてこのブラウザの中だけで行い、入力したデータはどこにも送りません。",
  appNote: "機器と直接やり取りしながらチェックサムを付加・確認するソフト:",
  appLink: "PortDock Serial",
  faqTitle: "よくある質問",
  faq: [
    ["Modbus RTU の CRC はなぜ順序が逆なのですか?", "Modbus RTU は CRC16 の下位バイトを先に送ります。«01 03 00 00 00 0A» の CRC は 0xCDC5 で、伝送路上では «C5 CD» の順に付きます。"],
    ["CRC16 CCITT の値がほかの計算ツールと違います", "CCITT は初期値によっていくつかの変種があります。ここの «CRC16 CCITT» は初期値 0xFFFF(CCITT-FALSE)、«CRC16 XMODEM» は 0x0000 です。Kermit はビット順が逆の別の変種です。"],
    ["LRC は Modbus ASCII の LRC と同じですか?", "同じ式(バイトの和の 2 の補数)を生のバイト列に適用します。Modbus ASCII では、文字をバイトに変換してから計算してください。"],
  ],
};
