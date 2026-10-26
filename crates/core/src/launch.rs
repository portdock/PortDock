//! 명령줄 인자와 다른 PortDock 프로그램 열기(0.2.0).
//!
//! - [`take_args`]: 이 프로그램이 받은 인자(실행 파일 이름 뺀 것)를 화면에 한 번 넘긴다. 뜻 풀이는 화면(TS)이 한다 —
//!   잘못된 인자는 무시하고 화면이 한 줄로 알린다. 셸을 거치지 않고 운영체제가 나눈 그대로다.
//! - [`find_app`]·[`spawn`]: Net Scan → Modbus Master 처럼 다른 PortDock 프로그램을 찾아 인자와 함께 연다.
//!   셸을 거치지 않는다(`Command` 가 인자를 따로 넘긴다). 인자는 부르는 쪽이 검사한 값(IP·숫자)만 넣는다.

use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

/// 화면에 넘길 인자 수·길이 한도 — 이보다 많거나 긴 것은 버린다(화면이 «무시» 로 알릴 일도 없는 쓰레기)
const MAX_ARGS: usize = 32;
const MAX_LEN: usize = 256;

static TAKEN: AtomicBool = AtomicBool::new(false);

/// 실행 파일 이름 뺀 인자 → 화면용 글자 목록(한도 안, 유니코드가 아니면 대체 문자)
pub fn clean_args<I: IntoIterator<Item = OsString>>(args: I) -> Vec<String> {
    args.into_iter().skip(1).take(MAX_ARGS).map(|a| a.to_string_lossy().into_owned()).filter(|a| a.len() <= MAX_LEN).collect()
}

/// 이 프로세스가 받은 인자 — 처음 한 번만 준다(화면이 다시 읽혀도(WebView2 다시 열기) 설정을 또 덮지 않게)
pub fn take_args() -> Vec<String> {
    if TAKEN.swap(true, Ordering::SeqCst) {
        return Vec::new();
    }
    clean_args(std::env::args_os())
}

/// 찾을 PortDock 프로그램 — tauri.conf.json·release.yml 의 이름들
#[derive(Debug, Clone, Copy)]
pub struct AppId {
    /// tauri.conf.json productName — 설치 폴더(`%LOCALAPPDATA%\<productName>`)·제거 키 이름
    pub product: &'static str,
    /// release.yml matrix asset — 휴대판 exe 이름 `PortDock <asset>.exe`
    pub asset: &'static str,
    /// Cargo 패키지 이름 — cargo 가 만든 exe 이름(개발 빌드·설치판)
    pub bin: &'static str,
}

impl AppId {
    /// 한 폴더에서 찾을 exe 이름들(휴대판 → cargo → productName 순)
    pub fn exe_names(&self) -> [String; 3] {
        [format!("PortDock {}.exe", self.asset), format!("{}.exe", self.bin), format!("{}.exe", self.product)]
    }
}

/// 레지스트리 경로 값 다듬기 — 따옴표(«"C:\x\a.exe"»)와 아이콘 번호(«,0»)를 뗀다
pub fn reg_path(raw: &str) -> Option<PathBuf> {
    let mut s = raw.trim();
    if let Some(rest) = s.strip_prefix('"') {
        s = rest.split('"').next().unwrap_or("");
    } else if let Some((head, tail)) = s.rsplit_once(',')
        && tail.trim().parse::<i32>().is_ok()
    {
        s = head;
    }
    let s = s.trim();
    (!s.is_empty()).then(|| PathBuf::from(s))
}

