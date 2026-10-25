//! 백엔드 문구의 언어 — 화면에서 언어를 바꾸면 `set_lang` 으로 알려 준다.
//! 오류·사건 줄 문구는 `tr!(한국어, 영어)` 로 쓴다. 고르지 않은 쪽은 계산하지 않는다.

use std::sync::atomic::{AtomicBool, Ordering};

static EN: AtomicBool = AtomicBool::new(false);

pub fn set_lang(code: &str) {
    EN.store(code.eq_ignore_ascii_case("en"), Ordering::Relaxed);
}

pub fn is_en() -> bool {
    EN.load(Ordering::Relaxed)
}

/// `tr!("한국어", "English")` — 둘 다 같은 타입(&str 또는 String)
#[macro_export]
macro_rules! tr {
    ($ko:expr, $en:expr $(,)?) => {
        if $crate::i18n::is_en() { $en } else { $ko }
    };
}
