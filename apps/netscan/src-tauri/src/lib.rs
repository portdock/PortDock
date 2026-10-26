//! PortDock Net Scan — 산업 네트워크에서 장비 IP 찾기(핑·ARP), MAC 제조사, 산업 포트 판정, Modbus 장비 정보, 장기 핑, WoL.
//! 관리자 권한·드라이버 없이. 범용 포트 스캔은 하지 않는다(정해 둔 산업 포트만).

pub mod modbus_id;
pub mod monitor;
pub mod oui;
pub mod range;
pub mod scan;
pub mod wol;
pub mod win;

use portdock_core::launch;
use portdock_core::tr;
use std::net::Ipv4Addr;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;
use tauri::ipc::Channel;

#[derive(Default)]
struct App {
    scan: Mutex<Option<scan::Scan>>,
    monitor: Mutex<Option<monitor::Monitor>>,
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

fn parse_ip(s: &str) -> Result<Ipv4Addr, String> {
    s.trim().parse::<Ipv4Addr>().map_err(|_| format!("{}: «{}»", tr!("IP 주소가 아닙니다", "Not an IP address"), s.trim()))
}

/// 이 PC 의 랜카드(IPv4 가 있는 것)
#[tauri::command(async)]
fn list_nics() -> Result<Vec<win::Nic>, String> {
    win::list_nics()
}

/// 범위 미리보기 — 몇 대인지·처음·끝, 상한 넘음
#[tauri::command]
fn range_info(text: String) -> Result<range::RangeInfo, String> {
    range::info(&text)
}

#[tauri::command(async)]
fn scan_start(app: State<App>, config: scan::ScanConfig, on_event: Channel<scan::ScanEvent>) -> Result<u32, String> {
    let mut g = lock(&app.scan);
    if g.as_ref().is_some_and(|s| s.running()) {
        return Err(tr!("이미 찾는 중입니다", "A scan is already running").into());
    }
    let (s, total) = scan::start(
        config,
        Arc::new(move |e| {
            let _ = on_event.send(e);
        }),
    )?;
    *g = Some(s);
    Ok(total)
}

/// 멈춤 — 하던 주소까지만 하고 Done(cancelled) 을 보낸다
#[tauri::command]
fn scan_cancel(app: State<App>) {
    if let Some(s) = lock(&app.scan).as_ref() {
        s.cancel();
    }
}

/// 502 가 열린 장비에 Modbus 장비 정보(FC 2B/0E) 묻기 — 유닛 1, 안 되면 255
#[tauri::command(async)]
fn modbus_ident(ip: String, port: Option<u16>) -> Result<modbus_id::Ident, String> {
    let ip = parse_ip(&ip)?;
    modbus_id::ident((ip, port.unwrap_or(502)).into(), Duration::from_millis(1500))
}

/// Wake-on-LAN — nic_ip 랜카드로(그 대역 브로드캐스트 + 255.255.255.255)
#[tauri::command(async)]
fn wake(mac: String, nic_ip: Option<String>, prefix: Option<u8>) -> Result<Vec<String>, String> {
    let m = oui::parse_mac(&mac).ok_or_else(|| format!("{}: «{mac}»", tr!("MAC 주소 형식이 아닙니다", "Not a MAC address")))?;
    let src = match nic_ip.as_deref().filter(|s| !s.trim().is_empty()) {
        Some(s) => Some(parse_ip(s)?),
        None => None,
    };
    let directed = src.map(|ip| range::broadcast_of(ip, prefix.unwrap_or(24).min(32)));
    wol::send(&m, src, directed)
}

/// 장비 웹 페이지 열기 — IP 를 확인한 http/https 주소만(opener 권한을 넓히지 않는다)
#[tauri::command]
fn open_web(ip: String, port: Option<u16>, https: bool) -> Result<(), String> {
    let ip = parse_ip(&ip)?;
    let scheme = if https { "https" } else { "http" };
    let url = match port {
        Some(p) if !((p == 80 && !https) || (p == 443 && https)) => format!("{scheme}://{ip}:{p}/"),
        _ => format!("{scheme}://{ip}/"),
    };
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// 찾은 장비를 Modbus Master 로 연다(0.2.0) — «--tcp IP:포트 --unit n», 연결은 Master 에서 사용자가 누른다.
/// 인자는 core launch 가 확인한 값으로만 만들고 셸을 거치지 않는다. 못 찾으면 Ok(false) — 화면이 «IP:502» 복사·내려받기 안내를 한다
#[tauri::command(async)]
fn open_master(ip: String, port: Option<u16>, unit: Option<u8>) -> Result<bool, String> {
    let ip = parse_ip(&ip)?;
    let port = port.unwrap_or(502);
    if port == 0 {
        return Err(tr!("포트는 1~65535 입니다", "Port must be 1–65535").into());
    }
    launch::open(&master_target(ip, port, unit.unwrap_or(1)))
}

/// Modbus Master 로 넘길 대상 — 확인한 IP·숫자로만 만든다(글자를 그대로 옮기지 않는다)
fn master_target(ip: Ipv4Addr, port: u16, unit: u8) -> launch::Target {
    launch::Target::ModbusMaster { tcp: Some(format!("{ip}:{port}")), rtu: None, baud: None, unit: Some(unit) }
}

/// 다른 PortDock 프로그램으로 열기(0.3.0) — 화면은 «TCP 로 열기»(--connect IP:포트)에 쓴다. 값 검사·찾기·띄우기는 core
#[tauri::command(async)]
fn open_app(target: launch::Target) -> Result<bool, String> {
    launch::open(&target)
}

#[tauri::command(async)]
fn monitor_start(app: State<App>, config: monitor::MonitorConfig, log_path: Option<String>, on_event: Channel<monitor::MonitorEvent>) -> Result<Vec<monitor::Target>, String> {
    let mut g = lock(&app.monitor);
    if let Some(mut old) = g.take() {
        old.stop();
    }
    let (m, targets) = monitor::start(
        config,
        Arc::new(move |e| {
            let _ = on_event.send(e);
        }),
    )?;
    if let Some(p) = log_path {
        // 기록 파일을 못 열면 감시도 시작하지 않는다(나중에 «기록이 없었다» 를 알게 되지 않게)
        m.set_log(Some(p))?;
    }
    *g = Some(m);
    Ok(targets)
}

#[tauri::command(async)]
fn monitor_stop(app: State<App>) {
    if let Some(mut m) = lock(&app.monitor).take() {
        m.stop();
    }
}

/// 감시 중 CSV 기록 켜기·끄기
#[tauri::command(async)]
fn monitor_set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    match lock(&app.monitor).as_ref() {
        Some(m) => m.set_log(path),
        None => Err(tr!("감시 중이 아닙니다", "Monitor is not running").into()),
    }
}

/// 결과 CSV·설정 내보내기 — 화면은 저장 대화상자에서 고른 경로만 넘긴다
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 설정 가져오기 — 화면은 열기 대화상자에서 고른 경로만 넘긴다
#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 화면 언어를 백엔드 문구(오류)에도 적용
#[tauri::command]
fn set_lang(lang: String) {
    portdock_core::i18n::set_lang(&lang);
}

/// 문제 보고 — 지난번에 죽으며 남긴 기록(보낼지는 화면에서 사용자가 정한다)
#[tauri::command]
fn report_pending() -> Vec<portdock_core::report::CrashReport> {
    portdock_core::report::pending()
}

#[tauri::command]
fn report_dismiss(name: String) -> Result<(), String> {
    portdock_core::report::dismiss(&name)
}

#[tauri::command]
fn report_env() -> portdock_core::report::EnvInfo {
    portdock_core::report::env_info()
}

/// 네이티브 크래시의 minidump 내용 — 화면이 Sentry 로 올릴 때(이름은 report_pending 이 준 것만)
#[tauri::command(async)]
fn report_read_dump(name: String) -> Result<tauri::ipc::Response, String> {
    portdock_core::report::read_dump(&name).map(tauri::ipc::Response::new)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebView2 가 없으면 화면이 뜨지 않는다 — 문제 보고 대신 설치 안내를 띄우고 끝낸다
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("netscan", env!("CARGO_PKG_VERSION"));
    // 네이티브 크래시 감시 — 감시 프로세스로 불렸으면 여기서 끝난다(화면을 만들지 않는다)
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 창 크기·위치·최대화를 기억한다. 보임·장식·전체 화면은 되살리지 않는다(숨은 창으로 뜨지 않게).
        // 위치는 저장된 자리가 지금 있는 모니터에 걸칠 때만 되살린다 — 아니면 OS 가 정한다(플러그인 동작)
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build(),
        )
        .setup(|app| {
            // WebView2 화면 프로세스가 죽으면(흰 화면) 기록하고 다시 연다
            #[cfg(windows)]
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                let _ = w.with_webview(|wv| portdock_core::report::watch_webview2(&wv.controller()));
            }
            // 켤 때 흰 화면 없이(0.3.0) — 창은 숨긴 채 만들고(tauri.conf.json visible false) 화면이 첫 그림 뒤 보인다(shared/windowShow.ts).
            // 화면이 끝내 부르지 못하면(스크립트 오류 등) 4초 뒤 여기서 보인다 — 창이 안 뜨는 일이 없게
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(4));
                    if !w.is_visible().unwrap_or(true) {
                        let _ = w.show();
                    }
                });
            }
            Ok(())
        })
        .manage(App::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            report_pending,
            report_dismiss,
            report_env,
            report_read_dump,
            list_nics,
            range_info,
            scan_start,
            scan_cancel,
            modbus_ident,
            wake,
            open_web,
            open_master,
            open_app,
            monitor_start,
            monitor_stop,
            monitor_set_log,
            write_text,
            read_text
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn master_target_from_checked_values() {
        let (_, args) = launch::target_args(&master_target(Ipv4Addr::new(192, 168, 0, 10), 502, 1)).unwrap();
        assert_eq!(args, ["--tcp", "192.168.0.10:502", "--unit", "1"]);
        let (_, args) = launch::target_args(&master_target(Ipv4Addr::new(10, 0, 0, 5), 1502, 255)).unwrap();
        assert_eq!(args, ["--tcp", "10.0.0.5:1502", "--unit", "255"]);
        // 글자로 들어온 IP 는 parse_ip 를 거친다 — 따옴표·공백·명령 글자는 여기서 막힌다
        for bad in ["192.168.0.10 --unit 9", "\"1.2.3.4\"", "1.2.3.4&calc", "", "host"] {
            assert!(parse_ip(bad).is_err(), "{bad}");
        }
        assert!(open_master("1.2.3.4".into(), Some(0), None).is_err());
    }

    /// 화면의 «TCP 로 열기» 가 보내는 모양 그대로 — core 가 --connect 로 바꾼다
    #[test]
    fn tcp_target_from_screen_json() {
        let t: launch::Target = serde_json::from_str(r#"{"app":"tcp","connect":"192.168.0.10:5001"}"#).unwrap();
        let (_, args) = launch::target_args(&t).unwrap();
        assert_eq!(args, ["--connect", "192.168.0.10:5001"]);
    }
}
