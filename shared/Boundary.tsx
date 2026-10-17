import React from "react";

/** 화면이 비면 원인을 그대로 보여 준다 — 사용자가 캡처해 보내면 바로 원인을 안다 */
export class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e) };
  }
  render() {
    return this.state.err ? <pre style={{ padding: 16, whiteSpace: "pre-wrap", color: "#b42318" }}>{this.state.err}</pre> : this.props.children;
  }
}
