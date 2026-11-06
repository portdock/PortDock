// 일본어 — 여러 쪽에서 쓰는 이름·한 줄 소개(프로그램·웹 도구·도구 묶음·«무엇을 하려나요?»·파일 크기).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** 프로그램 한 줄 소개(tools.ts 의 tagline) */
  apps: {
    serial: "シリアル(COM)送受信・信号線・自動再接続",
    "modbus-slave": "Modbus スレーブシミュレータ(RTU・TCP)— レジスタ表・異常の注入",
    tcp: "TCP クライアント・サーバー・中継 — 複数接続・エコー・自動再接続",
    udp: "UDP 送受信 — ブロードキャスト・マルチキャスト・エコー",
    simulator: "ルールどおりに応答する疑似機器 — シリアル・TCP・UDP",
    netscan: "産業ネットワーク機器の IP 検索 — 産業用ポートの判定・長時間 ping",
    "modbus-master": "Modbus RTU・TCP マスター(ポーリング)— 型付きの値・書き込み・局番スキャン",
    scpi: "SCPI 計測器ターミナル — LAN ソケット・RS-232、VISA 不要",
    plot: "シリアル・TCP・UDP の数値をリアルタイムでグラフに",
    "port-inspector": "COM ポート・LAN アダプター・PC 設定・無線(Wi-Fi・Bluetooth)の読み取り専用点検",
    "plc-simulator": "MC プロトコル(SLMP)サーバーシミュレータ — PLC なしで HMI・収集ソフトを試験",
    "hw-tester": "Wi-Fi・インターネットの切断・遅延の記録、Bluetooth・USB(0.10.0 から)の接続・切断の記録",
    mcp: "AI クライアント用 MCP サーバー — ポート・Modbus・MC・SCPI の読み取り+この PC のシミュレータにだけ書き込み",
  } satisfies Record<Tool["id"], string>,

  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/4-20ma/": { name: "4–20mA 換算計算ツール", blurb: "電流・電圧 ↔ 工業値 ↔ % ↔ PLC のデジタル値(0–27648 など)。4・8・12・16・20mA の換算表付き。" },
    "tools/modbus/": { name: "Modbus RTU 要求フレーム作成", blurb: "局番・ファンクション・アドレス・個数 → CRC 付きの要求バイト列。40001 形式のアドレスにも対応。" },
    "tools/modbus-decoder/": { name: "Modbus フレーム解析ツール", blurb: "RTU・TCP のバイト列を貼り付けると、局番・ファンクション・値・CRC・MBAP・例外コードまで解析。" },
    "tools/modbus-float/": { name: "Modbus 浮動小数点変換ツール", blurb: "レジスタ 2・4 個 ↔ float32・float64・int32。ABCD・CDAB・BADC・DCBA の 4 つのワード順を 1 つの表で。" },
    "tools/mc-decoder/": { name: "MC プロトコル(SLMP)フレーム解析ツール", blurb: "3E・4E のバイナリ・ASCII フレーム → ヘッダー・コマンド・デバイス・値・終了コード。要求と組で応答を解析、要求の作成も。" },
    "tools/rs485/": { name: "RS-485 終端抵抗・バイアス計算ツール", blurb: "プルアップ・プルダウンと 120・150 Ω の終端 → アイドル時の差動電圧(200 mV しきい値)、抵抗の電力、ボーレート別の配線長の目安。" },
    "tools/serial-timing/": { name: "シリアル通信時間計算ツール", blurb: "ボーレート・パリティ → 1 文字の時間、Modbus RTU の 3.5 文字(t3.5)・1.5 文字、要求・応答の時間、ポーリング周期・タイムアウトの下限。" },
    "tools/checksum/": { name: "CRC・チェックサム計算ツール", blurb: "CRC16 Modbus・CCITT・XMODEM、CRC8、LRC、BCC、SUM8、SUM16 をまとめて計算。" },
    "tools/subnet/": { name: "IP サブネット計算ツール", blurb: "アドレス・マスク(/24)→ ネットワーク・ブロードキャスト・範囲。PC と PLC が互いのマスクで同じセグメントかを判定。" },
    "tools/pinouts/": { name: "コネクタのピン配置一覧", blurb: "DB9・DB25 RS-232、RJ45 T568A/B・イーサネット、Modbus RJ45/DB9(仕様)、M12 A・D・X コード、M8、USB-A/B/C、RS-485 端子名 — オス/メスの正面図・線色・出典、SVG 保存。" },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** 웹 도구 묶음(webToolGroups.ts) */
  groups: {
    comm: "通信・Modbus",
    net: "ネットワーク",
    draw: "配線・構成図",
    diag: "故障探し・点検",
    field: "現場の道具",
    signal: "信号・センサ",
    elec: "電気・モータ",
    mech: "機械・空圧",
    units: "単位換算",
    hw: "PC ハードウェアテスト",
    etc: "そのほかのツール",
  } satisfies Record<GroupId, string>,

  /** «무엇을 하려나요?»(components/PickApp.astro) — 갈래 id 로 찾는다 */
  pick: {
    title: "何をしますか?",
    q: {
      serial: "シリアル(COM)・RS-485 機器と通信する",
      modbus: "Modbus 機器の値を読み書きする、機器をシミュレートする",
      net: "ネットワーク機器の IP を探す、TCP・UDP 通信",
      sim: "PLC・機器なしで HMI・上位ソフトを試験する",
      scpi: "計測器(SCPI)の制御・測定の記録",
      pc: "PC の接続の問題 — COM ポート・LAN アダプター・Wi-Fi・Bluetooth",
      mcp: "AI から機器を読む(MCP)",
    },
    hwTitle: "マイク・キーボード・マウス・Web カメラ・モニターの試験",
    hwName: "PC ハードウェアテスト",
    hwNote: (n: number) => `Windows ソフトではなくブラウザですぐ使えます(インストール不要)— ${n} 種類`,
  },

  /** 파일 크기(release.ts 의 SIZE) */
  size: { setup: "約 4MB", offline: "約 220MB", portable: "約 3MB" },
};
