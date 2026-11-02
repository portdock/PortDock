// 일본어 — 9차 묶음 장비 레지스터 맵 목록(views/DevicesIndex.astro) 화면 글. 장비 종류 이름·장비 요약은 batch9.ts 의 kinds·summaries.
// desc 는 장비 수, regs 는 장비 하나의 레지스터 수, bundle 은 데이터 묶음 판(예 «v1.4 (2026-10-31)»)을 받는다.
// bundle 은 데이터 묶음 쪽(data/ — 번역 범위 밖) 링크 글: 화면이 «(英語)» 를 붙인다. json·maker·model 은 «JSON: <주소>/<maker>/<model>.json» 의 조각.
export default {
  title: "産業機器の Modbus レジスタマップ",
  seo: "Modbus アドレス表 — インバーター・温度調節器・電力計 — PortDock",
  desc: (c: { n: number }) => `韓国内外の産業用インバーター・温度調節器・電力計など ${c.n} 機種の Modbus アドレス・型・単位・倍率と通信の既定値。メーカーのマニュアルが出典、JSON(CC BY 4.0)。`,
  crumb: "機器",
  find: "機器を探す — メーカー・型式・種類(例: LS、インバーター、TK4)",
  regs: (c: { n: number }) => `レジスタ ${c.n} 個`,
  aboutTitle: "このデータについて",
  facts: "メーカーが公開しているマニュアルから、アドレス・型・単位・倍率・読み書きといった事実だけを写し、機器ごとに文書名・版・ページと確認日を付けています。マニュアルで確かめられなかった項目は入れていません。",
  unofficial: "メーカーとは関係のない非公式の資料です。ファームウェアや形式によって異なることがあるため、書き込む前に機器のマニュアルで確認してください。",
  bundle: (c: { version: string }) => `データ一式 ${c.version}`,
  bundleAfter: " — 版・all.json・registers.csv・項目の説明・引用のしかた・変更点",
  json: "JSON: ",
  maker: "メーカー",
  model: "型式",
  license: "ライセンス: ",
  licenseAfter: " — 出典を明記すれば自由に使えます。",
  apps: "PortDock Modbus Master の «機器プロファイル…»、Modbus Slave の «機器を模擬…» に同じデータが入っています。",
};
