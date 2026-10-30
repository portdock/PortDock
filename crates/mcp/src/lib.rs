//! PortDock MCP — AI 에이전트(Claude Desktop 등 MCP 클라이언트)가 PortDock core 로 포트·장비를 «읽게» 하는 stdio 서버.
//! 읽기 도구 9개 + 이 PC(127.0.0.1) 시뮬레이터에만 쓰는 도구 2개. 실장비에 쓰는 도구·HTTP 서버 모드는 없다.
//! 근거와 범위: docs/mcp.md

pub mod devices;
pub mod guard;
pub mod links;
pub mod log;
pub mod server;
#[doc(hidden)]
pub mod testsim;
pub mod tools;

use rmcp::ServiceExt;

/// 시작할 때 stderr 에 쓰는 한 줄 — 클라이언트가 stderr 를 자기 로그 파일에 남기므로 사용자 폴더 경로는 «~» 로(결과·기록과 같은 가림)
pub fn startup_line(log_dir: &std::path::Path) -> String {
    guard::redact(&format!("portdock-mcp {} — session log: {}", env!("CARGO_PKG_VERSION"), log_dir.display()))
}

/// stdio 로 MCP 서버를 돌린다 — 클라이언트가 stdin 을 닫으면 끝
pub async fn serve_stdio() -> Result<(), String> {
    let log = log::SessionLog::new(log::default_dir());
    eprintln!("{}", startup_line(log.dir()));
    let service = server::PortDockMcp::new(log).serve(rmcp::transport::stdio()).await.map_err(|e| e.to_string())?;
    service.waiting().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn startup_line_hides_user_folder() {
        let l = super::startup_line(std::path::Path::new(r"C:\Users\홍길동\AppData\Local\dev.portdock\mcp-log"));
        assert!(l.contains(r"~\AppData\Local\dev.portdock\mcp-log") && !l.contains("홍길동"), "{l}");
    }
}
