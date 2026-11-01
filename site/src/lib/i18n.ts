// 공용 문구(머리줄·바닥글·내려받기·이용 안내 등) — 한국어·영어는 여기, 추가 언어는 i18n/<언어>/ui.ts(ui() 가 고른다).
// 주소·언어 목록은 i18n/langs.ts, 번역 범위는 i18n/scope.ts.
import { isCore, type SiteLang } from "../i18n/langs.ts";
import { DICTS, DICTS2 } from "../i18n/index.ts";
import type { Tool } from "../data/tools";
import type { WebTool } from "../data/webTools";
import type { GroupId } from "../data/webToolGroups";

export { url } from "../i18n/langs.ts";
export { link, langsOf, isTranslated } from "../i18n/scope.ts";

export const UI = {
  ko: {
    siteDesc: "현장 장비 시험용 무료 윈도우 프로그램 — 시리얼·Modbus·TCP·UDP·PLC(MC) 흉내·장비 찾기·SCPI·그래프·COM 포트·Wi-Fi 끊김 기록. 웹 계산기·PC 하드웨어 테스트도.",
    tools: "프로그램",
    toolsNote: "윈도우 프로그램(내려받기)",
    webTools: "웹 도구",
    webToolsNote: "브라우저에서 바로(설치 없음)",
    guides: "가이드",
    devices: "장비",
    data: "장비 맵 데이터·AI 이용",
    docs: "사용법",
    download: "내려받기",
    contact: "문의",
    privacy: "개인정보처리방침",
    terms: "이용 안내",
    // SignPath 조건: 홈·내려받기 페이지에 «Code signing policy» 라는 말이 보여야 한다
    codeSigning: "코드 서명 정책 (Code signing policy)",
    safety: "안전 원칙",
    sponsor: "후원",
    license: "라이선스",
    source: "소스 코드",
    issues: "버그 신고",
    heroTitle: "현장 장비 시험을 위한\n작고 정확한 통신 도구",
    heroSub: "시리얼(COM), Modbus, TCP, UDP, 장비 시뮬레이터, 네트워크 장비 찾기, SCPI 계측기, 실시간 그래프, COM 포트 점검, PLC(MC 프로토콜) 흉내, Wi-Fi·블루투스 끊김 기록을 목적별 작은 프로그램으로. 무료·오픈소스(GPL-3.0), 윈도우 10·11.",
    trust: ["프로그램에 광고 없음", "끼워팔기 없음", "설치판·휴대판", "소스 공개"],
    allTools: "PortDock 도구",
    more: "자세히",
    whyTitle: "왜 PortDock 인가",
    why: [
      ["끊겨도 다시 붙습니다", "USB 변환기를 뽑았다 꽂아도 같은 장치를 찾아 다시 연결하고, 끊긴 시각을 기록합니다."],
      ["한 줄이 한 메시지", "끊김 시간(조용한 간격)·끝 문자·고정 길이·Modbus RTU 로 프레임을 정확히 끊어, 이어 붙거나 쪼개진 데이터에 헷갈리지 않습니다."],
      ["보내기 전에 보입니다", "체크섬·줄 끝까지 붙은 «실제로 나갈 바이트» 를 미리 보여 줍니다."],
      ["한국어·영어", "화면·오류·도움말 모두 두 언어. 마우스를 올리면 설명이 나옵니다."],
    ],
    ctaTitle: "질문·버그·제안이 있으신가요?",
    ctaBody: "사용법 질문, 버그 제보, 새 웹 도구·가이드 제안, 장비 레지스터 맵 오류 제보를 받습니다.",
    ctaBtn: "문의하기",
    whoTitle: "이런 분께",
    featTitle: "기능",
    stepsTitle: "빠른 시작",
    dlTitle: "내려받기",
    dlSetup: "설치판 (.exe)",
    dlPortable: "휴대판 (.zip)",
    dlOffline: "오프라인 설치판",
    dlNote: "윈도우 10·11 (64비트). 처음 실행하면 «Windows의 PC 보호» 창이 뜰 수 있습니다(«추가 정보» → «실행»).",
    dlAll: "모든 버전·변경 내역",
    dlSoon: "공개 준비 중",
    dlSoonNote: "첫 버전을 공개하기 전입니다. 저장소에서 Watch → Custom → Releases 를 켜 두면 공개될 때 알림을 받습니다.",
    dlUpcoming: "곧 공개",
    dlUpcomingNote: "이 프로그램은 다음 릴리스에 들어갑니다. 저장소에서 Watch → Custom → Releases 를 켜 두면 공개될 때 알림을 받습니다.",
    readDocs: "사용법 전체 보기",
    docsOf: "사용법",
    backToTool: "도구 소개로",
    toc: "목차",
    safeTitle: "안전 확인",
    safe: [
      "모든 파일은 GitHub 릴리스에서만 내려받습니다. 다른 곳에 올라온 파일은 받지 마세요.",
      "릴리스마다 SHA256 값(SHA256SUMS.txt)과 Microsoft Defender 검사 결과를 함께 올립니다. PowerShell 의 Get-FileHash 로 값을 비교할 수 있습니다(아래 예).",
      "아직 코드 서명이 없어 «Windows의 PC 보호» 창이 뜰 수 있습니다(«추가 정보» → «실행»). 내려받은 파일은 위의 SHA256 값으로 같은 파일인지 확인할 수 있습니다.",
      "장비 통신은 사용자가 지정한 포트·주소로만 가고, 통신 내용은 밖으로 보내지 않습니다. 예외로 Hardware Tester 는 기록을 켠 동안만 게이트웨이와 고른 인터넷 주소(기본 1.1.1.1)에 핑을, 이름 하나(기본 example.com)를 DNS 에 묻습니다. 오류 보고는 사용자가 허락할 때만 보내고(기본은 «오류로 꺼지면 묻기»), 사용 통계(기본 꺼짐)와 새 버전 확인(GitHub 에 최신 릴리스 묻기, 기본 꺼짐)은 설정에서 켤 때만 합니다.",
      "머리줄 «AI» 단추(AI 에게 물어보기용 복사)는 미리보기 글을 클립보드에만 넣고 PortDock 은 아무 데도 보내지 않습니다. AI 채팅에 붙여 넣으면 그 서비스로 가니, 사용자 폴더·PC 이름·MAC 뒤쪽·공인 IP 를 가린 미리보기를 확인하고 붙여 넣으세요.",
    ],
    webview: "실행에 Microsoft Edge WebView2 가 필요합니다(윈도우 11 기본 포함). 인터넷이 없는 PC 는 WebView2 를 함께 넣은 «오프라인 설치판» 을 받으세요.",
    footerLine: "PortDock — 현장 하드웨어 시험용 통신 도구. GPL-3.0.",
    skip: "본문으로",
    langMenu: "언어",
    breadcrumb: "현재 위치",
    open: "열기",
    inEnglish: "",
    /** 문장 끝 마침표(링크 뒤에 붙는 것) */
    period: ".",
    allToolsEn: "",
    feedbackAria: "의견 보내기",
    feedbackQ: "이 페이지가 도움이 됐나요?",
    feedbackBody: " 좋았던 점·아쉬운 점·더 있었으면 하는 계산을 알려 주세요.",
    feedbackPrefix: "의견: ",
    feedbackIdea: "의견 남기기",
    feedbackIssue: "틀린 곳 알리기",
    feedbackMail: "메일로 문의",
    noticeAria: "이용 안내",
    noticeHead: "이용 안내",
    noticeBody:
      "이 페이지의 계산과 자료는 참고용입니다. 실제 값은 장비 모델·펌웨어·설정에 따라 다를 수 있으니, 설계·시공·운전 전에는 해당 장비 매뉴얼과 관련 규격·법령을 확인하고 전기·안전 작업은 자격을 갖춘 사람의 확인을 받으세요.",
    /** 앞 글 · 문의 링크 · 가운데 · 이슈 링크 · 뒤 글 */
    noticeFix: [" 틀린 곳은 ", "문의", "나 ", "GitHub 이슈", "로 알려 주시면 고칩니다."],
    noticeAll: "이용 안내 전체",
    readNext: "이어 읽기",
    dlPrograms: "PortDock 프로그램 내려받기(무료, 윈도우)",
    moreTools: (n: number) => `다른 웹 도구 ${n}개 더 보기`,
    filterEmpty: "맞는 항목이 없습니다. 다른 낱말로 찾아 보세요.",
    /** {n} 자리에 수 */
    filterCount: "{n}개",
  },
  en: {
    siteDesc: "Free Windows tools for field hardware: serial, Modbus, TCP/UDP, PLC (MC) simulator, SCPI, plotter, COM port, Wi-Fi drop logs. Web calculators and PC tests too.",
    tools: "Programs",
    toolsNote: "Windows programs (download)",
    webTools: "Web tools",
    webToolsNote: "In your browser (no install)",
    guides: "Guides",
    devices: "Devices",
    data: "Device data & AI use",
    docs: "Docs",
    download: "Download",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms of use",
    codeSigning: "Code signing policy",
    safety: "Safety principles",
    sponsor: "Sponsor",
    license: "License",
    source: "Source code",
    issues: "Report a bug",
    heroTitle: "Small, precise communication tools\nfor testing hardware",
    heroSub: "Serial (COM), Modbus, TCP, UDP, a device simulator, a network device finder, an SCPI instrument terminal, a live plotter, a COM port inspector, a PLC (MC protocol) simulator and a Wi-Fi/Bluetooth drop recorder — one small program per job. Free and open source (GPL-3.0), Windows 10 and 11.",
    trust: ["No ads in the apps", "No bundles", "Installer or portable", "Open source"],
    allTools: "PortDock tools",
    more: "Details",
    whyTitle: "Why PortDock",
    why: [
      ["It reconnects", "Unplug and replug a USB adapter: PortDock finds the same device again and logs when it dropped."],
      ["One line, one message", "Idle gap, terminator, fixed length or Modbus RTU framing — no more merged or split data."],
      ["See before you send", "The exact bytes that will go out, including checksum and line ending, are shown as you type."],
      ["Korean and English", "Screens, errors and help in both languages, with tooltips on every control."],
    ],
    ctaTitle: "Questions, bugs or ideas?",
    ctaBody: "Ask how something works, report a bug, suggest a web tool or guide, or correct a device register map.",
    ctaBtn: "Get in touch",
    whoTitle: "Made for",
    featTitle: "Features",
    stepsTitle: "Quick start",
    dlTitle: "Download",
    dlSetup: "Installer (.exe)",
    dlPortable: "Portable (.zip)",
    dlOffline: "Offline installer",
    dlNote: "Windows 10 and 11 (64-bit). The first run may show a «Windows protected your PC» prompt («More info» → «Run anyway»).",
    dlAll: "All versions and changelog",
    dlSoon: "Coming soon",
    dlSoonNote: "The first version is not out yet. Watch the repository (Watch → Custom → Releases) to get notified when it is.",
    dlUpcoming: "Coming soon",
    dlUpcomingNote: "This program ships in the next release. Watch the repository (Watch → Custom → Releases) to get notified when it is out.",
    readDocs: "Read the full guide",
    docsOf: "Guide",
    backToTool: "Back to the tool",
    toc: "Contents",
    safeTitle: "Is it safe?",
    safe: [
      "Download only from the GitHub releases page. Do not use copies hosted elsewhere.",
      "Every release lists SHA256 hashes (SHA256SUMS.txt) and a Microsoft Defender scan result. Compare with Get-FileHash in PowerShell (example below).",
      "Builds are not code-signed yet, so Windows may show «Windows protected your PC» («More info» → «Run anyway»). You can check a downloaded file against the SHA256 values above.",
      "Device traffic goes only to the ports and addresses you choose and is never sent anywhere else. The exception is Hardware Tester: only while recording, it pings the gateway and an internet address you choose (1.1.1.1 by default) and looks up one name (example.com by default) at the DNS server. Error reports are sent only with your permission (the default is «Ask after a crash»); usage statistics and the update check (asking GitHub for the latest release) are off by default and run only if you turn them on in Settings.",
      "The «AI» button in the title bar (copy for asking AI) only puts the preview text on the clipboard; PortDock sends it nowhere. Once you paste it into an AI chat it goes to that service, so check the preview — user folders, PC names, the last half of MAC addresses and public IPs are masked — before pasting.",
    ],
    webview: "Requires Microsoft Edge WebView2 (included in Windows 11). For offline PCs, get the «offline installer» with WebView2 bundled.",
    footerLine: "PortDock — communication tools for hardware testing. GPL-3.0.",
    skip: "Skip to content",
    langMenu: "Language",
    breadcrumb: "Breadcrumb",
    open: "Open",
    inEnglish: "",
    /** 문장 끝 마침표(링크 뒤에 붙는 것) */
    period: ".",
    allToolsEn: "",
    feedbackAria: "Feedback",
    feedbackQ: "Was this page helpful?",
    feedbackBody: " Tell us what worked, what was missing, or which calculation you would like next.",
    feedbackPrefix: "Feedback: ",
    feedbackIdea: "Leave feedback",
    feedbackIssue: "Report a mistake",
    feedbackMail: "Email us",
    noticeAria: "Use notice",
    noticeHead: "Use notice",
    noticeBody:
      "The calculations and data on this page are for reference. Real values can differ by model, firmware and settings, so check the equipment manual and the applicable standards and regulations before design, installation or operation, and have electrical and safety work checked by a qualified person.",
    noticeFix: [" Found a mistake? Tell us through the ", "contact page", " or a ", "GitHub issue", " and we will fix it."],
    noticeAll: "Full terms of use",
    readNext: "Read next",
    dlPrograms: "Download the PortDock programs (free, Windows)",
    moreTools: (n: number) => `${n} more web tools`,
    filterEmpty: "Nothing matches. Try another word.",
    filterCount: "{n}",
  },
} as const;

