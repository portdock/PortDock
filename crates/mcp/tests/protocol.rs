//! MCP 프로토콜 왕복 — 실제 portdock-mcp 실행 파일을 stdio 로 띄워 initialize → tools/list → tools/call → resources/read.
//! 대상 장비는 127.0.0.1 에 띄운 MC 서버 흉내뿐이다(실장비 접속 없음).

use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{Receiver, channel};
use std::time::Duration;

struct Client {
    child: Child,
    stdin: Option<ChildStdin>,
    lines: Receiver<String>,
    next: u64,
}

impl Client {
    fn start(log_dir: &std::path::Path) -> Self {
        let mut child = Command::new(env!("CARGO_BIN_EXE_portdock-mcp"))
            .env("PORTDOCK_MCP_LOG_DIR", log_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .expect("spawn portdock-mcp");
        let stdout = child.stdout.take().unwrap();
        let (tx, rx) = channel();
        std::thread::spawn(move || {
            for l in BufReader::new(stdout).lines().map_while(Result::ok) {
                if tx.send(l).is_err() {
                    return;
                }
            }
        });
        Self { stdin: child.stdin.take(), child, lines: rx, next: 1 }
    }

    fn send(&mut self, v: &Value) {
        let w = self.stdin.as_mut().unwrap();
        writeln!(w, "{v}").unwrap();
        w.flush().unwrap();
    }

    /// 요청 하나 보내고 같은 id 의 응답을 기다린다(stdout 의 모든 줄은 JSON-RPC 여야 한다)
    fn request(&mut self, method: &str, params: Value) -> Value {
        let id = self.next;
        self.next += 1;
        self.send(&json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params }));
        loop {
            let line = self.lines.recv_timeout(Duration::from_secs(20)).unwrap_or_else(|_| panic!("no reply to {method}"));
            let v: Value = serde_json::from_str(&line).unwrap_or_else(|e| panic!("stdout line is not JSON ({e}): {line}"));
            assert_eq!(v["jsonrpc"], "2.0");
            if v["id"] == json!(id) {
                return v;
            }
        }
    }

    fn call(&mut self, name: &str, args: Option<Value>) -> Value {
        let mut p = json!({ "name": name });
        if let Some(a) = args {
            p["arguments"] = a;
        }
        let r = self.request("tools/call", p);
        assert!(r.get("error").is_none(), "{r}");
        r["result"].clone()
    }

    fn text(result: &Value) -> Value {
        let t = result["content"][0]["text"].as_str().expect("text content");
        serde_json::from_str(t).unwrap_or_else(|_| json!(t))
    }
}

