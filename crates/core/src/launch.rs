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

// ---------------------------------------------------------------- 다른 PortDock 프로그램 열기(0.3.0)

/// PortDock 프로그램 이름들 — tauri.conf.json productName · release.yml asset · Cargo 패키지(시험이 맞춰 본다)
pub mod apps {
    use super::AppId;
    pub const SERIAL: AppId = AppId { product: "PortDock Serial", asset: "Serial", bin: "portdock-serial" };
    pub const TCP: AppId = AppId { product: "PortDock TCP", asset: "TCP", bin: "portdock-tcp" };
    pub const MODBUS_MASTER: AppId = AppId { product: "PortDock Modbus Master", asset: "Modbus-Master", bin: "portdock-modbus-master" };
    /// PLC Simulator(0.3.x) — 아직 여는 대상(Target)은 없고 이름만 맞춰 둔다(설치 자리·휴대판 exe 이름 찾기에 쓸 때 같은 값)
    pub const PLC_SIMULATOR: AppId = AppId { product: "PortDock PLC Simulator", asset: "PLC-Simulator", bin: "portdock-plc-simulator" };
    /// Hardware Tester(0.4.x) — 아직 여는 대상(Target)은 없고 이름만 맞춰 둔다. 이름 겹침을 피해 늘 «PortDock» 을 붙인다
    pub const HW_TESTER: AppId = AppId { product: "PortDock Hardware Tester", asset: "Hardware-Tester", bin: "portdock-hw-tester" };
}

/// 열 프로그램과 넘길 값 — 화면이 보낸 것(JSON). 글자를 그대로 옮기지 않고 아래 검사를 거친 값으로 인자를 만든다
#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
#[serde(tag = "app", rename_all = "kebab-case")]
pub enum Target {
    /// Modbus Master — TCP(«host[:port]») 또는 RTU(COM) 하나, 속도·국번
    ModbusMaster { tcp: Option<String>, rtu: Option<String>, baud: Option<u32>, unit: Option<u8> },
    /// Serial — 포트·속도
    Serial { port: String, baud: Option<u32> },
    /// TCP 클라이언트 — «host:port»
    Tcp { connect: String },
}

/// «COM3»·«com12» → «COM3»(COM1~COM256). 아니면 None
pub fn com_arg(s: &str) -> Option<String> {
    let t = s.trim();
    if t.len() < 4 || t.len() > 6 || !t.is_char_boundary(3) || !t[..3].eq_ignore_ascii_case("COM") {
        return None;
    }
    let d = &t[3..];
    if !d.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let n: u32 = d.parse().ok()?;
    (1..=256).contains(&n).then(|| format!("COM{n}"))
}

/// 호스트 이름·IPv4 — 글자·숫자·«-»·«.» 만, «-»·«.» 로 시작하지 않음(인자로 오해되지 않게), 253자까지
fn host_ok(h: &str) -> bool {
    !h.is_empty() && h.len() <= 253 && !h.starts_with('-') && !h.starts_with('.') && h.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.')
}

/// «host[:port]» 검사 → «host:port»(포트가 없으면 def). IPv6 는 받지 않는다(받는 쪽 화면 칸이 IPv4·이름)
pub fn host_port_arg(s: &str, def: u16) -> Option<String> {
    let t = s.trim();
    let (h, p) = match t.split_once(':') {
        Some((h, p)) => {
            if p.is_empty() || !p.bytes().all(|b| b.is_ascii_digit()) {
                return None;
            }
            (h, p.parse::<u16>().ok().filter(|&n| n > 0)?)
        }
        None => (t, def),
    };
    // 숫자와 점뿐이면 IPv4 여야 한다
    if h.bytes().all(|b| b.is_ascii_digit() || b == b'.') && h.parse::<std::net::Ipv4Addr>().is_err() {
        return None;
    }
    host_ok(h).then(|| format!("{h}:{p}"))
}

const BAUD: std::ops::RangeInclusive<u32> = 50..=20_000_000;

fn bad(what: &str, v: &str) -> String {
    format!("{}: «{what} {v}»", crate::tr!("넘길 값이 잘못되었습니다", "Invalid value to pass"))
}

fn baud_ok(b: Option<u32>) -> Result<Option<u32>, String> {
    match b {
        Some(n) if !BAUD.contains(&n) => Err(bad("--baud", &n.to_string())),
        _ => Ok(b),
    }
}

/// 열 프로그램과 인자(검사한 값으로만 만든다)
pub fn target_args(t: &Target) -> Result<(AppId, Vec<String>), String> {
    match t {
        Target::ModbusMaster { tcp, rtu, baud, unit } => {
            let mut a = Vec::new();
            match (tcp, rtu) {
                (Some(h), None) => a.extend(["--tcp".to_string(), host_port_arg(h, 502).ok_or_else(|| bad("--tcp", h))?]),
                (None, Some(c)) => a.extend(["--rtu".to_string(), com_arg(c).ok_or_else(|| bad("--rtu", c))?]),
                _ => return Err(bad("--tcp/--rtu", "?")),
            }
            if let Some(b) = baud_ok(*baud)? {
                a.extend(["--baud".to_string(), b.to_string()]);
            }
            if let Some(u) = unit {
                if rtu.is_some() && *u == 0 {
                    return Err(bad("--unit", "0"));
                }
                a.extend(["--unit".to_string(), u.to_string()]);
            }
            Ok((apps::MODBUS_MASTER, a))
        }
        Target::Serial { port, baud } => {
            let mut a = vec!["--port".to_string(), com_arg(port).ok_or_else(|| bad("--port", port))?];
            if let Some(b) = baud_ok(*baud)? {
                a.extend(["--baud".to_string(), b.to_string()]);
            }
            Ok((apps::SERIAL, a))
        }
        Target::Tcp { connect } => Ok((apps::TCP, vec!["--connect".to_string(), host_port_arg(connect, 502).ok_or_else(|| bad("--connect", connect))?])),
    }
}