/// 찾을 곳 — 순서대로 처음 있는 파일을 쓴다
/// 1. 이 프로그램 exe 와 같은 폴더(휴대판을 한 폴더에 풀었을 때·개발 빌드 target\debug)
/// 2. 설치판 제거 키(HKCU)의 DisplayIcon(exe 경로), InstallLocation 폴더
/// 3. exe 폴더의 형제 중 이름이 PortDock 으로 시작하는 폴더(휴대판 zip 을 따로 풀었을 때 — «PortDock-Modbus-Master-portable»,
///    이 프로그램이 설치판이면 %LOCALAPPDATA% 의 «PortDock Modbus Master»)
/// 4. 설치판 기본 자리 `%LOCALAPPDATA%\<productName>`(NSIS currentUser)
pub fn candidates(id: &AppId, exe_dir: Option<&Path>, reg_icon: Option<&str>, reg_loc: Option<&str>, siblings: &[PathBuf], local: Option<&Path>) -> Vec<PathBuf> {
    let names = id.exe_names();
    let mut out = Vec::new();
    let in_dir = |d: &Path, out: &mut Vec<PathBuf>| out.extend(names.iter().map(|n| d.join(n)));
    if let Some(d) = exe_dir {
        in_dir(d, &mut out);
    }
    if let Some(p) = reg_icon.and_then(reg_path)
        && p.extension().is_some_and(|e| e.eq_ignore_ascii_case("exe"))
    {
        out.push(p);
    }
    if let Some(d) = reg_loc.and_then(reg_path) {
        in_dir(&d, &mut out);
    }
    for d in siblings {
        in_dir(d, &mut out);
    }
    if let Some(l) = local {
        in_dir(&l.join(id.product), &mut out);
    }
    let mut seen = std::collections::HashSet::new();
    out.retain(|p| seen.insert(p.to_string_lossy().to_lowercase().replace('/', "\\")));
    out
}

/// exe 폴더의 형제 폴더 중 «PortDock» 으로 시작하는 것(자기 폴더 빼고, 64개까지)
pub fn portdock_siblings(exe_dir: &Path) -> Vec<PathBuf> {
    let Some(parent) = exe_dir.parent() else { return Vec::new() };
    let Ok(rd) = std::fs::read_dir(parent) else { return Vec::new() };
    let mut v: Vec<PathBuf> = rd
        .flatten()
        .filter(|e| e.file_type().is_ok_and(|t| t.is_dir()))
        .filter(|e| e.file_name().to_string_lossy().to_lowercase().starts_with("portdock"))
        .map(|e| e.path())
        .filter(|p| p != exe_dir)
        .take(64)
        .collect();
    v.sort();
    v
}

/// 이 PC 에서 그 프로그램 exe 를 찾는다. 없으면 None
pub fn find_app(id: &AppId) -> Option<PathBuf> {
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf));
    let key = format!(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\{}", id.product);
    let icon = reg_hkcu(&key, "DisplayIcon");
    let loc = reg_hkcu(&key, "InstallLocation");
    let siblings = exe_dir.as_deref().map(portdock_siblings).unwrap_or_default();
    let local = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
    candidates(id, exe_dir.as_deref(), icon.as_deref(), loc.as_deref(), &siblings, local.as_deref()).into_iter().find(|p| p.is_file())
}

/// 셸 없이 띄운다 — 기다리지 않는다. 표준 입출력은 넘기지 않는다
pub fn spawn(exe: &Path, args: &[String]) -> Result<(), String> {
    let mut c = std::process::Command::new(exe);
    c.args(args).env_remove("PORTDOCK_TEST_CRASH").stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null());
    if let Some(d) = exe.parent() {
        c.current_dir(d);
    }
    c.spawn().map(|_| ()).map_err(|e| format!("{}: {e}", exe.display()))
}

/// HKCU 아래 문자열 값(REG_EXPAND_SZ 는 RegGetValueW 가 펼쳐 준다). 없으면 None
#[cfg(windows)]
fn reg_hkcu(key: &str, name: &str) -> Option<String> {
    use windows_sys::Win32::Foundation::ERROR_SUCCESS;
    use windows_sys::Win32::System::Registry::{HKEY_CURRENT_USER, RRF_RT_REG_SZ, RegGetValueW};
    let wide = |s: &str| s.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
    let (k, n) = (wide(key), wide(name));
    let mut size = 0u32;
    // SAFETY: 크기만 묻는다(읽기)
    let r = unsafe { RegGetValueW(HKEY_CURRENT_USER, k.as_ptr(), n.as_ptr(), RRF_RT_REG_SZ, std::ptr::null_mut(), std::ptr::null_mut(), &mut size) };
    if r != ERROR_SUCCESS || size == 0 || size > 64 * 1024 {
        return None;
    }
    let mut buf = vec![0u16; (size as usize).div_ceil(2) + 1];
    let mut bytes = (buf.len() * 2) as u32;
    // SAFETY: buf 는 bytes 바이트
    let r = unsafe { RegGetValueW(HKEY_CURRENT_USER, k.as_ptr(), n.as_ptr(), RRF_RT_REG_SZ, std::ptr::null_mut(), buf.as_mut_ptr().cast(), &mut bytes) };
    if r != ERROR_SUCCESS {
        return None;
    }
    let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    Some(String::from_utf16_lossy(&buf[..end]))
}