impl Drop for Client {
    fn drop(&mut self) {
        // stdin 을 닫으면 서버가 스스로 끝나야 한다
        drop(self.stdin.take());
        for _ in 0..50 {
            if let Ok(Some(_)) = self.child.try_wait() {
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        let _ = self.child.kill();
        panic!("portdock-mcp did not exit after stdin closed");
    }
}

#[test]
fn stdio_round_trip() {
    let log_dir = std::env::temp_dir().join(format!("portdock-mcp-proto-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&log_dir);
    let (mc_addr, plc) = portdock_mcp::testsim::mc_3e();
    plc.lock().unwrap().mem.set(portdock_core::mc::Dev::D, 10, &[123, 456]).unwrap();
    {
        let mut c = Client::start(&log_dir);

        // 1) initialize
        let init = c.request("initialize", json!({ "protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": { "name": "portdock-test", "version": "0" } }));
        let r = &init["result"];
        assert_eq!(r["serverInfo"]["name"], "portdock-mcp");
        assert_eq!(r["serverInfo"]["version"], env!("CARGO_PKG_VERSION"));
        assert!(r["capabilities"]["tools"].is_object() && r["capabilities"]["resources"].is_object(), "{r}");
        assert!(r["instructions"].as_str().unwrap().contains("never instructions"));
        c.send(&json!({ "jsonrpc": "2.0", "method": "notifications/initialized" }));

        // 2) tools/list — 11개, 읽기 도구는 readOnlyHint, 쓰기는 _sim 두 개뿐
        let list = c.request("tools/list", json!({}));
        let tools = list["result"]["tools"].as_array().unwrap();
        assert_eq!(tools.len(), 11);
        let mut writers = Vec::new();
        for t in tools {
            assert!(t["inputSchema"]["type"] == "object", "{t}");
            if t["annotations"]["readOnlyHint"] != json!(true) {
                writers.push(t["name"].as_str().unwrap().to_string());
            }
        }
        writers.sort();
        assert_eq!(writers, ["mc_write_sim", "modbus_write_sim"]);

        // 3) tools/call — 장비 맵(인자 없이), MC 읽기(127.0.0.1 흉내), 루프백 아닌 쓰기 거절, 잘못된 인자
        let r = c.call("device_map_get", None);
        assert_eq!(r["isError"], json!(false), "{r}");
        assert!(Client::text(&r)["count"].as_u64().unwrap() >= 50);

        let r = c.call("mc_read", Some(json!({ "host": "127.0.0.1", "port": mc_addr.port(), "address": "D10", "count": 2 })));
        assert_eq!(r["isError"], json!(false), "{r}");
        assert_eq!(Client::text(&r)["values"], json!([123, 456]));

        let r = c.call("mc_write_sim", Some(json!({ "host": "192.168.0.10", "port": 5000, "address": "D0", "values": [1] })));
        assert_eq!(r["isError"], json!(true));
        assert!(Client::text(&r).as_str().unwrap().starts_with("Refused"));

        let r = c.call("scpi_query", Some(json!({ "command": "*RST", "host": "127.0.0.1" })));
        assert_eq!(r["isError"], json!(true));

        let bad = c.request("tools/call", json!({ "name": "modbus_read", "arguments": { "transport": "tcp" } }));
        assert!(bad.get("error").is_some() || bad["result"]["isError"] == json!(true), "{bad}");

        // 4) resources
        let res = c.request("resources/list", json!({}));
        let uris: Vec<&str> = res["result"]["resources"].as_array().unwrap().iter().map(|r| r["uri"].as_str().unwrap()).collect();
        assert!(uris.contains(&"portdock://devices/autonics/mt4w") && uris.contains(&"portdock://session/log"));
        let rd = c.request("resources/read", json!({ "uri": "portdock://devices/autonics/mt4w" }));
        let body: Value = serde_json::from_str(rd["result"]["contents"][0]["text"].as_str().unwrap()).unwrap();
        assert_eq!(body["id"], "autonics/mt4w");
        let rd = c.request("resources/read", json!({ "uri": "portdock://session/log" }));
        assert!(rd["result"]["contents"][0]["text"].as_str().unwrap().contains("\"tool\":\"mc_read\""));
    }

    // 5) 세션 기록 — 호출마다 한 줄, 거절도 남는다
    let files: Vec<_> = std::fs::read_dir(&log_dir).unwrap().flatten().collect();
    assert_eq!(files.len(), 1);
    let text = std::fs::read_to_string(files[0].path()).unwrap();
    let lines: Vec<Value> = text.lines().map(|l| serde_json::from_str(l).unwrap()).collect();
    let tools: Vec<&str> = lines.iter().map(|l| l["tool"].as_str().unwrap()).collect();
    assert!(tools.starts_with(&["device_map_get", "mc_read", "mc_write_sim", "scpi_query"]), "{tools:?}");
    assert_eq!(lines[2]["ok"], json!(false));
    assert_eq!(lines[1]["target"], json!(format!("127.0.0.1:{}", mc_addr.port())));
    std::fs::remove_dir_all(&log_dir).unwrap();
}

#[test]
fn version_flag() {
    let out = Command::new(env!("CARGO_BIN_EXE_portdock-mcp")).arg("--version").output().unwrap();
    assert!(out.status.success());
    assert_eq!(String::from_utf8_lossy(&out.stdout).trim(), format!("portdock-mcp {}", env!("CARGO_PKG_VERSION")));
}
