//! 세션 기록 — 도구 호출마다 JSONL 한 줄(시각·도구·인자·대상·결과 요약·걸린 시간). 이 PC 에만 남고 밖으로 보내지 않는다.
//!
//! 폴더: 휴대판처럼 exe 옆에 `portdock-data` 폴더가 있으면 `portdock-data\mcp-log`, 아니면 `%LOCALAPPDATA%\dev.portdock\mcp-log`.
//! 환경 변수 `PORTDOCK_MCP_LOG_DIR` 로 바꿀 수 있다(시험·사용자 선택). 파일은 날짜마다 `YYYY-MM-DD.jsonl`, 30일 지난 파일은 시작할 때 지운다.

use serde_json::{Value, json};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// 기록에 남기는 결과 요약 길이(글자)
const SUMMARY_CHARS: usize = 300;
/// 기록 파일을 남기는 날 수
const KEEP_DAYS: i64 = 30;

pub fn default_dir() -> PathBuf {
    if let Some(d) = std::env::var_os("PORTDOCK_MCP_LOG_DIR").filter(|d| !d.is_empty()) {
        return PathBuf::from(d);
    }
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf));
    if let Some(data) = exe_dir.map(|d| d.join("portdock-data"))
        && data.is_dir()
    {
        return data.join("mcp-log");
    }
    std::env::var_os("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(std::env::temp_dir).join("dev.portdock").join("mcp-log")
}

pub struct SessionLog {
    dir: PathBuf,
    /// 이번 세션 식별(시작 시각 ms) — 같은 날 파일에 여러 세션이 섞여도 가른다
    session: u64,
    /// 이번 세션의 줄(리소스 portdock://session/log 로 보인다) — 최근 200줄
    recent: Mutex<Vec<String>>,
}

impl SessionLog {
    pub fn new(dir: PathBuf) -> Self {
        let s = Self { dir, session: portdock_core::event::now_ms(), recent: Mutex::new(Vec::new()) };
        s.prune();
        s
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    fn file(&self) -> PathBuf {
        self.dir.join(format!("{}.jsonl", chrono::Local::now().format("%Y-%m-%d")))
    }

    /// 한 줄 쓰기. 쓰지 못해도 도구 호출은 막지 않는다(stderr 에 한 줄)
    pub fn write(&self, tool: &str, args: &Value, target: Option<&str>, ok: bool, summary: &str, ms: u128) {
        let short: String = summary.chars().take(SUMMARY_CHARS).collect();
        let line = json!({
            "ts": chrono::Local::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, false),
            "session": self.session,
            "tool": tool,
            "args": args,
            "target": target,
            "ok": ok,
            "summary": short,
            "ms": ms,
        });
        let text = crate::guard::redact(&line.to_string());
        {
            let mut r = self.recent.lock().unwrap_or_else(|e| e.into_inner());
            r.push(text.clone());
            let n = r.len();
            if n > 200 {
                r.drain(..n - 200);
            }
        }
        let res = std::fs::create_dir_all(&self.dir).and_then(|_| OpenOptions::new().create(true).append(true).open(self.file())).and_then(|mut f| writeln!(f, "{text}"));
        if let Err(e) = res {
            eprintln!("portdock-mcp: session log not written ({}): {e}", self.dir.display());
        }
    }

    /// 이번 세션의 줄들(JSONL)
    pub fn recent(&self) -> String {
        self.recent.lock().unwrap_or_else(|e| e.into_inner()).join("\n")
    }

    /// 30일 지난 기록 파일 지우기(이름이 날짜 모양인 .jsonl 만)
    fn prune(&self) {
        let Ok(rd) = std::fs::read_dir(&self.dir) else { return };
        let today = chrono::Local::now().date_naive();
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().into_owned();
            let Some(day) = name.strip_suffix(".jsonl").and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok()) else { continue };
            if (today - day).num_days() > KEEP_DAYS {
                let _ = std::fs::remove_file(e.path());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_jsonl_redacted_and_keeps_recent() {
        let dir = std::env::temp_dir().join(format!("portdock-mcp-log-{}", portdock_core::event::now_ms()));
        // 오래된 파일은 지워지고 다른 파일은 남는다
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("2000-01-01.jsonl"), "old\n").unwrap();
        std::fs::write(dir.join("notes.txt"), "keep\n").unwrap();
        let log = SessionLog::new(dir.clone());
        assert!(!dir.join("2000-01-01.jsonl").exists());
        assert!(dir.join("notes.txt").exists());
        log.write("ports_list", &json!({}), None, true, "2 ports", 3);
        log.write("serial_read", &json!({"port": "COM3", "path": "C:\\Users\\kim\\x"}), Some("COM3"), false, "busy 0A-1B-2C-3D-4E-5F", 10);
        let text = std::fs::read_to_string(log.file()).unwrap();
        let lines: Vec<Value> = text.lines().map(|l| serde_json::from_str(l).unwrap()).collect();
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0]["tool"], "ports_list");
        assert_eq!(lines[1]["target"], "COM3");
        assert_eq!(lines[1]["ok"], false);
        assert!(!text.contains("kim") && !text.contains("0A-1B"), "{text}");
        assert_eq!(log.recent().lines().count(), 2);
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
