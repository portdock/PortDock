// 일본어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Ja<K extends string> = Partial<Record<K, string>>;

export const JA_SETTINGS: Ja<SettingsTextKey> = {
  title: "設定",
  lang: "言語",
  theme: "テーマ",
  system: "Windows の設定に従う",
  light: "ライト",
  dark: "ダーク",
  fontSize: "文字サイズ(px)",
  timeFormat: "ログの時刻表示",
  local: "時:分:秒.ミリ秒",
  localDate: "日付 + 時刻",
  utc: "UTC",
  elapsed: "開始からの経過時間(消去でリセット)",
  maxLines: "画面に残す行数",
  maxLinesHint: "超えると画面からだけ古い行を消します(ファイルのログはそのまま)。",
  autoScroll: "新しい行が来たら自動スクロール(上にスクロールすると停止)",
  alwaysOnTop: "最前面に表示 — このウィンドウをほかのウィンドウより常に手前に(タイトル行の 📌)",
  expandAll: "すべて展開(エキスパート表示)— 折りたたんだ欄(詳細な接続・受信設定・異常の注入・統計など)を常に開いて表示",
  autoLog: "接続したら自動でファイルに記録",
  logFolder: "自動記録のフォルダー",
  choose: "選択",
  noFolder: "フォルダーを選んでください",
  confirmExit: "接続中・記録中にウィンドウを閉じるときは確認",
  lostAlert: "接続が切れたらタスクバーを点滅(ウィンドウが背面にあるとき)",
  keepAwake: "接続中・記録中はスリープさせない(画面は消えてもよい)",
  autoConnect: "起動時に前回の接続を開き直す",
  autoReport: "エラーの自動送信",
  arAsk: "異常終了したら確認",
  arOn: "確認せず自動で送信",
  arOff: "送信しない",
  autoReportHint: "ソフトのエラー(例外・異常終了)の原因と、ソフト・Windows のバージョンだけを開発者に送ります。通信内容・コマンド一覧・ルール・IP は送りません。インターネットがなければ次回に再試行します。",
  backup: "設定のバックアップ",
  exportAll: "設定を書き出す",
  importAll: "設定を読み込む",
  reset: "初期値に戻す",
  resetAsk: "画面の設定を初期値に戻しますか?(コマンド一覧・ルールはそのまま)",
  importAsk: "読み込むと、今の設定・コマンド一覧・ルールがすべて置き換わります。続けますか?",
  importBusy: "接続中・記録中は読み込めません。先に停止してください。",
  noFolderWarn: "フォルダーを選ばないと自動記録は始まりません。",
  close: "閉じる",
  about: "情報",
  gpl: "このソフトはフリーソフトウェアで、GNU GPL v3 に従って配布されます。一切の保証はありません。",
  license: "ライセンス全文",
  source: "ソースコード",
  site: "ホームページ",
  notices: "第三者の告知",
  sponsor: "支援",
  checkUpdate: "新しいバージョンを確認",
  checkUpdateHint: "最新リリースのページをブラウザーで開きます。",
  updateCheck: "新しいバージョンの確認(1 日 1 回)",
  updateCheckHint: "オンにすると 1 日 1 回 GitHub(api.github.com)に最新リリースだけを問い合わせ、新しいバージョンがあればウィンドウ下部に表示します。送るデータはなく、ダウンロード・インストールはしません。",
};

export const JA_HELP_UI: Ja<HelpUiKey> = {
  title: "ヘルプ",
  search: "検索…",
  close: "閉じる",
  none: "一致する内容がありません",
  enOnly: "ヘルプは英語のみです(画面は日本語)。",
};

export const JA_REPORT: Ja<ReportTextKey> = {
  button: "問題の報告 — エラー・不具合を開発者に送る",
  title: "問題の報告",
  intro: "この PC で報告書を作り、下に表示します。自動では送りません。内容を確認してから送り方を選んでください。",
  what: "何が起きましたか?(していた作業、押したボタン、期待した結果と実際の結果)",
  whatPh: "例)TCP サーバーで待ち受け中、相手が 3 つ接続したら画面が固まりました。",
  env: "ソフト・Windows のバージョン(常に含める)",
  errors: "今回の実行のエラー {n} 件",
  crashes: "異常終了の記録 {n} 件",
  dumps: "ダンプファイルを含める({n} KB)",
  dumpsSend: " — «今すぐ送信» のときに一緒に送られます",
  dumpManual: "メール・GitHub で送るときはダンプファイルを手動で添付してください(送るか削除するまで残します): {a}",
  config: "接続・画面の設定(IP・ポート・速度など — コマンド一覧・ルールは含めない)",
  log: "最近の通信ログ {n} 行",
  logWarn: "通信ログには会社・機器のデータが含まれることがあります。送ってよい場合だけオンにしてください。",
  preview: "送る内容(プレビュー)",
  copy: "コピー",
  copied: "コピーしました",
  saveFile: "ファイルに保存",
  saved: "保存しました: {a}",
  email: "メールで送る",
  emailHint: "メールソフトが開きます。長いと切れるので、«ファイルに保存» したファイルを添付してください。",
  issue: "GitHub の Issue で送る",
  issueHint: "GitHub に公開で投稿されます(アカウントが必要)。会社の情報がないか確認してください。",
  offline: "インターネットのない PC なら «ファイルに保存» してから USB で移し、メール・GitHub で送ってください。",
  close: "閉じる",
  crashTitle: "前回、異常終了しました",
  crashBody: "{a} が前回、予期せず終了しました。原因の記録が残っています。開発者に送っていただくと修正に大いに役立ちます。",
  crashOpen: "報告書を見る",
  crashLater: "後で",
  crashDiscard: "送らずに削除",
  noTarget: "送り先がまだ設定されていません。«ファイルに保存» を使ってください。",
  sendNow: "今すぐ送信",
  sendNowHint: "上のプレビューの内容をそのまま開発者にすぐ送ります(インターネットが必要、アカウント不要)。",
  sending: "送信中…",
  sentOk: "送信しました。ありがとうございます!",
  sendFail: "送れませんでした(インターネット接続を確認)。«ファイルに保存» しておき、後で送ってください。",
  crashSend: "今すぐ送信",
  crashAlways: "今後は確認せず自動で送信",
};

