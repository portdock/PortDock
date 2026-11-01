// 일본어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Ja<K extends string> = Partial<Record<K, string>>;

export const JA_DEVICE: Ja<DeviceTextKey> = {
  masterTitle: "機器プロファイルを読み込む",
  slaveTitle: "機器の模擬を読み込む",
  search: "検索(メーカー・型番・種類)",
  none: "一致する機器がありません",
  close: "閉じる",
  cancel: "キャンセル",
  apply: "読み込む",
  regs: "レジスタ {n} 個",
  comm: "通信の既定値",
  commOpt: "通信設定も合わせる(ボーレート・データ・パリティ・ストップ)",
  commNone: "マニュアルで確認した通信の既定値がありません",
  gapOpt: "空きアドレスを挟んだレジスタも 1 つの表で読む(最大 {n} 個 — 機器が空きアドレスを拒むならオフに)",
  masterPlan: "ポーリング表を {n} 個追加します(局番 {u}): {a}",
  masterSkip: "書き込み専用の {n} 個は表に入れません",
  slavePlan: "今の局番 {u} に名前・形式と例の値を入れます。応答範囲が足りなければ広げます。",
  slaveUnit: "この機器の既定の局番は {u} です",
  sources: "出典",
  caution: "メーカーのマニュアルから写した事実情報です(メーカーとは無関係)。ファームウェアや型番で違うことがあるので、書き込む前に機器のマニュアルで確かめてください。",
  thAddr: "アドレス(マニュアル)",
  thName: "名前",
  thType: "形式",
  thUnit: "単位",
  thRw: "R/W",
  notes: "注意",
  behaveOpt: "値の生成・連動ルールも入れる — 電圧・電流のゆらぎ、電力量の積算、運転指令 → 出力周波数の加減速",
  guardOpt: "読み取り専用・書き込み専用を守る",
  slaveNote: "この値はマニュアルの表を写したもの — 実機の動き(加減速時間など)とは違うことがあります。",
};

export const JA_PORTCHECK: Ja<PortCheckTextKey> = {
  title: "接続チェック",
  close: "閉じる (Esc)",
  reading: "読み取り中…",
  readFail: "読み取れませんでした",
  device: "機器とドライバー",
  settings: "設定",
  power: "省電力",
  test: "接続テスト",
  cannot: "PC から見えないもの",
  guides: "ガイド:",
  name: "名前",
  chip: "VID:PID · チップ",
  driver: "ドライバー",
  problem: "問題コード",
  action: "試すこと",
  latency: "FTDI レイテンシータイマー",
  suspend: "USB のセレクティブ サスペンド",
  canOff: "PC が電源をオフにできる",
  on: "オン",
  off: "オフ",
  connected: "切断してからテストできます(テストはポートを自分で開きます)。",
  copy: "テキストをコピー",
  copied: "コピーしました",
  more: "ドライバーの履歴・COM 番号の予約・隠れた機器まで見るには PortDock Port Inspector を使います。",
  readOnly: "管理者権限なしの読み取り専用です。",
};

