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

/// stdio 로 MCP 서버를 돌린다 — 클라이언트가 stdin 을 닫으면 끝
pub async fn serve_stdio() -> Result<(), String> {
    let log = log::SessionLog::new(log::default_dir());
    eprintln!("portdock-mcp {} — session log: {}", env!("CARGO_PKG_VERSION"), log.dir().display());
    let service = server::PortDockMcp::new(log).serve(rmcp::transport::stdio()).await.map_err(|e| e.to_string())?;
    service.waiting().await.map_err(|e| e.to_string())?;
    Ok(())
}
