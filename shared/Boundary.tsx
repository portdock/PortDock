import React from "react";
import { reportRenderCrash } from "./report";
import { ReportDialog } from "./ReportDialog";

/** 화면이 깨지면 원인을 보여 주고, 그 자리에서 개발자에게 보낼 수 있게 한다 */
export class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null; report: boolean }> {
  state = { err: null as string | null, report: false };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e) };
  }
  componentDidCatch(e: unknown, info: React.ErrorInfo) {
    const text = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    reportRenderCrash(`${text}\n\ncomponent stack:${info.componentStack ?? ""}`);
  }
  render() {
    if (!this.state.err) return this.props.children;
    // 화면 설정은 깨졌을 수 있으므로 저장값에서 언어만 읽는다
    let lang: "ko" | "en" = "ko";
    try {
      lang = (JSON.parse(localStorage.getItem("settings") ?? "{}") as { lang?: string }).lang === "en" ? "en" : "ko";
    } catch {
      /* 기본 한국어 */
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
        </div>
        <pre style={{ whiteSpace: "pre-wrap", color: "#b42318" }}>{this.state.err}</pre>
        {this.state.report && <ReportDialog app={document.title || "PortDock"} lang={lang} onClose={() => this.setState({ report: false })} />}
      </div>
    );
  }
}
