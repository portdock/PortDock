// 개인정보처리방침(views/PrivacyPage.astro) — 본문은 ja/PrivacyBody.astro, 시행일은 화면에서 넘긴다
export default (updated: string) => ({
  desc: "PortDock のソフトは通信内容を送らず、エラー報告・統計・更新の確認は許可したときだけ。«AI» コピー・ping・MCP、サイトのアクセス解析・広告 Cookie・お問い合わせ。",
  effective: `施行日 ${updated}`,
});
