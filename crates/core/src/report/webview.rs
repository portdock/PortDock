//! WebView2 화면 프로세스가 죽었을 때(흰 화면) — 기록을 남기고 화면을 다시 연다.
//! https://learn.microsoft.com/microsoft-edge/webview2/concepts/process-related-events

use super::{fatal_box, record};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::{ProcessFailedEventHandler, take_pwstr};
use windows::core::{Interface, PWSTR};

/// 같은 사고가 되풀이돼도 보고는 이 간격에 하나만
const THROTTLE: Duration = Duration::from_secs(30);
static LAST: Mutex<Option<Instant>> = Mutex::new(None);

/// 앱의 setup 에서 메인 화면의 컨트롤러로 한 번 부른다(`with_webview` 안 — 화면 스레드).
/// 실패해도 조용히 넘어간다
pub fn watch_webview2(controller: &ICoreWebView2Controller) {
    // SAFETY: 화면 스레드에서 받은 살아 있는 컨트롤러의 COM 호출
    let Ok(wv) = (unsafe { controller.CoreWebView2() }) else { return };
    let handler = ProcessFailedEventHandler::create(Box::new(|sender, args| {
        if let Some(args) = args {
            on_failed(sender, &args);
        }
        Ok(())
    }));
    let mut token = 0i64;
    // SAFETY: 처리기는 WebView2 가 참조를 잡고 있는 동안 살아 있다(COM 참조 계수)
    let _ = unsafe { wv.add_ProcessFailed(&handler, &mut token) };
}

#[derive(PartialEq)]
enum Action {
    /// 화면을 다시 불러온다
    Reload,
    /// 기록만
    Note,
    /// WebView2 전체가 끝났다 — 다시 시작하라고 알리고 끝낸다
    Restart,
}

fn on_failed(sender: Option<ICoreWebView2>, args: &ICoreWebView2ProcessFailedEventArgs) {
    let mut kind = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
    // SAFETY: 이벤트 인자의 COM 호출
    let _ = unsafe { args.ProcessFailedKind(&mut kind) };
    let (action, kind_name) = match kind {
        COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED => (Action::Reload, "render process exited"),
        COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE => (Action::Note, "render process unresponsive"),
        COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED => (Action::Restart, "browser process exited"),
        // GPU·유틸리티 등은 WebView2 가 스스로 다시 띄운다. iframe 은 쓰지 않는다
        _ => return,
    };

    let mut reason = COREWEBVIEW2_PROCESS_FAILED_REASON::default();
    let mut exit_code = 0i32;
    let mut desc = String::new();
    if let Ok(a2) = args.cast::<ICoreWebView2ProcessFailedEventArgs2>() {
        // SAFETY: 이벤트 인자의 COM 호출. 문자열은 take_pwstr 가 해제한다
        unsafe {
            let _ = a2.Reason(&mut reason);
            let _ = a2.ExitCode(&mut exit_code);
            let mut p = PWSTR::null();
            if a2.ProcessDescription(&mut p).is_ok() && !p.is_null() {
                desc = take_pwstr(p);
            }
        }
    }

    if throttle_ok() {
        let message = format!(
            "WebView2 process failed: kind={kind_name}, reason={}, exit code={exit_code} (0x{:08X})",
            reason_name(reason),
            exit_code as u32
        );
        let detail = if desc.is_empty() { String::new() } else { format!("process: {desc}\n") };
        record(&message, &detail);
    }

    match action {
        Action::Reload => {
            if let Some(wv) = sender {
                // SAFETY: 이벤트를 보낸 살아 있는 WebView 의 COM 호출
                let _ = unsafe { wv.Reload() };
            }
        }
        Action::Note => {}
        Action::Restart => {
            fatal_box(
                "PortDock",
                crate::tr!(
                    "화면 엔진(WebView2)이 예기치 않게 끝났습니다. 프로그램을 다시 시작해 주세요.\n기록은 남겨 두었으니 다음에 켤 때 개발자에게 보낼 수 있습니다.",
                    "The display engine (WebView2) stopped unexpectedly. Please restart the program.\nA record was saved; you can send it to the developer next time."
                ),
            );
            std::process::exit(1);
        }
    }
}

/// 마지막 보고에서 THROTTLE 이 지났으면 true(그리고 지금을 기억한다)
fn throttle_ok() -> bool {
    let Ok(mut last) = LAST.lock() else { return true };
    let now = Instant::now();
    if last.is_some_and(|t| now.duration_since(t) < THROTTLE) {
        return false;
    }
    *last = Some(now);
    true
}

fn reason_name(r: COREWEBVIEW2_PROCESS_FAILED_REASON) -> &'static str {
    match r {
        COREWEBVIEW2_PROCESS_FAILED_REASON_UNEXPECTED => "unexpected",
        COREWEBVIEW2_PROCESS_FAILED_REASON_UNRESPONSIVE => "unresponsive",
        COREWEBVIEW2_PROCESS_FAILED_REASON_TERMINATED => "terminated",
        COREWEBVIEW2_PROCESS_FAILED_REASON_CRASHED => "crashed",
        COREWEBVIEW2_PROCESS_FAILED_REASON_LAUNCH_FAILED => "launch failed",
        COREWEBVIEW2_PROCESS_FAILED_REASON_OUT_OF_MEMORY => "out of memory",
        COREWEBVIEW2_PROCESS_FAILED_REASON_PROFILE_DELETED => "profile deleted",
        _ => "other",
    }
}