/// 다른 PortDock 프로그램을 인자와 함께 연다. 셸을 거치지 않는다. 못 찾으면 Ok(false) — 화면이 복사·내려받기 안내를 한다
pub fn open(t: &Target) -> Result<bool, String> {
    let (id, args) = target_args(t)?;
    let Some(exe) = find_app(&id) else { return Ok(false) };
    spawn(&exe, &args)?;
    Ok(true)
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
    #[test]
    fn target_args_checked() {
        let mm = |tcp: Option<&str>, rtu: Option<&str>, baud, unit| Target::ModbusMaster { tcp: tcp.map(String::from), rtu: rtu.map(String::from), baud, unit };
        assert_eq!(target_args(&mm(Some("192.168.0.10"), None, None, Some(1))).unwrap().1, ["--tcp", "192.168.0.10:502", "--unit", "1"]);
        assert_eq!(target_args(&mm(Some("plc-1.local:1502"), None, None, None)).unwrap().1, ["--tcp", "plc-1.local:1502"]);
        assert_eq!(target_args(&mm(None, Some("com3"), Some(19200), Some(5))).unwrap().1, ["--rtu", "COM3", "--baud", "19200", "--unit", "5"]);
        assert_eq!(target_args(&mm(None, Some("COM3"), None, None)).unwrap().0.product, "PortDock Modbus Master");
        // 둘 다·둘 다 없음·이상한 값
        assert!(target_args(&mm(Some("1.2.3.4"), Some("COM1"), None, None)).is_err());
        assert!(target_args(&mm(None, None, None, None)).is_err());
        assert!(target_args(&mm(None, Some("COM1"), None, Some(0))).is_err());
        assert!(target_args(&mm(None, Some("COM1"), Some(10), None)).is_err());
        for h in ["1.2.3.999", "a b", "-x", "h:0", "h:70000", "h:+5", "1.2.3.4&calc", "\"h\"", "fe80::1", "", "h:", "콤"] {
            assert!(target_args(&mm(Some(h), None, None, None)).is_err(), "{h}");
        }
        let s = Target::Serial { port: "COM12".into(), baud: Some(115200) };
        let (id, a) = target_args(&s).unwrap();
        assert_eq!(id.product, "PortDock Serial");
        assert_eq!(a, ["--port", "COM12", "--baud", "115200"]);
        for p in ["COM0", "COM257", "LPT1", "COM1 --x", "/dev/ttyS0", "콤12"] {
            assert!(target_args(&Target::Serial { port: p.into(), baud: None }).is_err(), "{p}");
        }
        assert_eq!(target_args(&Target::Tcp { connect: "10.0.0.5:5000".into() }).unwrap().1, ["--connect", "10.0.0.5:5000"]);
        assert!(target_args(&Target::Tcp { connect: "--connect".into() }).is_err());
    }

    #[test]
    fn target_from_screen_json() {
        let t: Target = serde_json::from_str(r#"{"app":"modbus-master","tcp":"10.0.0.5:502","unit":3}"#).unwrap();
        assert_eq!(t, Target::ModbusMaster { tcp: Some("10.0.0.5:502".into()), rtu: None, baud: None, unit: Some(3) });
        let t: Target = serde_json::from_str(r#"{"app":"serial","port":"COM3"}"#).unwrap();
        assert_eq!(t, Target::Serial { port: "COM3".into(), baud: None });
        assert!(serde_json::from_str::<Target>(r#"{"app":"calc","x":1}"#).is_err());
    }

    /// 찾을 이름이 각 프로그램의 실제 설정과 같은지 — 이름을 바꾸면 여기가 먼저 깨진다
    #[test]
    fn app_names_match_configs() {
        let release = include_str!("../../../.github/workflows/release.yml");
        let check = |id: AppId, dir: &str, conf: &str, cargo: &str| {
            assert!(conf.contains(&format!("\"productName\": \"{}\"", id.product)), "{dir}");
            assert!(cargo.contains(&format!("name = \"{}\"", id.bin)), "{dir}");
            assert!(release.contains(&format!("{{ app: {dir}, asset: {} }}", id.asset)), "{dir}");
            // 설치판은 사용자 범위(%LOCALAPPDATA%\<productName>) — find_app 의 기본 자리
            assert!(conf.contains("\"installMode\": \"currentUser\""), "{dir}");
        };
        check(apps::SERIAL, "serial", include_str!("../../../apps/serial/src-tauri/tauri.conf.json"), include_str!("../../../apps/serial/src-tauri/Cargo.toml"));
        check(apps::TCP, "tcp", include_str!("../../../apps/tcp/src-tauri/tauri.conf.json"), include_str!("../../../apps/tcp/src-tauri/Cargo.toml"));
        check(apps::MODBUS_MASTER, "modbus-master", include_str!("../../../apps/modbus-master/src-tauri/tauri.conf.json"), include_str!("../../../apps/modbus-master/src-tauri/Cargo.toml"));
        check(apps::PLC_SIMULATOR, "plc-simulator", include_str!("../../../apps/plc-simulator/src-tauri/tauri.conf.json"), include_str!("../../../apps/plc-simulator/src-tauri/Cargo.toml"));
        check(apps::HW_TESTER, "hw-tester", include_str!("../../../apps/hw-tester/src-tauri/tauri.conf.json"), include_str!("../../../apps/hw-tester/src-tauri/Cargo.toml"));
    }
}
