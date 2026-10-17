//! 문제 보고 — 프로그램이 죽을 때(panic) 원인을 파일로 남기고, 다음에 켤 때 화면이 «개발자에게 보내기» 를 묻는다.
//! 몰래 보내지 않는다: 파일은 이 PC 에만 남고, 보낼지·무엇을 보낼지는 사용자가 화면에서 정한다.

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static APP: OnceLock<(&'static str, &'static str)> = OnceLock::new();

/// 남겨 둘 보고 파일 수 — 넘치면 오래된 것부터 지운다
const KEEP: usize = 10;
/// 화면으로 넘길 보고 하나의 최대 길이
const MAX_TEXT: usize = 64 * 1024;

static DIR: OnceLock<PathBuf> = OnceLock::new();

/// 보고 폴더.
/// - 포터블: 실행 파일 옆에 `portdock-data` 폴더가 있고 쓸 수 있으면 `<exe 폴더>\portdock-data\reports\<프로그램>`
///   (한 폴더에 여러 PortDock 을 두어도 서로의 보고를 묻지 않도록 프로그램별로 나눈다)
/// - 그 밖: `%LOCALAPPDATA%\dev.portdock.<프로그램>\reports` — 설치 프로그램 식별자와 같은 폴더라
///   제거할 때 «앱 데이터 삭제» 를 고르면 함께 지워진다
pub fn reports_dir() -> PathBuf {
    DIR.get_or_init(|| {
        let app = APP.get().map(|a| a.0).unwrap_or("portdock");
        let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf));
        let local = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
        pick_dir(exe_dir.as_deref(), local, app)
    })
    .clone()
}

fn pick_dir(exe_dir: Option<&Path>, local: Option<PathBuf>, app: &str) -> PathBuf {
    if let Some(data) = exe_dir.map(|d| d.join("portdock-data"))
        && data.is_dir()
        && writable(&data)
    {
        return data.join("reports").join(app);
    }
    local.unwrap_or_else(std::env::temp_dir).join(format!("dev.portdock.{app}")).join("reports")
}

/// 실제로 파일을 만들어 본다(읽기 전용 매체·권한 없는 Program Files 등)
fn writable(dir: &Path) -> bool {
    let probe = dir.join(format!(".write-test-{}", std::process::id()));
    let ok = fs::write(&probe, b"").is_ok();
    let _ = fs::remove_file(&probe);
    ok
}

/// 보고 글에서 사용자 폴더(C:\Users\이름)를 `~` 로 — 보고에 사용자 이름이 실려 나가지 않게
fn redact_home(text: &str, home: &str) -> String {
    let home = home.trim_end_matches(['\\', '/']);
    if home.len() < 3 {
        return text.to_string();
    }
    let mut out = text.to_string();
    for h in [home.to_string(), home.replace('\\', "/")] {
        // 윈도우 경로는 대소문자를 가리지 않는다. ASCII 만 소문자로 바꿔 바이트 위치를 그대로 둔다
        let needle = h.to_ascii_lowercase();
        let mut res = String::with_capacity(out.len());
        let lower = out.to_ascii_lowercase();
        let mut i = 0;
        while let Some(pos) = lower[i..].find(&needle) {
            res.push_str(&out[i..i + pos]);
            res.push('~');
            i += pos + needle.len();
        }
        res.push_str(&out[i..]);
        out = res;
    }
    out
}

/// 프로그램 시작 때 한 번. 기본 panic 처리(콘솔 출력)는 그대로 두고 파일 기록을 더한다.
pub fn install(app: &'static str, version: &'static str) {
    if APP.set((app, version)).is_err() {
        return;
    }
    let prev = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let msg = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "(unknown panic payload)".into());
        let at = info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column())).unwrap_or_default();
        let thread = std::thread::current().name().unwrap_or("(unnamed)").to_string();
        let bt = std::backtrace::Backtrace::force_capture();
        let text = format!(
            "PortDock crash report\napp: {app} {version}\nos: {} {}\ntime: {}\nthread: {thread}\nmessage: {msg}\nlocation: {at}\n\nbacktrace:\n{bt}\n",
            std::env::consts::OS,
            std::env::consts::ARCH,
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f %z"),
        );
        let text = match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
            Ok(home) => redact_home(&text, &home),
            Err(_) => text,
        };
        // 기록 실패는 무시 — panic 처리 중에 다시 죽으면 안 된다
        let _ = write_crash(&reports_dir(), &text);
        prev(info);
    }));
}

