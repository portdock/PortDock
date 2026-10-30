//! 여러 PortDock 앱이 함께 보는 «사용 통계» 동의(0.6.0).
//!
//! 한 앱에서 «보내기 / 보내지 않기» 를 고르면 여기에 남기고, 아직 묻지 않은 다른 PortDock 앱은
//! 같은 질문을 다시 띄우지 않고 이 값을 기본으로 쓴다(앱마다 설정에서 따로 바꿀 수 있다 — 바꾼 값도 여기에 남는다).
//! 고르지 않았거나 파일이 없거나 깨졌으면 «묻지 않음·보내지 않음» — 기본은 꺼짐(opt-in).
//!
//! 자리:
//! - 휴대판: 실행 파일 옆 `portdock-data` 폴더가 있고 쓸 수 있으면 `portdock-data\shared-consent.json`
//!   (같은 폴더에 풀어 둔 PortDock 휴대판끼리 함께 본다)
//! - 그 밖(설치판): `%LOCALAPPDATA%\dev.portdock\shared-consent.json`
//!
//! 담는 것은 «물어봤음» 과 «고른 값» 뿐이다(기기·사용자 정보 없음).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const FILE: &str = "shared-consent.json";
const VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Consent {
    /// 어느 PortDock 앱에서든 한 번 물어 답을 골랐다
    pub asked: bool,
    /// 고른 값 — true 일 때만 보낸다
    pub usage_stats: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OnDisk {
    version: u32,
    asked: bool,
    usage_stats: bool,
}

/// 공용 동의 파일 자리
pub fn path() -> PathBuf {
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf));
    let local = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
    pick_path(exe_dir.as_deref(), local)
}

fn pick_path(exe_dir: Option<&Path>, local: Option<PathBuf>) -> PathBuf {
    if let Some(data) = exe_dir.map(|d| d.join("portdock-data"))
        && data.is_dir()
        && crate::report::writable(&data)
    {
        return data.join(FILE);
    }
    local.unwrap_or_else(std::env::temp_dir).join("dev.portdock").join(FILE)
}

/// 남은 동의 — 없거나 읽을 수 없으면 «묻지 않음·보내지 않음»
pub fn read() -> Consent {
    read_at(&path())
}

/// 고른 값을 남긴다(«물어봤음» 도 함께)
pub fn write(usage_stats: bool) -> Result<(), String> {
    write_at(&path(), usage_stats)
}

fn read_at(file: &Path) -> Consent {
    let Ok(text) = fs::read_to_string(file) else {
        return Consent::default();
    };
    match serde_json::from_str::<OnDisk>(&text) {
        // 모르는 판(앞으로 바뀐 모양)은 믿지 않는다 — 다시 묻는 편이 안전하다
        Ok(d) if d.version == VERSION && d.asked => Consent { asked: true, usage_stats: d.usage_stats },
        _ => Consent::default(),
    }
}

fn write_at(file: &Path, usage_stats: bool) -> Result<(), String> {
    if let Some(dir) = file.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    }
    let body = serde_json::to_string_pretty(&OnDisk { version: VERSION, asked: true, usage_stats }).map_err(|e| e.to_string())?;
    // 다른 앱이 반쯤 쓴 파일을 읽지 않게 — 옆에 쓰고 바꿔 끼운다
    let tmp = file.with_extension(format!("json.{}.tmp", std::process::id()));
    fs::write(&tmp, body).map_err(|e| format!("{}: {e}", tmp.display()))?;
    fs::rename(&tmp, file).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("{}: {e}", file.display())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("portdock-consent-test-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn missing_file_means_not_asked_and_off() {
        let d = tmp("missing");
        assert_eq!(read_at(&d.join(FILE)), Consent { asked: false, usage_stats: false });
    }

    #[test]
    fn write_then_read_both_choices() {
        let d = tmp("rw");
        let f = d.join("sub").join(FILE);
        write_at(&f, false).unwrap();
        assert_eq!(read_at(&f), Consent { asked: true, usage_stats: false });
        write_at(&f, true).unwrap();
        assert_eq!(read_at(&f), Consent { asked: true, usage_stats: true });
        // 바꿔 끼운 뒤 임시 파일이 남지 않는다
        let left: Vec<_> = fs::read_dir(f.parent().unwrap()).unwrap().flatten().map(|e| e.file_name()).collect();
        assert_eq!(left, vec![std::ffi::OsString::from(FILE)]);
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn broken_or_odd_files_fall_back_to_off() {
        let d = tmp("broken");
        fs::create_dir_all(&d).unwrap();
        let f = d.join(FILE);
        for body in [
            "",
            "not json",
            r#"{"version":1,"asked":true,"usageStats":"yes"}"#,
            r#"{"version":2,"asked":true,"usageStats":true}"#,
            r#"{"version":1,"asked":false,"usageStats":true}"#,
            r#"{"asked":true,"usageStats":true}"#,
        ] {
            fs::write(&f, body).unwrap();
            assert_eq!(read_at(&f), Consent::default(), "{body}");
        }
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn portable_folder_when_writable_else_local_appdata() {
        let exe = tmp("exe");
        let local = tmp("local");
        fs::create_dir_all(&exe).unwrap();
        assert_eq!(pick_path(Some(&exe), Some(local.clone())), local.join("dev.portdock").join(FILE));
        fs::create_dir_all(exe.join("portdock-data")).unwrap();
        assert_eq!(pick_path(Some(&exe), Some(local.clone())), exe.join("portdock-data").join(FILE));
        let _ = fs::remove_dir_all(&exe);
    }
}