export const JA_LOOP: Ja<LoopTextKey> = {
  mode: "テスト方式",
  loop: "ループバック — TX と RX をつなぐ",
  loopHint: "DB9 は 2 番(RX)と 3 番(TX)、TTL 変換器は TX と RX をつなぎます。速度ごとにバイトがそのまま戻るかと、1 バイトの往復時間を測ります。",
  two: "2 ポート — 変換器 2 つを互いにつなぐ",
  twoHint: "変換器・ケーブル 2 つを互いにつないでおき、速度ごとにこのポート → 相手のポート、相手のポート → このポートへ送り、届いたものを比べます。RS-485 変換器のチェックに使います。",
  peer: "相手のポート",
  peerNone: "ほかのポートがありません",
  pattern: "パターン",
  patRandom: "混在バイト",
  patRamp: "0x00~0xFF を順に",
  patAlt: "0x55・0xAA を交互に",
  length: "長さ(バイト)",
  wiring: "つなぎ方",
  overall: "全体",
  colDir: "方向",
  echo: "2 線式 RS-485 エコー",
  echoHint: "バスから機器を外した状態で、変換器が自分の送ったバイトを受信するかを見ます。",
  bauds: "速度",
  more: "ほかの速度",
  start: "テスト開始",
  cancel: "停止",
  sure: "回線・バスから機器を外しましたか? テストのバイトが機器にコマンドとして届くことがあります。",
  sureYes: "外した — 開始",
  sureNo: "キャンセル",
  running: "テスト中",
  noPort: "先にポートを選んでください。",
  colBaud: "速度",
  colResult: "結果",
  colBytes: "送信 · 一致 · 欠落 · 変化",
  colRtt: "1 バイト往復 ms(中央値 · 最大)",
  colFlags: "エラー表示",
  flagsNone: "なし",
  flagsUnread: "読み取れず",
  flagFrame: "フレーミング",
  flagParity: "パリティ",
  flagOverrun: "オーバーラン",
  flagRxOver: "バッファー オーバーフロー",
  flagsNote: "エラー表示はドライバーが上げたときだけ出ます — «なし» はエラーがなかった保証ではありません。往復時間は USB の遅延・ドライバー・プログラムの時間をすべて足した値です。",
  echoBack: "戻ったバイト",
  firstMs: "最初のバイトまで",
};

/** つなぎ方の図(文字で) */
export const JA_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232(DB9 オス・メスどちらでも)", "  2 番(RX) ──┐", "  3 番(TX) ──┘   2 番と 3 番のピンをつなぐ", "", "TTL 変換器", "  TX ──┐", "  RX ──┘   TX と RX をつなぐ", "", "RS-485 は 1 ポートではできません — «2 ポート» を選んでください。"].join("\n"),
  two: ["RS-232(ヌルモデムでクロス)", "  ポート A       ポート B", "  2 番 RX ────── 3 番 TX", "  3 番 TX ────── 2 番 RX", "  5 番 GND ───── 5 番 GND", "", "RS-485(2 線式)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["RS-485 変換器 1 つ — バスから機器を外した状態で", "  A(D+)  B(D−)  何もつながない"].join("\n"),
};

export const JA_IFACE: Ja<IfaceTextKey> = {
  title: "この PC",
  all: "すべてのアダプター",
  local: "この PC 内だけ",
  down: "未接続",
  none: "アダプターのアドレスを読み取れませんでした",
  refresh: "再読み込み",
  use: "このアドレスを使う",
  gw: "ゲートウェイ",
  notHere: "«{a}» はこの PC のアドレスではありません — 開始すると «この PC にないアドレス» で失敗します。下の一覧から選んでください。",
  downHere: "«{a}» のアダプター({b})がつながっていません(ケーブル・無線を確認)。",
};

export const JA_OPEN_APP: Ja<OpenAppTextKey> = {
  opened: "{a} を開きました — {b}。接続はそのウィンドウで押してください。",
  missing: "この PC に {a} が見つからないので «{b}» をコピーしました — そのソフトに貼り付けてください。",
  get: "ダウンロード ページ",
};

/** 閉じる確認(exitGuard.ts) */
export const JA_EXIT = "接続中かファイルに記録中です。閉じると接続が切れ、記録が止まります。閉じますか?";

/** 例のコマンド(examples.ts) — 名前の先頭と、英語名 → 日本語名 */
export const JA_EXAMPLE_PREFIX = "例: ";
export const JA_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT(応答の確認)",
  "ATI (device info)": "ATI(機器情報)",
  "AT+GMR (firmware version)": "AT+GMR(ファームウェアのバージョン)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus 局番 1 40001~40010 読み出し (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus 局番 1 30001~30002 読み出し (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN?(SCPI 計測器の名前)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP 局番 1 40001~40010 読み出し (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP 局番 1 30001~30002 読み出し (FC04)",
  "HTTP request for the home page (port 80)": "HTTP トップページの要求(ポート 80)",
  "text hello": "文字 hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN?(機器の名前)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC?(DC 電圧)",
  "SYST:ERR? (one error)": "SYST:ERR?(エラー 1 件)",
};
