// PortDock MCP — 소개 쪽 글(data/tools.ts 의 {ko,en} 과 같은 모양·순서). 도구 이름(modbus_write_sim·mc_write_sim·allow_measure)·SCPI 명령·파일 이름은 그대로.
export default {
  seo: {
    title: "PortDock MCP — AI クライアントから COM ポート・Modbus を読む",
    desc: "Claude Desktop など AI クライアントから COM ポートの状態、Modbus・MC・SCPI の値を読める無料の MCP サーバー。書き込みは 127.0.0.1 のシミュレータだけ。",
  },
  summary: "AI クライアント(Claude Desktop、VS Code、Cursor など)が起動する、ウィンドウのない MCP サーバーです。AI がこの PC の COM ポートと LAN アダプターを読み、指定した機器から Modbus・MC プロトコル・SCPI の値を読みます。書き込みツールはこの PC のアドレス(127.0.0.1)だけを受け付け、シミュレータ用です。0.10.0 から、Modbus の書き込みは PortDock と名乗る相手にだけ送ります。MC の書き込みはアドレスだけで確かめるので、この PC のソフトがほかの機器へ転送している(TCP 中継・ゲートウェイ・トンネル)と、書き込みが実機に届くことがあります。",
  who: [
    "COM ポートや USB 変換器の問題を AI アシスタントと一緒に調べたい方",
    "AI との会話の中で Modbus・MC・SCPI の値を読みたい開発者",
    "実機ではなくシミュレータで AI のツール利用を練習したい方",
  ],
  features: [
    {
      title: "読み取りツール 9 つ",
      body: "COM ポートの一覧、Port Inspector の点検結果、シリアルの受信(何も送らない)、Modbus の読み出し(FC 01〜04)、MC 3E の一括読出し、SCPI の問い合わせ、ping、LAN アダプター、機器のレジスタマップ。",
    },
    {
      title: "書き込みは 127.0.0.1 のシミュレータだけ",
      body: "この PC の Modbus Slave や PLC Simulator で «書いてから読み返す» を練習します。ほかのアドレスは接続する前に断ります。0.10.0 からは Modbus の書き込みには相手が «PortDock» と名乗ること(FC 2B/0E)も必要です。MC の書き込みはアドレスだけで確かめるので、中継ソフトが動いているときは使わないでください。",
    },
    {
      title: "SCPI は問い合わせだけ",
      body: "«?» で終わる問い合わせを 1 つ送ります。*TST?・*CAL?・*RST のように状態を変えうるものは断ります。新しい測定を始める READ? と MEAS…? は既定で断り、allow_measure で許可したときだけ送ります(0.8.0 から)。最後の値だけを読むなら FETC? を使います。",
    },
    {
      title: "セッションログと回数の制限",
      body: "呼び出しはすべてこの PC に JSON の行として残り、外には送りません。同じ相手には 100 ms に 1 回まで、1 分に 120 回まで。",
    },
    {
      title: "個人情報を伏せる",
      body: "結果の中のユーザーフォルダーのパスは «~»、MAC アドレスは «xx-…»、ネットワーク名は «(hidden)» になります。",
    },
    {
      title: "インストールはファイル 1 つ",
      body: "Python・Node・Docker は不要:.mcpb(Claude Desktop で開く)か、zip に入った exe 1 つです。",
    },
  ],
  steps: [
    "Claude Desktop で PortDock-MCP.mcpb を開く(ほかのクライアントは zip の中の exe のパスを設定に書く)",
    "AI に «COM ポートを一覧にして» のように頼む — ツールを呼ぶ前にクライアントが確認します",
    "機器を読むならアドレス・ポート・局番を伝える。練習は 127.0.0.1 の Modbus Slave や PLC Simulator で",
  ],
  faq: [
    {
      q: "AI が機器の設定を変えられますか?",
      a: "書き込みツール 2 つは、相手が 127.0.0.1 か localhost(この PC)のときだけ動き、ほかのアドレスは接続する前に断ります。0.10.0 から modbus_write_sim は、相手が機器の識別(FC 2B/0E)に «PortDock» で始まるベンダー名で応答したときだけ書き込むので、PortDock Serial の Modbus TCP ↔ RTU ゲートウェイ(既定 127.0.0.1:502)の先の実機には書き込みません。mc_write_sim はアドレスだけで確かめるので、この PC のソフトがほかの機器へ転送している(TCP 中継、メーカーのゲートウェイ、SSH トンネルなど)と書き込みが実機に届くことがあります — そうしたソフトが動いている間は書き込みツールを使わないでください。",
    },
    {
      q: "外に何を送りますか?",
      a: "PortDock MCP 自体は、指定された機器のアドレス・ポートとだけ通信し、セッションログはこの PC に残ります。ツールの結果は使っている AI クライアントに渡るので、そこから先はそのクライアントのポリシーに従います。",
    },
  ],
};
