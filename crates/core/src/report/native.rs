//! 네이티브 크래시(접근 위반·스택 넘침·힙 손상 등) — panic 훅이 잡지 못하는 것.
//!
//! 죽어 가는 프로세스는 스스로 믿을 만한 기록을 남기기 어렵다. 그래서 같은 실행 파일을
//! `--portdock-crash-monitor <소켓 경로> <부모 pid>` 로 하나 더 띄워 두고(창 없음),
//! 사고가 나면 그 감시 프로세스가 바깥에서 minidump(`crash-<시각>-<pid>.dmp`)와
//! 설명(`같은 이름.txt`)을 보고 폴더에 쓴다. 다음에 켤 때 화면이 다른 보고와 똑같이 묻는다.
//! (sentry-minidump 이 쓰는 방식과 같은 부품 — EmbarkStudios crash-handler · minidumper)
//!
//! 무엇이든 실패하면 조용히 넘어간다 — 감시가 없어도 프로그램은 떠야 한다.

use std::ffi::OsString;
use std::path::PathBuf;

/// 감시 프로세스로 띄울 때 첫 인자
pub const MONITOR_ARG: &str = "--portdock-crash-monitor";

/// 감시 프로세스 인자 — `<exe> --portdock-crash-monitor <소켓 경로> <부모 pid>`. 정확히 이 꼴일 때만
pub(crate) fn monitor_args<I: IntoIterator<Item = OsString>>(args: I) -> Option<(PathBuf, u32)> {
    let mut it = args.into_iter().skip(1);
    if it.next()? != MONITOR_ARG {
        return None;
    }
    let sock = PathBuf::from(it.next()?);
    let ppid = it.next()?.to_str()?.parse().ok()?;
    if it.next().is_some() || sock.as_os_str().is_empty() {
        return None;
    }
    Some((sock, ppid))
}

/// `run()` 맨 앞(WebView2 확인·[`super::install`] 다음)에서 한 번 부른다.
/// - 감시 프로세스로 불렸으면: 감시만 하다가 부모가 끝나면 프로세스를 끝낸다(돌아오지 않는다 — 화면을 만들지 않는다)
/// - 보통 실행이면: 뒤에서 감시 프로세스를 띄우고 처리기를 붙인다(시작을 늦추지 않는다)
pub fn crash_monitor_or_attach() {
    if let Some((sock, ppid)) = monitor_args(std::env::args_os()) {
        #[cfg(windows)]
        win::run_monitor(&sock, ppid);
        let _ = (sock, ppid);
        std::process::exit(0);
    }
    #[cfg(windows)]
    {
        let _ = std::thread::Builder::new().name("crash-monitor".into()).spawn(|| {
            if let Err(e) = win::attach() {
                eprintln!("crash monitor: {e}");
            }
        });
    }
}

#[cfg(windows)]
mod win {
    use super::super::{KEEP, PANICKED, compose, crash_stem, prune, reports_dir};
    use super::MONITOR_ARG;
    use crash_handler::{CrashContext, CrashEventResult, CrashHandler, make_crash_event};
    use minidumper::{Client, LoopAction, MinidumpBinary, Server, ServerHandler};
    use std::fs::{self, File};
    use std::os::windows::process::CommandExt;
    use std::path::{Path, PathBuf};
    use std::process::{Command, Stdio};
    use std::sync::Mutex;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::time::{Duration, Instant};

    /// 콘솔 창을 만들지 않는다(디버그 빌드는 콘솔 프로그램이다)
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    /// 감시 프로세스가 뜨기를 기다리는 시간
    const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
    /// 사고 직전에 보내는 예외 코드 메시지
    const MSG_CODE: u32 = 1;

    static SHUTDOWN: AtomicBool = AtomicBool::new(false);

