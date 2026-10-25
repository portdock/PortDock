import React from "react";
import { reportRenderCrash } from "./report";
import { ReportDialog } from "./ReportDialog";

/**
 * 이 프로그램의 화면 설정(명령 목록·표 등 포함)을 지우고 다시 연다 — 깨진 저장값 때문에 열자마자 같은 곳에서
 * 계속 죽을 때의 탈출구. 언어만 남긴다
 */
function resetSettings(lang: "ko" | "en") {
  try {
    localStorage.clear();
    localStorage.setItem("lang", JSON.stringify(lang));
  } catch {
    /* 저장이 막힌 환경 — 다시 열기만 */
  }
  location.reload();
}

/** 화면이 깨지면 원인을 보여 주고, 그 자리에서 개발자에게 보낼 수 있게 한다 */
export class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null; report: boolean; armReset: boolean }> {
  state = { err: null as string | null, report: false, armReset: false };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e) };
  }
  componentDidCatch(e: unknown, info: React.ErrorInfo) {
    const text = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    reportRenderCrash(`${text}\n\ncomponent stack:${info.componentStack ?? ""}`);
  }
  render() {
    if (!this.state.err) return this.props.children;
    // 화면 설정은 깨졌을 수 있으므로 저장값에서 언어만 읽는다. 못 읽으면 윈도우 언어
    let lang: "ko" | "en" = navigator.language?.toLowerCase().startsWith("ko") ? "ko" : "en";
    try {
      const saved = (JSON.parse(localStorage.getItem("settings") ?? "{}") as { lang?: string }).lang;
      if (saved === "ko" || saved === "en") lang = saved;
    } catch {
      /* 윈도우 언어 그대로 */
    }
    const ko = lang === "ko";
    return (
      <div style={{ padding: 16 }}>
        <h3>{ko ? "화면 오류가 났습니다" : "The screen crashed"}</h3>
        <p>{ko ? "아래 내용을 개발자에게 보내 주시면 고치는 데 큰 도움이 됩니다. 다시 열면 대부분 정상으로 돌아옵니다." : "Sending this to the developer helps fix it. Reopening the program usually recovers."}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className="btn primary" onClick={() => this.setState({ report: true })}>
            {ko ? "문제 보고" : "Report a problem"}
          </button>
          <button className="btn" onClick={() => location.reload()}>
            {ko ? "다시 열기" : "Reload"}
          </button>
          {/* 확인 창(Tauri 대화 상자)이 깨진 화면에서 못 뜰 수 있어 두 번 눌러 확인 */}
          <button className="btn" onClick={() => (this.state.armReset ? resetSettings(lang) : this.setState({ armReset: true }))} title={ko ? "다시 열어도 같은 오류가 나면 — 저장된 화면 설정(명령 목록·규칙 포함)을 지웁니다" : "If reloading crashes again — clears saved screen settings (including command lists and rules)"}>
            {this.state.armReset ? (ko ? "정말 초기화 — 한 번 더 누르세요" : "Really reset — click again") : ko ? "설정 초기화" : "Reset settings"}
          </button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", color: "#b42318" }}>{this.state.err}</pre>
        {this.state.report && <ReportDialog app={document.title || "PortDock"} lang={lang} onClose={() => this.setState({ report: false })} />}
      </div>
    );
  }
}
