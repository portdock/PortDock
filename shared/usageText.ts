// 사용 통계 문구 — 묻는 카드·설정 칸·도움말이 같은 목록을 쓴다
import type { Lang } from "./uiText";

export const USAGE_TEXT = {
  ko: {
    title: "사용 통계를 보낼까요?",
    why: "어떤 기능을 얼마나 쓰는지 알면 다음에 고칠 곳을 고르는 데 도움이 됩니다. 켜면 창을 닫을 때 한 번, 아래 것만 익명으로 보냅니다.",
    sendsTitle: "보내는 것",
    sends: ["프로그램 이름·버전, 윈도우 버전(10·11), 화면 언어", "켜 둔 시간(분)", "기능별 사용 횟수(연결·보내기·읽기 등 — 횟수만)", "설치판인지 휴대판인지"],
    neverTitle: "보내지 않는 것",
    never: ["통신 내용", "IP·포트·COM 이름", "파일 경로", "PC·사용자·장비 이름", "설치·PC 를 알아볼 id"],
    where: "받는 곳: Aptabase(EU). 인터넷이 없거나 보내지 못하면 버립니다. 설정(⚙)에서 언제든 바꿀 수 있습니다.",
    yes: "보내기",
    no: "보내지 않기",
    setting: "사용 통계 보내기(익명, 창을 닫을 때)",
    hint: "기능별 사용 횟수·켜 둔 시간·프로그램/윈도우 버전·화면 언어·설치판/휴대판만 보냅니다. 통신 내용·IP·포트·COM 이름·파일 경로·PC/사용자/장비 이름은 보내지 않습니다. 받는 곳: Aptabase(EU).",
  },
  en: {
    title: "Send usage statistics?",
    why: "Knowing which features are used helps decide what to improve next. If you turn this on, the items below are sent anonymously, once, when you close the window.",
    sendsTitle: "Sent",
    sends: ["Program name and version, Windows version (10/11), display language", "Minutes the program was open", "How many times each feature was used (connect, send, read … — counts only)", "Installed or portable edition"],
    neverTitle: "Never sent",
    never: ["Traffic contents", "IP addresses, ports, COM names", "File paths", "PC, user and device names", "Any ID that identifies the installation or PC"],
    where: "Receiver: Aptabase (EU). If offline or sending fails, the data is dropped. You can change this anytime in Settings (⚙).",
    yes: "Send",
    no: "Don't send",
    setting: "Send usage statistics (anonymous, on close)",
    hint: "Sends only feature use counts, minutes open, program/Windows version, display language and installed/portable edition. Traffic, IP addresses, ports, COM names, file paths and PC/user/device names are never sent. Receiver: Aptabase (EU).",
  },
} satisfies Record<Lang, Record<string, string | string[]>>;