/// 화면이 뜨기 전의 치명적 오류를 기본 메시지 상자로 알린다(윈도우). 다른 OS 는 stderr
pub fn fatal_box(title: &str, text: &str) {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{MB_ICONERROR, MB_OK, MB_SETFOREGROUND, MessageBoxW};
        let wide = |s: &str| s.encode_utf16().chain(std::iter::once(0)).collect::<Vec<u16>>();
        let (t, m) = (wide(title), wide(text));
        // SAFETY: 두 버퍼 모두 NUL 로 끝나고 호출이 끝날 때까지 살아 있다. 부모 창은 없음(null)
        unsafe {
            MessageBoxW(std::ptr::null_mut(), m.as_ptr(), t.as_ptr(), MB_OK | MB_ICONERROR | MB_SETFOREGROUND);
        }
    }
    #[cfg(not(windows))]
    eprintln!("{title}\n\n{text}");
}

pub const WEBVIEW2_URL: &str = "https://developer.microsoft.com/microsoft-edge/webview2/";

/// WebView2 런타임이 없을 때 — 안내 상자를 띄우고 끝낸다(문제 보고는 남기지 않는다).
/// 화면 언어를 아직 모르므로 한국어 다음에 영어를 함께 적는다.
pub fn webview_missing(detail: &str) -> ! {
    let text = format!(
        "이 프로그램을 실행하려면 Microsoft Edge WebView2 Runtime 이 필요합니다.\n\
         Windows 11 에는 기본으로 들어 있습니다. Windows 10 등에서 없다면 아래 주소에서 설치해 주세요.\n\
         인터넷이 안 되는 PC 는 다른 PC 에서 «Evergreen Standalone Installer» 를 받아 옮겨 설치하면 됩니다.\n\n\
         This program needs the Microsoft Edge WebView2 Runtime.\n\
         Windows 11 already includes it. On Windows 10 and others, install it from the address below.\n\
         For an offline PC, download the «Evergreen Standalone Installer» on another PC and install it there.\n\n\
         {WEBVIEW2_URL}\n\n({detail})"
    );
    fatal_box("PortDock — WebView2", &text);
    std::process::exit(1);
}

/// 화면을 띄우지 못했을 때(tauri 시작 실패) — panic 대신 안내 상자를 띄우고 끝낸다
pub fn run_failed(detail: &str) -> ! {
    let text = format!(
        "프로그램 화면을 시작하지 못했습니다.\n\
         WebView2 Runtime 이 설치돼 있는지 확인하고, 계속되면 아래 내용을 개발자에게 알려 주세요.\n\n\
         The program window could not be started.\n\
         Check that the WebView2 Runtime is installed; if this keeps happening, please send the text below to the developer.\n\n\
         {WEBVIEW2_URL}\n\n{detail}"
    );
    fatal_box("PortDock", &text);
    std::process::exit(1);
}

/// 시험용: 환경 변수 PORTDOCK_TEST_CRASH=1 로 켜면 3초 뒤 일부러 죽는다(보고 흐름 확인)
pub fn test_crash_if_asked() {
    if std::env::var("PORTDOCK_TEST_CRASH").as_deref() == Ok("1") {
        std::thread::Builder::new()
            .name("test-crash".into())
            .spawn(|| {
                std::thread::sleep(std::time::Duration::from_secs(3));
                panic!("PORTDOCK_TEST_CRASH: intentional crash for testing the report flow");
            })
            .ok();
    }
}

fn write_crash(dir: &Path, text: &str) -> std::io::Result<PathBuf> {
    fs::create_dir_all(dir)?;
    let name = format!("crash-{}-{}.txt", chrono::Local::now().format("%Y%m%d-%H%M%S%.3f"), std::process::id());
    let path = dir.join(name);
    fs::File::create(&path)?.write_all(text.as_bytes())?;
    prune(dir, KEEP);
    Ok(path)
}

fn crash_files(dir: &Path) -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = fs::read_dir(dir)
        .map(|rd| rd.flatten().map(|e| e.path()).filter(|p| p.file_name().and_then(|n| n.to_str()).is_some_and(valid_name)).collect())
        .unwrap_or_default();
    v.sort(); // 이름에 시각이 들어 있어 이름순 = 시간순
    v
}

fn prune(dir: &Path, keep: usize) {
    let files = crash_files(dir);
    if files.len() > keep {
        for p in &files[..files.len() - keep] {
            let _ = fs::remove_file(p);
        }
    }
}

/// 화면이 넘겨준 이름이 보고 폴더 밖을 가리키지 못하게
fn valid_name(n: &str) -> bool {
    n.starts_with("crash-") && n.ends_with(".txt") && !n.contains(['/', '\\', ':']) && !n.contains("..")
}

