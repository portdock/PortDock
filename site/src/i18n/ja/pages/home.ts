// 첫 화면(views/Home.astro) — 수는 화면에서 세어 넘긴다
export interface HomeCtx {
  /** 윈도우 프로그램 수(MCP 빼고) */
  nApps: number;
  /** MCP 서버도 공개했나 */
  mcp: boolean;
  /** 이 언어로 옮긴 웹 도구 수 */
  nWeb: number;
  /** PC 하드웨어 테스트 수 */
  nHw: number;
  nDevices: number;
  nGuides: number;
}

export default (c: HomeCtx) => ({
  seo: "PortDock — 無料のシリアル・Modbus・TCP 通信テストソフト",
  desc: `シリアル・Modbus マスター/スレーブ・TCP・UDP・SCPI・グラフ・COM ポート点検・PLC(MC)シミュレータなど無料の Windows ソフト ${c.nApps} 本${c.mcp ? "+MCP" : ""}。オープンソース。`,
  sub: `シリアル・Modbus・TCP/UDP 機器の試験ソフト ${c.nApps} 本${c.mcp ? "と AI 用 MCP" : ""}、インストール不要の Web ツール ${c.nWeb} 種類。すべて無料。`,
  dl: "ソフトをダウンロード",
  dlSmall: "無料 · Windows 10・11",
  web: "Web ツールをすぐ使う",
  webSmall: "インストール不要",
  pcPre: "PC のトラブルなら: ",
  pcHw: "マイク・キーボード・マウス・Web カメラのテスト(ブラウザ)",
  pcTester: "Wi-Fi・Bluetooth の切断記録(Hardware Tester)",
  heroAlt: "PortDock Serial の画面 — 受信したバイト列の記録と Modbus 応答の解析",
  heroCap: "PortDock Serial — 画面の例(サンプルデータ、画面は英語)",
  appsTitle: `Windows ソフト ${c.nApps} 本${c.mcp ? "+MCP" : ""}`,
  appsLead: "用途ごとに分かれた小さなソフトです。必要なものだけダウンロードして使えます。ソフトの画面は日本語を含む 12 言語で使えます(ヘルプは韓国語・英語で、他の言語の画面では英語)。",
  screen: "の画面",
  soon: "近日公開",
  webTitle: "Web ツール — インストール不要",
  webLead: "現場の通信・計算ツールをブラウザですぐに使えます。入力した値はどこにも送りません。",
  hwTitle: `PC ハードウェアテスト ${c.nHw} 種類`,
  hwBody: "マイク・キーボード・マウス・Web カメラ・モニター・スピーカーなどをブラウザで試せます。",
  allWeb: `日本語の Web ツール ${c.nWeb} 種類をすべて見る`,
  guidesTitle: "ガイドと機器のレジスタマップ",
  read: "読む",
  devTitle: `産業機器の Modbus レジスタマップ ${c.nDevices} 機種`, // 링크 글 — 장비 맵이 그 언어로 없으면 화면이 «(영어)» 표시를 붙인다
  devBody: "インバータ・温度調節計・電力計 — マニュアルの出典、JSON",
  guidesEnTitle: `現場向けガイド ${c.nGuides} 本(英語)`,
  guidesEnBody: "Modbus の無応答、RS-485 配線、アドレス表記、4-20mA ループ、USB シリアルの切断など。",
  allGuides: "ガイドの一覧(英語)",
});
