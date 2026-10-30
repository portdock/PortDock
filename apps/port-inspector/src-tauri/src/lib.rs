//! PortDock Port Inspector — COM 포트 하나를 기준으로 장치·드라이버·문제 코드·설정·절전·연결 기록·COM 번호 예약을
//! 관리자 권한 없이 읽고(portdock_core::portinfo), TX↔RX 루프백·2선 RS-485 에코를 잰다(portdock_core::loopback).
//! «무선» 탭(0.5.0)은 Wi-Fi·블루투스를 같은 방식으로 읽는다(위치 권한·주변 장치 검색 없이).
//! 읽기 전용 — 레지스트리·장치 설정을 바꾸는 명령은 없다.

use portdock_core::loopback::{self, LoopConfig, LoopEvent};
use portdock_core::portinfo::{self, ComNumbers, EventList, NicList, PcCheck, PortEntry, PortReport, Wireless};
use portdock_core::tr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::State;
use tauri::ipc::Channel;

/// 돌고 있는 연결 시험의 취소 표시
#[derive(Default)]
struct App {
    test: Mutex<Option<Arc<AtomicBool>>>,
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// COM 포트 장치 목록 — hidden 이면 지금 없는 장치도
#[tauri::command(async)]
fn pi_list(hidden: bool) -> Vec<PortEntry> {
    portinfo::list(hidden)
}

/// 포트 하나 읽기(인스턴스 ID 또는 «COM3»)
#[tauri::command(async)]
fn pi_report(id: String) -> Result<PortReport, String> {
    portinfo::report(&id)
}

#[tauri::command(async)]
fn pi_com_numbers() -> ComNumbers {
    portinfo::com_numbers()
}

#[tauri::command(async)]
fn pi_events(instance_id: String, days: u32) -> EventList {
    portinfo::events(&instance_id, days)
}

#[tauri::command(async)]
fn pi_nics() -> NicList {
    portinfo::nics()
}

/// 이 PC 점검 — 장비 PC 로 쓸 때 볼 설정(빠른 시작·절전·업데이트·재시작 대기·시간 동기화)과 최근 days 일 이벤트
#[tauri::command(async)]
fn pi_pc(days: u32) -> PcCheck {
    portinfo::pc(days)
}

/// 무선 점검(0.5.0) — Wi-Fi·블루투스 어댑터·드라이버·절전·서비스와 최근 days 일 끊김·경고 이벤트(위치 권한·주변 검색 없이)
#[tauri::command(async)]
fn pi_wireless(days: u32) -> Wireless {
    portinfo::wireless(days)
}

/// 연결 시험 시작 — 결과는 on_event 로. 하나만 돈다
#[tauri::command(async)]
fn loop_start(app: State<App>, config: LoopConfig, on_event: Channel<LoopEvent>) -> Result<(), String> {
    let cancel = {
        let mut g = lock(&app.test);
        if g.as_ref().is_some_and(|c| !c.load(Ordering::SeqCst)) {
            return Err(tr!("이미 시험 중입니다", "A test is already running").into());
        }
        let c = Arc::new(AtomicBool::new(false));
        *g = Some(c.clone());
        c
    };
    std::thread::spawn(move || {
        loopback::run(&config, &cancel, &mut |e| {
            let _ = on_event.send(e);
        });
        // 끝나면 «돌고 있지 않음» 으로
        cancel.store(true, Ordering::SeqCst);
    });
    Ok(())
}

#[tauri::command]
fn loop_cancel(app: State<App>) {
    if let Some(c) = lock(&app.test).as_ref() {
        c.store(true, Ordering::SeqCst);
    }
}

/// 결과 저장 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 다른 PortDock 프로그램으로 열기(Serial 에 포트 채움) — 못 찾으면 Ok(false)
#[tauri::command(async)]
fn open_app(target: portdock_core::launch::Target) -> Result<bool, String> {
    portdock_core::launch::open(&target)
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

/// 여러 PortDock 앱이 함께 보는 사용 통계 동의(0.6.0) — 아직 묻지 않은 앱은 이 값을 기본으로 쓴다
#[tauri::command]
fn consent_get() -> portdock_core::consent::Consent {
    portdock_core::consent::read()
}

#[tauri::command]
fn consent_set(usage_stats: bool) -> Result<(), String> {
    portdock_core::consent::write(usage_stats)
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
    portdock_core::report::install("port-inspector", env!("CARGO_PKG_VERSION"));
    // 네이티브 크래시 감시 — 감시 프로세스로 불렸으면 여기서 끝난다(화면을 만들지 않는다)
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 창 크기·위치·최대화를 기억한다. 보임·장식·전체 화면은 되살리지 않는다(숨은 창으로 뜨지 않게).
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
            consent_get,
            consent_set,
            report_read_dump,
            pi_list,
            pi_report,
            pi_com_numbers,
            pi_events,
            pi_nics,
            pi_pc,
            pi_wireless,
            loop_start,
            loop_cancel,
            write_text,
            read_text,
            open_app
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
    fn loop_config_shape() {
        let c: LoopConfig = serde_json::from_str(r#"{"port":"COM3","mode":"loopback","bauds":[9600,115200],"bytes":128,"pings":5}"#).unwrap();
        assert_eq!((c.bauds.len(), c.bytes, c.pings), (2, 128, 5));
    }

    /// 화면이 받는 모양 — camelCase
    #[test]
    fn report_shapes() {
        let v = serde_json::to_value(portinfo::com_numbers()).unwrap();
        assert!(v.get("comdbFound").is_some() && v.get("serialcomm").is_some());
        let e = serde_json::to_value(portinfo::events(r"USB\VID_FFFF&PID_FFFF\NOPE", 1)).unwrap();
        assert_eq!(e["days"], 1);
        let p = serde_json::to_value(portinfo::pc(1)).unwrap();
        assert_eq!(p["days"], 1);
        assert!(p.get("fastStartup").is_some() && p.get("rebootPending").is_some() && p["time"].get("type").is_some() && p["screenSaver"].get("program").is_some());
        let w = serde_json::to_value(portinfo::wireless(1)).unwrap();
        assert_eq!(w["days"], 1);
        assert!(w["wifi"].get("powerSaveAc").is_some() && w["wifi"].get("logRead").is_some() && w["bt"].get("services").is_some() && w["bt"].get("audio").is_some());
        // 시험 하나가 끝나야 다음 시험
        let app = App::default();
        *lock(&app.test) = Some(Arc::new(AtomicBool::new(false)));
        assert!(lock(&app.test).as_ref().is_some_and(|c| !c.load(Ordering::SeqCst)));
    }
}
