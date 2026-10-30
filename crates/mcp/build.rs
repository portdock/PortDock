//! data/devices/<제조사>/<모델>.json 을 실행 파일에 넣는다 — 목록을 손으로 적지 않게 빌드 때 찾는다.
use std::fmt::Write as _;
use std::path::Path;

fn main() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../data/devices");
    println!("cargo:rerun-if-changed={}", root.display());
    let mut items = Vec::new();
    for maker in std::fs::read_dir(&root).expect("data/devices") {
        let maker = maker.unwrap().path();
        if !maker.is_dir() {
            continue;
        }
        println!("cargo:rerun-if-changed={}", maker.display());
        for f in std::fs::read_dir(&maker).unwrap() {
            let f = f.unwrap().path();
            if f.extension().is_some_and(|e| e == "json") {
                let id = format!("{}/{}", maker.file_name().unwrap().to_string_lossy(), f.file_stem().unwrap().to_string_lossy());
                items.push((id, f.canonicalize().unwrap()));
            }
        }
    }
    items.sort();
    let mut out = String::from("/// (id «제조사/모델», JSON 원문) — build.rs 가 만든다\npub static DEVICE_FILES: &[(&str, &str)] = &[\n");
    for (id, p) in &items {
        writeln!(out, "    ({id:?}, include_str!({:?})),", p.display().to_string()).unwrap();
    }
    out.push_str("];\n");
    std::fs::write(Path::new(&std::env::var("OUT_DIR").unwrap()).join("devices.rs"), out).unwrap();
}
