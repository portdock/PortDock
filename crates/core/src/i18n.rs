//! 백엔드 문구의 언어 — 화면에서 언어를 바꾸면 `set_lang` 으로 알려 준다.
//! 오류·사건 줄 문구는 `tr!(한국어, 영어)` 로 쓴다. 고르지 않은 쪽은 계산하지 않는다.
//! 화면 언어가 한국어가 아니면(en·ja 등, 0.11.0) 백엔드 문구는 영어.

use std::sync::atomic::{AtomicBool, Ordering};

static EN: AtomicBool = AtomicBool::new(false);

pub fn set_lang(code: &str) {
    EN.store(!is_korean(code), Ordering::Relaxed);
}

/// «ko»·«ko-KR» 만 한국어 — 나머지 언어 코드는 영어로
fn is_korean(code: &str) -> bool {
    let mut parts = code.split(['-', '_']);
    parts.next().is_some_and(|p| p.eq_ignore_ascii_case("ko"))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn non_korean_codes_fall_back_to_english() {
        // 전역 값을 바꾸지 않는다(다른 시험과 함께 돌므로)
        for (code, ko) in [("ko", true), ("KO", true), ("ko-KR", true), ("en", false), ("ja", false), ("ja-JP", false), ("de", false), ("kor", false), ("", false)] {
            assert_eq!(is_korean(code), ko, "{code}");
        }
    }
}
