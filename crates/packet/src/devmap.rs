//! 장비 맵(`data/devices/*.json`)으로 레지스터 주소 → 이름·단위·배율.
//!
//! 엔진은 `RegisterNamer` 인터페이스만 안다. 이 파일은 그것을 장비 맵 JSON 으로 채우는 구현(`DeviceMap`)이다.
//! 한 번에 장비 하나를 고른다(국번 ↔ 장비 연결은 화면이 정한다 — 이 단계는 인터페이스와 JSON 읽기까지).

use std::collections::HashMap;
use std::path::Path;

use serde::Deserialize;

use crate::industrial::modbus::Space;

#[derive(Clone, Debug, PartialEq)]
pub struct RegDesc {
    pub name_ko: String,
    pub name_en: String,
    pub unit: String,
    pub scale: f64,
    /// u16·s16·u32·s32·f32·f64·bit·string
    pub ty: String,
    /// 이 항목이 차지하는 레지스터 수
    pub words: u32,
    /// 32비트 이상 값의 워드 순서(«ABCD» 이면 높은 워드 먼저)
    pub order: String,
}

pub trait RegisterNamer {
    /// 주소(0 기준) 하나가 가리키는 항목. 없으면 None
    fn describe(&self, space: Space, address: u32) -> Option<RegDesc>;
}

#[derive(Deserialize)]
struct Text {
    ko: Option<String>,
    en: Option<String>,
}

#[derive(Deserialize)]
struct RawReg {
    table: String,
    address: u32,
    #[serde(rename = "type")]
    ty: String,
    name: Text,
    unit: Option<String>,
    scale: Option<f64>,
    order: Option<String>,
    len: Option<u32>,
}

#[derive(Deserialize)]
struct RawDev {
    id: String,
    model: String,
    registers: Vec<RawReg>,
}

/// 장비 하나의 맵
pub struct DeviceMap {
    pub id: String,
    pub model: String,
    by: HashMap<(u8, u32), RegDesc>,
}

fn space_key(s: Space) -> u8 {
    match s {
        Space::Co => 0,
        Space::Di => 1,
        Space::Hr => 2,
        Space::Ir => 3,
    }
}

fn words_of(ty: &str, len: Option<u32>) -> u32 {
    match ty {
        "u32" | "s32" | "f32" => 2,
        "f64" => 4,
        "string" => len.unwrap_or(1),
        _ => 1,
    }
}

impl DeviceMap {
    pub fn from_json(text: &str) -> Result<DeviceMap, String> {
        let d: RawDev = serde_json::from_str(text).map_err(|e| e.to_string())?;
        let mut by = HashMap::new();
        for r in d.registers {
            let sp = match r.table.as_str() {
                "coils" => Space::Co,
                "discrete-inputs" => Space::Di,
                "holding-registers" => Space::Hr,
                "input-registers" => Space::Ir,
                _ => continue,
            };
            let words = words_of(&r.ty, r.len);
            by.entry((space_key(sp), r.address)).or_insert(RegDesc {
                name_ko: r.name.ko.unwrap_or_default(),
                name_en: r.name.en.unwrap_or_default(),
                unit: r.unit.unwrap_or_default(),
                scale: r.scale.unwrap_or(1.0),
                ty: r.ty,
                words,
                order: r.order.unwrap_or_else(|| "ABCD".into()),
            });
        }
        Ok(DeviceMap {
            id: d.id,
            model: d.model,
            by,
        })
    }

    /// 폴더 아래의 `제조사/장비.json` 을 모두 읽는다. 읽지 못한 파일은 건너뛴다
    pub fn load_dir(dir: &Path) -> Vec<DeviceMap> {
        let mut out = Vec::new();
        let Ok(mf) = std::fs::read_dir(dir) else {
            return out;
        };
        for m in mf.flatten() {
            let Ok(files) = std::fs::read_dir(m.path()) else {
                continue;
            };
            for f in files.flatten() {
                if f.path().extension().is_some_and(|e| e == "json")
                    && let Ok(t) = std::fs::read_to_string(f.path())
                    && let Ok(d) = DeviceMap::from_json(&t)
                {
                    out.push(d);
                }
            }
        }
        out.sort_by(|a, b| a.id.cmp(&b.id));
        out
    }

    pub fn len(&self) -> usize {
        self.by.len()
    }

    pub fn is_empty(&self) -> bool {
        self.by.is_empty()
    }
}

impl RegisterNamer for DeviceMap {
    fn describe(&self, space: Space, address: u32) -> Option<RegDesc> {
        self.by.get(&(space_key(space), address)).cloned()
    }
}

/// 레지스터 값(16비트 워드들)을 배율·단위로 풀어 «50.00 Hz» 꼴 글로. 모자라거나 형이 글이면 None
pub fn format_value(d: &RegDesc, regs: &[u16]) -> Option<String> {
    let w = d.words as usize;
    if regs.len() < w {
        return None;
    }
    let order = |a: u16, b: u16| {
        if d.order == "CDAB" {
            ((b as u32) << 16) | a as u32
        } else {
            ((a as u32) << 16) | b as u32
        }
    };
    let v: f64 = match d.ty.as_str() {
        "u16" => regs[0] as f64,
        "s16" => regs[0] as i16 as f64,
        "u32" => order(regs[0], regs[1]) as f64,
        "s32" => order(regs[0], regs[1]) as i32 as f64,
        "f32" => f32::from_bits(order(regs[0], regs[1])) as f64,
        "bit" => regs[0] as f64,
        _ => return None,
    };
    let scaled = v * d.scale;
    let decimals = if d.scale > 0.0 && d.scale < 1.0 {
        (-d.scale.log10()).ceil().clamp(0.0, 6.0) as usize
    } else if d.ty == "f32" {
        3
    } else {
        0
    };
    let u = if d.unit.is_empty() {
        String::new()
    } else {
        format!(" {}", d.unit)
    };
    Some(format!("{scaled:.decimals$}{u}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    const J: &str = r#"{"id":"x/y","model":"Y","registers":[
      {"table":"holding-registers","address":304,"type":"u16","name":{"ko":"주파수","en":"Frequency"},"unit":"Hz","scale":0.01},
      {"table":"input-registers","address":0,"type":"f32","name":{"ko":"전압","en":"Voltage"},"unit":"V"}]}"#;

    #[test]
    fn lookup_and_format() {
        let m = DeviceMap::from_json(J).unwrap();
        assert_eq!(m.len(), 2);
        let d = m.describe(Space::Hr, 304).unwrap();
        assert_eq!((d.name_en.as_str(), d.words), ("Frequency", 1));
        assert_eq!(format_value(&d, &[0x1388]).unwrap(), "50.00 Hz");
        let v = m.describe(Space::Ir, 0).unwrap();
        assert_eq!(v.words, 2);
        assert_eq!(format_value(&v, &[0x435c, 0x0000]).unwrap(), "220.000 V");
        assert!(m.describe(Space::Hr, 0).is_none());
    }

    #[test]
    fn loads_the_real_device_maps() {
        // 저장소의 data/devices — 86종이 전부 읽혀야 한다(없는 환경이면 건너뜀)
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../data/devices");
        if !dir.exists() {
            return;
        }
        let all = DeviceMap::load_dir(&dir);
        assert!(all.len() >= 80, "{}", all.len());
        assert!(all.iter().all(|d| !d.is_empty()));
    }
}