export const JA_AI_UI: Ja<AiUiKey> = {
  button: "AI に質問 — コピーだけで送信しない: 今の状況を AI チャットに貼り付ける文としてクリップボードへ",
  title: "AI に質問する用のコピー",
  introLog: "ソフト・接続設定・今回の実行のエラー・最近の通信ログを、AI チャットに貼り付けやすい文(質問のひな形付き)にします。",
  introChecks: "ソフト・今回の実行のエラー・点検結果を、AI チャットに貼り付けやすい文(質問のひな形付き)にします。",
  local: "PortDock はどこにも送らず、クリップボードに入れるだけです。",
  warn: "貼り付けた AI サービスに内容が送られます。機器・会社の情報は確認してから貼り付けてください。",
  hideIp: "プライベート IP も伏せる(グローバル IP は常に伏せる)",
  incLog: "最近の通信ログを含める",
  incChecks: "点検結果を含める",
  incFound: "見つかった機器を含める",
  introFound: "ソフト・今回の実行のエラー・見つかった機器の一覧を、AI チャットに貼り付けやすい文(質問のひな形付き)にします。",
  preview: "貼り付ける内容(プレビュー)",
  size: "{n} 文字 / 上限 {max} 文字",
  cut: " · 古い行を {n} 行省略",
  cutText: " · 長い文の後ろを省略",
  copy: "コピー",
  copied: "コピーしました — AI チャットの入力欄に貼り付け(Ctrl+V)、«状況» 欄を記入してください。",
  copyFail: "コピーできませんでした。ほかのソフトがクリップボードを使用中かもしれません",
  close: "閉じる",
};

export const JA_FIRST: Ja<FirstTextKey> = {
  hide: "今後表示しない",
  help: "ヘルプ:",
  narrow: "ウィンドウが狭いため左パネルが折りたたまれています。下の «左» は、左上の «⚙ {b}» ボタンで開くパネルです。",
  open: "左パネルを開く",
};

export const JA_UPDATE: Ja<UpdateTextKey> = {
  msg: "新しいバージョン {a} があります(現在 {b})。",
  open: "リリースページ",
  later: "このバージョンは今後通知しない",
  close: "閉じる(次回起動時にまた表示)",
};

export const JA_FILTER: Ja<FilterTextKey> = {
  find: "検索 (Ctrl+F) — 01 03 または文字",
  auto: "自動",
  hex: "HEX",
  text: "文字",
  prev: "前へ (Shift+Enter)",
  next: "次へ (Enter)",
  hitsOnly: "一致行のみ",
  failOnly: "NG のみ",
  all: "すべて",
  off: "絞り込み解除 (Esc)",
  badHex: "HEX ではない",
  none: "なし",
  shown: "{a}/{b} 行を表示",
};

export const JA_BOUNDARY: Ja<BoundaryTextKey> = {
  title: "画面のエラーが発生しました",
  body: "下の内容を開発者に送っていただくと、修正に大いに役立ちます。開き直すとほとんどの場合は元に戻ります。",
  report: "問題の報告",
  reload: "開き直す",
  resetTip: "開き直しても同じエラーになる場合 — 保存された画面の設定(コマンド一覧・ルールを含む)を消去します",
  resetArm: "本当に初期化 — もう一度押してください",
  reset: "設定を初期化",
};

export const JA_USAGE: Partial<UsageText> = {
  title: "利用統計を送りますか?",
  why: "どの機能がどれだけ使われているかが分かると、次に改善する所を選ぶのに役立ちます。オンにすると、ウィンドウを閉じるときに 1 回、下の項目だけを匿名で送ります。",
  sendsTitle: "送るもの",
  sends: ["ソフト名・バージョン、Windows のバージョン(10・11)、画面の言語", "起動していた時間(分)", "機能ごとの使用回数(接続・送信・読み出しなど — 回数のみ)", "インストール版かポータブル版か"],
  neverTitle: "送らないもの",
  never: ["通信内容", "IP・ポート・COM 名", "ファイルのパス", "PC・ユーザー・機器の名前", "インストール・PC を特定できる ID"],
  where: "送り先: Aptabase(EU)。インターネットがない、または送れなかった場合は破棄します。この回答はこの PC のほかの PortDock ソフトでも初期値になり(再度は聞きません)、ソフトごとに設定(⚙)でいつでも変更できます。",
  yes: "送る",
  no: "送らない",
  setting: "利用統計を送る(匿名、ウィンドウを閉じるとき)",
  hint: "機能ごとの使用回数・起動時間・ソフト/Windows のバージョン・画面の言語・インストール版/ポータブル版だけを送ります。通信内容・IP・ポート・COM 名・ファイルのパス・PC/ユーザー/機器の名前は送りません。送り先: Aptabase(EU)。",
};