#[cfg(not(windows))]
fn reg_hkcu(_key: &str, _name: &str) -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    const MM: AppId = AppId { product: "PortDock Modbus Master", asset: "Modbus-Master", bin: "portdock-modbus-master" };

    #[test]
    fn args_cleaned() {
        let a = clean_args(["x.exe", "--tcp", "10.0.0.1:502", &"y".repeat(300), "--unit", "1"].map(OsString::from));
        assert_eq!(a, ["--tcp", "10.0.0.1:502", "--unit", "1"]);
        assert!(clean_args(std::iter::repeat_n(OsString::from("a"), 100)).len() <= MAX_ARGS);
        assert!(clean_args(Vec::<OsString>::new()).is_empty());
    }

    #[test]
    fn reg_paths() {
        assert_eq!(reg_path(r#""C:\P\PortDock Modbus Master\portdock-modbus-master.exe""#), Some(PathBuf::from(r"C:\P\PortDock Modbus Master\portdock-modbus-master.exe")));
        assert_eq!(reg_path(r#""C:\P\a.exe",0"#), Some(PathBuf::from(r"C:\P\a.exe")));
        assert_eq!(reg_path(r"C:\P\a.exe,0"), Some(PathBuf::from(r"C:\P\a.exe")));
        assert_eq!(reg_path(r#""C:\P\x""#), Some(PathBuf::from(r"C:\P\x")));
        assert_eq!(reg_path("  "), None);
        assert_eq!(reg_path(r#""""#), None);
    }

    #[test]
    fn candidate_order() {
        let exe = PathBuf::from("E");
        let sib = [PathBuf::from("S")];
        let c = candidates(&MM, Some(&exe), Some(r#""R\m.exe""#), Some(r#""R""#), &sib, Some(Path::new("L")));
        let s: Vec<String> = c.iter().map(|p| p.to_string_lossy().replace('\\', "/")).collect();
        assert_eq!(s[0], "E/PortDock Modbus-Master.exe");
        assert_eq!(s[1], "E/portdock-modbus-master.exe");
        assert_eq!(s[2], "E/PortDock Modbus Master.exe");
        assert_eq!(s[3], "R/m.exe");
        assert_eq!(s[4], "R/PortDock Modbus-Master.exe");
        assert_eq!(s[7], "S/PortDock Modbus-Master.exe");
        assert_eq!(s.last().map(String::as_str), Some("L/PortDock Modbus Master/PortDock Modbus Master.exe"));
        // DisplayIcon 이 .exe 가 아니면(아이콘 파일) 쓰지 않는다
        assert!(!candidates(&MM, None, Some(r"R\i.ico"), None, &[], None).iter().any(|p| p.ends_with("i.ico")));
        // 같은 경로는 한 번만(대소문자 무시)
        let d = candidates(&MM, Some(Path::new("L/PortDock Modbus Master")), None, None, &[], Some(Path::new("l")));
        assert_eq!(d.len(), 3);
    }

    #[test]
    fn siblings_and_find_first() {
        let root = std::env::temp_dir().join(format!("portdock-launch-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let me = root.join("PortDock-Net-Scan-portable");
        let other = root.join("PortDock-Modbus-Master-portable");
        std::fs::create_dir_all(&me).unwrap();
        std::fs::create_dir_all(&other).unwrap();
        std::fs::create_dir_all(root.join("Other")).unwrap();
        std::fs::write(other.join("PortDock Modbus-Master.exe"), b"").unwrap();
        let sib = portdock_siblings(&me);
        assert_eq!(sib, vec![other.clone()]);
        let found = candidates(&MM, Some(&me), None, None, &sib, None).into_iter().find(|p| p.is_file());
        assert_eq!(found, Some(other.join("PortDock Modbus-Master.exe")));
        let _ = std::fs::remove_dir_all(&root);
    }
}