/** 문자열 틀(as const)을 «같은 모양의 아무 문자열» 로 — 추가 언어 사전이 맞춰야 하는 모양 */
export type Widen<T> = T extends string
  ? string
  : T extends (...a: infer A) => infer R
    ? (...a: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { readonly [K in keyof T]: Widen<T[K]> };
export type UiText = Widen<(typeof UI)["en"]>;

/** 이 언어의 공용 문구 */
export const ui = (lang: SiteLang): UiText => (isCore(lang) ? UI[lang] : DICTS[lang].ui);

/** 프로그램 한 줄 소개 — 추가 언어는 i18n/<언어>/common.ts 의 apps */
export const appTagline = (x: Tool, lang: SiteLang): string => (isCore(lang) ? x.tagline[lang] : DICTS[lang].common.apps[x.id]);

/** 웹 도구 이름·한 줄 소개 — 추가 언어는 번역 범위(scope.ts)의 도구만 있다(i18n/<언어>/common.ts·batch2.ts 의 webTools) */
export const webToolText = (w: WebTool, lang: SiteLang): { name: string; blurb: string } => {
  if (isCore(lang)) return { name: w.name[lang], blurb: w.blurb[lang] };
  const x = (DICTS[lang].common.webTools as Partial<Record<string, { name: string; blurb: string }>>)[w.path] ?? (DICTS2[lang]?.webTools as Partial<Record<string, { name: string; blurb: string }>> | undefined)?.[w.path];
  if (!x) throw new Error(`${lang}: 번역 범위 밖 웹 도구 ${w.path}`);
  return x;
};

/** 웹 도구 묶음 이름 */
export const groupName = (g: { id: GroupId; name: { ko: string; en: string } }, lang: SiteLang): string => (isCore(lang) ? g.name[lang] : DICTS[lang].common.groups[g.id]);