#[derive(Debug, Clone, Serialize)]
pub struct CrashReport {
    pub name: String,
    pub text: String,
}

/// 아직 처리하지 않은 보고(오래된 것부터)
pub fn pending() -> Vec<CrashReport> {
    pending_in(&reports_dir())
}

fn pending_in(dir: &Path) -> Vec<CrashReport> {
    crash_files(dir)
        .into_iter()
        .filter_map(|p| {
            let mut text = fs::read_to_string(&p).ok()?;
            if text.len() > MAX_TEXT {
                let mut cut = MAX_TEXT;
                while !text.is_char_boundary(cut) {
                    cut -= 1;
                }
                text.truncate(cut);
                text.push_str("\n…(truncated)");
            }
            Some(CrashReport { name: p.file_name()?.to_string_lossy().into_owned(), text })
        })
        .collect()
}

/// 보냈거나 «보내지 않음» 을 고른 보고를 지운다
pub fn dismiss(name: &str) -> Result<(), String> {
    dismiss_in(&reports_dir(), name)
}

fn dismiss_in(dir: &Path, name: &str) -> Result<(), String> {
    if !valid_name(name) {
        return Err(format!("bad report name: {name}"));
    }
    match fs::remove_file(dir.join(name)) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvInfo {
    pub app: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    pub reports_dir: String,
}

pub fn env_info() -> EnvInfo {
    let (app, version) = APP.get().copied().unwrap_or(("portdock", "?"));
    EnvInfo {
        app: app.into(),
        version: version.into(),
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        reports_dir: reports_dir().display().to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("portdock-report-test-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn write_list_dismiss() {
        let d = tmp("wld");
        let p = write_crash(&d, "boom").unwrap();
        let name = p.file_name().unwrap().to_str().unwrap().to_string();
        let v = pending_in(&d);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].name, name);
        assert_eq!(v[0].text, "boom");
        dismiss_in(&d, &name).unwrap();
        assert!(pending_in(&d).is_empty());
        // 이미 지운 것은 다시 지워도 괜찮다
        dismiss_in(&d, &name).unwrap();
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn rejects_paths_outside() {
        let d = tmp("bad");
        for n in ["../x.txt", "crash-..\\..\\a.txt", "crash-a/b.txt", "C:crash-a.txt", "notes.txt", "crash-a.log"] {
            assert!(dismiss_in(&d, n).is_err(), "{n}");
        }
    }

    #[test]
    fn keeps_newest() {
        let d = tmp("prune");
        fs::create_dir_all(&d).unwrap();
        for i in 0..5 {
            fs::write(d.join(format!("crash-2026010{i}.txt")), "x").unwrap();
        }
        fs::write(d.join("other.txt"), "keep me").unwrap();
        prune(&d, 2);
        let names: Vec<String> = pending_in(&d).into_iter().map(|r| r.name).collect();
        assert_eq!(names, ["crash-20260103.txt", "crash-20260104.txt"]);
        assert!(d.join("other.txt").exists());
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn portable_dir_when_writable_else_local_appdata() {
        let exe = tmp("portable");
        fs::create_dir_all(&exe).unwrap();
        let local = tmp("local");
        assert_eq!(pick_dir(Some(&exe), Some(local.clone()), "tcp"), local.join("dev.portdock.tcp").join("reports"));
        fs::create_dir_all(exe.join("portdock-data")).unwrap();
        assert_eq!(pick_dir(Some(&exe), Some(local.clone()), "tcp"), exe.join("portdock-data").join("reports").join("tcp"));
        // 시험 파일은 남지 않는다
        assert_eq!(fs::read_dir(exe.join("portdock-data")).unwrap().count(), 0);
        let _ = fs::remove_dir_all(&exe);
    }

    #[test]
    fn home_is_redacted() {
        let t = "panicked at C:\\Users\\홍길동\\src\\a.rs and c:/users/홍길동/b.rs";
        assert_eq!(redact_home(t, "C:\\Users\\홍길동"), "panicked at ~\\src\\a.rs and ~/b.rs");
        // 너무 짧은 값은 건드리지 않는다
        assert_eq!(redact_home("C:\\x", "C:"), "C:\\x");
    }

    #[test]
    fn long_text_is_cut_on_char_boundary() {
        let d = tmp("long");
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join("crash-1.txt"), "가".repeat(MAX_TEXT)).unwrap();
        let v = pending_in(&d);
        assert!(v[0].text.ends_with("(truncated)"));
        assert!(v[0].text.len() < MAX_TEXT + 32);
        let _ = fs::remove_dir_all(&d);
    }
}
