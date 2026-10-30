//! 장비 레지스터 맵(data/devices, CC BY 4.0) — 실행 파일에 들어 있는 JSON 을 찾고 돌려준다. 바깥에서 받지 않는다.

use serde_json::{Value, json};

include!(concat!(env!("OUT_DIR"), "/devices.rs"));

/// 출처 표시(data/devices/README.md «라이선스»)
pub const ATTRIBUTION: &str = "PortDock device register maps (https://github.com/portdock/PortDock/tree/main/data/devices), CC BY 4.0. Unofficial — check the maker's manual before writing to a device.";

pub fn get(id: &str) -> Option<Value> {
    let id = id.trim().trim_start_matches("portdock://devices/").to_ascii_lowercase();
    DEVICE_FILES.iter().find(|(k, _)| *k == id).and_then(|(_, s)| serde_json::from_str(s).ok())
}

/// 목록 한 줄 — id·제조사·모델·종류·통신 방식·제목(영어)
fn summary(id: &str, v: &Value) -> Value {
    json!({
        "id": id,
        "manufacturer": v["manufacturer"]["en"],
        "model": v["model"],
        "kind": v["kind"],
        "protocols": v["protocols"],
        "title": v["title"]["en"],
        "registers": v["registers"].as_array().map_or(0, Vec::len),
    })
}

/// 찾기 — 낱말이 id·제조사(한·영)·모델·형번·종류·제목에 모두 들어 있는 것(대소문자 무시). 빈 글이면 전부
pub fn search(query: &str) -> Vec<Value> {
    let words: Vec<String> = query.split_whitespace().map(str::to_lowercase).collect();
    DEVICE_FILES
        .iter()
        .filter_map(|(id, s)| {
            let v: Value = serde_json::from_str(s).ok()?;
            let hay = format!("{id} {} {} {} {} {} {} {}", v["manufacturer"]["en"], v["manufacturer"]["ko"], v["model"], v["models"], v["kind"], v["title"]["en"], v["title"]["ko"]).to_lowercase();
            words.iter().all(|w| hay.contains(w)).then(|| summary(id, &v))
        })
        .collect()
}

/// 한 장비의 레지스터만 거르기 — 표(table)·낱말(이름 한·영)
pub fn filter_registers(mut v: Value, table: Option<&str>, query: Option<&str>) -> Value {
    let words: Vec<String> = query.unwrap_or("").split_whitespace().map(str::to_lowercase).collect();
    if let Some(regs) = v.get_mut("registers").and_then(Value::as_array_mut) {
        regs.retain(|r| {
            let t_ok = table.is_none_or(|t| r["table"].as_str() == Some(t));
            let hay = format!("{} {} {}", r["name"]["en"], r["name"]["ko"], r["manualAddress"]).to_lowercase();
            t_ok && words.iter().all(|w| hay.contains(w))
        });
    }
    v
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_maps_embedded_and_parse() {
        // data/devices/<제조사>/<모델>.json 개수(schema.json·README 제외)와 같다
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../data/devices");
        let n = std::fs::read_dir(&root)
            .unwrap()
            .flatten()
            .filter(|e| e.path().is_dir())
            .map(|e| std::fs::read_dir(e.path()).unwrap().flatten().filter(|f| f.path().extension().is_some_and(|x| x == "json")).count())
            .sum::<usize>();
        assert!(n >= 50, "{n}");
        assert_eq!(DEVICE_FILES.len(), n);
        for (id, s) in DEVICE_FILES {
            let v: Value = serde_json::from_str(s).unwrap_or_else(|e| panic!("{id}: {e}"));
            assert_eq!(v["id"].as_str(), Some(*id));
            // 압축 JSON 이 결과 크기 상한 안에 든다
            assert!(v.to_string().len() < crate::guard::MAX_RESULT, "{id}");
        }
    }

    #[test]
    fn search_and_filter() {
        assert_eq!(search("").len(), DEVICE_FILES.len());
        let hits = search("autonics mt4w");
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0]["id"], "autonics/mt4w");
        assert!(search("오토닉스").len() >= 2);
        assert!(search("no-such-device-xyz").is_empty());
        let v = get("portdock://devices/autonics/mt4w").unwrap();
        let all = v["registers"].as_array().unwrap().len();
        let f = filter_registers(v, Some("holding-registers"), None);
        let regs = f["registers"].as_array().unwrap();
        assert!(!regs.is_empty() && regs.len() <= all);
        assert!(regs.iter().all(|r| r["table"] == "holding-registers"));
        assert!(get("nope/nope").is_none());
    }
}
