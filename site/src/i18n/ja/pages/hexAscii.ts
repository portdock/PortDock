// HEX ↔ ASCII 변환기(views/HexAsciiPage.astro) — 4차 묶음
export default {
  title: "HEX ↔ ASCII 変換ツール",
  seo: "HEX ↔ ASCII 変換 — 制御文字も表示 — PortDock",
  desc: "16 進のバイトを文字に、文字を 16 進に変換します。CR・LF などの制御文字は \\r \\n \\xNN で表示するので、そのままコピーして送信に使えます。",
  hex: "HEX",
  ascii: "文字(ASCII・エスケープ)",
  dec: "10 進",
  count: "バイト",
  how: "表示できる文字(0x20~0x7E)はそのまま、それ以外は \\r \\n \\t \\0 \\\\ \\xNN で書きます。日本語などの文字は UTF-8 のバイトになります。計算はこのブラウザの中だけで行います。",
  tableTitle: "よく使う制御文字",
  appNote: "機器にすぐ送ってみるには",
  appEnd: " を使います。",
  ctrlHead: ["HEX", "名前", "入力"],
  asciiNote: "0~127 のすべてのコードと制御文字の名前は",
  asciiEnd: " にあります。",
};