    /// 보통 실행 쪽 — 감시 프로세스를 띄우고, 접속하고, 처리기를 붙인다
    pub(super) fn attach() -> Result<(), String> {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let pid = std::process::id();
        let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.subsec_nanos()).unwrap_or(0);
        // 유닉스 소켓 경로 길이 한도(108)가 있어 짧은 임시 폴더에 둔다
        let sock = std::env::temp_dir().join(format!("portdock-cm-{pid}-{nanos:x}.sock"));
        let mut child = Command::new(exe)
            .arg(MONITOR_ARG)
            .arg(&sock)
            .arg(pid.to_string())
            .env_remove("PORTDOCK_TEST_CRASH")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("spawn: {e}"))?;

        let start = Instant::now();
        let client = loop {
            match Client::with_name(sock.as_path().into()) {
                Ok(c) => break c,
                Err(e) => {
                    // 감시 프로세스가 이미 끝났거나 너무 오래 걸리면 포기 — 남겨 두지 않는다
                    if start.elapsed() > CONNECT_TIMEOUT || child.try_wait().ok().flatten().is_some() {
                        let _ = child.kill();
                        let _ = child.wait();
                        return Err(format!("connect: {e}"));
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
            }
        };

        // SAFETY: 사고 순간에는 최소한만 한다 — 소켓으로 짧은 메시지 둘(예외 코드, 덤프 요청)을 보내고 답을 기다릴 뿐
        let event = unsafe {
            make_crash_event(move |cc: &CrashContext| {
                // panic 훅이 이미 기록했으면 덤프는 만들지 않는다(같은 사고를 두 번 보고하지 않게)
                if PANICKED.load(Ordering::SeqCst) {
                    return CrashEventResult::Handled(false);
                }
                let _ = client.send_message(MSG_CODE, cc.exception_code.to_le_bytes());
                CrashEventResult::Handled(client.request_dump(cc).is_ok())
            })
        };
        let handler = CrashHandler::attach(event).map_err(|e| format!("attach: {e}"))?;
        // 프로세스가 끝날 때까지 붙여 둔다(떼면 처리기가 빠진다). 감시 프로세스(child)는 부모가 끝나면 스스로 끝난다
        std::mem::forget(handler);
        drop(child);
        Ok(())
    }

    /// 감시 프로세스 쪽 — 덤프 요청을 기다린다. 부모가 끝나거나 덤프를 쓰면 돌아온다
    pub(super) fn run_monitor(sock: &Path, ppid: u32) {
        watch_parent(ppid);
        let Ok(mut server) = Server::with_name(sock.into()) else { return };
        let handler = Monitor { dir: reports_dir(), ppid, stem: Mutex::new(None), code: Mutex::new(None) };
        let _ = server.run(Box::new(handler), &SHUTDOWN, None);
    }

    /// 부모가 끝나면(정상 종료·강제 종료 모두) 감시도 끝낸다
    fn watch_parent(ppid: u32) {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{INFINITE, OpenProcess, PROCESS_SYNCHRONIZE, WaitForSingleObject};
        // SAFETY: 핸들은 이 함수 안에서만 쓰고 닫는다
        let h = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, 0, ppid) };
        if h.is_null() {
            // 부모가 이미 없다
            SHUTDOWN.store(true, Ordering::SeqCst);
            return;
        }
        let h = h as usize; // 스레드로 넘기려고(HANDLE 은 Send 가 아니다)
        let spawned = std::thread::Builder::new().name("parent-watch".into()).spawn(move || {
            let h = h as windows_sys::Win32::Foundation::HANDLE;
            // SAFETY: 위에서 연 핸들 — 기다린 뒤 닫는다
            unsafe {
                WaitForSingleObject(h, INFINITE);
                CloseHandle(h);
            }
            SHUTDOWN.store(true, Ordering::SeqCst);
        });
        if spawned.is_err() {
            SHUTDOWN.store(true, Ordering::SeqCst);
        }
    }

    struct Monitor {
        dir: PathBuf,
        ppid: u32,
        stem: Mutex<Option<String>>,
        code: Mutex<Option<i32>>,
    }

    impl Monitor {
        fn stem(&self) -> String {
            self.stem.lock().ok().and_then(|s| s.clone()).unwrap_or_else(|| crash_stem(self.ppid))
        }
    }

    impl ServerHandler for Monitor {
        fn create_minidump_file(&self) -> Result<(File, PathBuf), std::io::Error> {
            fs::create_dir_all(&self.dir)?;
            let stem = crash_stem(self.ppid);
            let path = self.dir.join(format!("{stem}.dmp"));
            if let Ok(mut s) = self.stem.lock() {
                *s = Some(stem);
            }
            Ok((File::create(&path)?, path))
        }

        fn on_minidump_created(&self, result: Result<MinidumpBinary, minidumper::Error>) -> LoopAction {
            let code = self.code.lock().ok().and_then(|c| *c);
            let what = code.map(|c| format!(", exception=0x{:08X} ({})", c as u32, exception_name(c as u32))).unwrap_or_default();
            let stem = self.stem();
            let body = match result {
                Ok(md) => {
                    drop(md.file);
                    format!("message: native crash (minidump){what}\nprocess: {}\ndump: {stem}.dmp\n", self.ppid)
                }
                Err(e) => {
                    // 덤프를 못 썼다 — 반쯤 쓴 파일은 지우고 설명만 남긴다
                    let _ = fs::remove_file(self.dir.join(format!("{stem}.dmp")));
                    format!("message: native crash (minidump failed: {e}){what}\nprocess: {}\n", self.ppid)
                }
            };
            let _ = fs::write(self.dir.join(format!("{stem}.txt")), compose(&body));
            prune(&self.dir, KEEP);
            LoopAction::Exit
        }

        fn on_message(&self, kind: u32, buffer: Vec<u8>) {
            if kind == MSG_CODE
                && let Ok(b) = <[u8; 4]>::try_from(buffer.as_slice())
                && let Ok(mut c) = self.code.lock()
            {
                *c = Some(i32::from_le_bytes(b));
            }
        }

        fn on_client_disconnected(&self, num_clients: usize) -> LoopAction {
            // 부모가 정상으로 끝났다
            if num_clients == 0 { LoopAction::Exit } else { LoopAction::Continue }
        }
    }

    fn exception_name(code: u32) -> &'static str {
        match code {
            0xC000_0005 => "access violation",
            0xC000_00FD => "stack overflow",
            0xC000_0374 => "heap corruption",
            0xC000_0409 => "stack buffer overrun",
            0xC000_001D => "illegal instruction",
            0xC000_0094 => "integer divide by zero",
            0xC000_0025 => "noncontinuable exception",
            0xC000_000D => "invalid parameter",
            0x4000_0015 => "abort",
            0x8000_0003 => "breakpoint",
            _ => "other",
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::sync::Arc;

        /// 감시 쪽 처리기를 한 프로세스 안에서 돌려 본다 — 덤프 요청을 받으면 .dmp + .txt 짝을 쓰고 끝난다
        #[test]
        fn monitor_writes_dump_pair() {
            let pid = std::process::id();
            let dir = std::env::temp_dir().join(format!("portdock-report-test-monitor-{pid}"));
            let _ = fs::remove_dir_all(&dir);
            let sock = std::env::temp_dir().join(format!("portdock-cm-test-{pid}.sock"));
            let mut server = Server::with_name(sock.as_path().into()).unwrap();
            let handler = Monitor { dir: dir.clone(), ppid: pid, stem: Mutex::new(None), code: Mutex::new(None) };
            let stop = Arc::new(AtomicBool::new(false));
            let flag = stop.clone();
            let t = std::thread::spawn(move || server.run(Box::new(handler), &flag, None).is_ok());

            let client = Client::with_name(sock.as_path().into()).unwrap();
            client.send_message(MSG_CODE, 0xC000_0005u32.to_le_bytes()).unwrap();
            // SAFETY: 현재 스레드 번호를 읽을 뿐
            let tid = unsafe { windows_sys::Win32::System::Threading::GetCurrentThreadId() };
            let cc = CrashContext { exception_pointers: std::ptr::null(), process_id: pid, thread_id: tid, exception_code: 0xC000_0005u32 as i32 };
            client.request_dump(&cc).unwrap();
            assert!(t.join().unwrap(), "server loop ends after the dump");

            let v = super::super::super::pending_in(&dir);
            assert_eq!(v.len(), 1);
            assert!(v[0].text.contains("native crash (minidump), exception=0xC0000005 (access violation)"), "{}", v[0].text);
            let dump = v[0].dump.clone().expect("dump file");
            assert_eq!(&fs::read(dir.join(&dump)).unwrap()[..4], b"MDMP");
            stop.store(true, Ordering::SeqCst);
            let _ = fs::remove_dir_all(&dir);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(v: &[&str]) -> Vec<OsString> {
        v.iter().map(OsString::from).collect()
    }

    #[test]
    fn monitor_arg_parsing() {
        assert_eq!(
            monitor_args(args(&["app.exe", MONITOR_ARG, r"C:\Temp\portdock-cm-1-a.sock", "1234"])),
            Some((PathBuf::from(r"C:\Temp\portdock-cm-1-a.sock"), 1234))
        );
        // 보통 실행·다른 인자·모자라거나 남는 인자는 감시가 아니다
        assert_eq!(monitor_args(args(&["app.exe"])), None);
        assert_eq!(monitor_args(args(&["app.exe", "--other", "x", "1"])), None);
        assert_eq!(monitor_args(args(&["app.exe", MONITOR_ARG, "x"])), None);
        assert_eq!(monitor_args(args(&["app.exe", MONITOR_ARG, "x", "pid"])), None);
        assert_eq!(monitor_args(args(&["app.exe", MONITOR_ARG, "", "1"])), None);
        assert_eq!(monitor_args(args(&["app.exe", MONITOR_ARG, "x", "1", "extra"])), None);
        assert_eq!(monitor_args(args(&["app.exe", "x", MONITOR_ARG, "x", "1"])), None);
    }
}
