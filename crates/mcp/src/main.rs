//! portdock-mcp.exe — MCP 클라이언트가 띄우는 stdio 서버(창 없음). 사람이 직접 실행하면 안내만 보이고 stdin 을 기다린다.

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("portdock-mcp {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!(
            "portdock-mcp {} — PortDock MCP server (stdio)\n\n\
             Started by an MCP client (Claude Desktop, VS Code, Cursor …), not by hand.\n\
             Tools: {}\n\
             Read-only, except *_write_sim tools that write only to simulators on 127.0.0.1.\n\
             Session log: {}\n\
             Environment: PORTDOCK_MCP_LANG=ko|en (messages), PORTDOCK_MCP_LOG_DIR=<folder>\n\
             https://portdock.dev/en/guides/portdock-mcp/",
            env!("CARGO_PKG_VERSION"),
            portdock_mcp::server::TOOL_NAMES.join(", "),
            portdock_mcp::log::default_dir().display()
        );
        return;
    }
    portdock_core::i18n::set_lang(&std::env::var("PORTDOCK_MCP_LANG").unwrap_or_else(|_| "en".into()));
    let rt = match tokio::runtime::Builder::new_current_thread().enable_all().build() {
        Ok(rt) => rt,
        Err(e) => {
            eprintln!("portdock-mcp: {e}");
            std::process::exit(1);
        }
    };
    if let Err(e) = rt.block_on(portdock_mcp::serve_stdio()) {
        eprintln!("portdock-mcp: {e}");
        std::process::exit(1);
    }
}
