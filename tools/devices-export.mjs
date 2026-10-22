// 장비 레지스터 맵을 데이터셋 묶음으로 내보낸다 — Hugging Face·Kaggle 에 올릴 폴더(README 데이터셋 카드 + registers.csv + devices.jsonl + LICENSE).
// 쓰는 법: node tools/devices-export.mjs [출력 폴더]   (기본 dist-dataset/ — 저장소에 올리지 않는다)
// 올리기: Hugging Face 에서 데이터셋 저장소(portdock/modbus-register-maps)를 만들고 이 폴더 내용을 그대로 올린다.
import fs from "node:fs";
import path from "node:path";
import { devicesCsv } from "../site/src/lib/devicesExport.ts";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "data", "devices");
const out = path.resolve(process.argv[2] ?? path.join(root, "dist-dataset"));

const devices = fs
  .readdirSync(src, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((e) =>
    fs
      .readdirSync(path.join(src, e.name))
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(src, e.name, f), "utf8"))),
  )
  .sort((a, b) => a.manufacturer.en.localeCompare(b.manufacturer.en) || a.model.localeCompare(b.model));

const regs = devices.reduce((n, d) => n + d.registers.length, 0);
const makers = [...new Set(devices.map((d) => d.manufacturer.en))];

const card = `---
license: cc-by-4.0
language:
- en
- ko
pretty_name: PortDock Modbus Register Maps
tags:
- modbus
- industrial-automation
- plc
- inverter
- power-meter
- temperature-controller
size_categories:
- n<1K
configs:
- config_name: default
  data_files: registers.csv
---

# PortDock Modbus Register Maps

Modbus register maps for ${devices.length} industrial devices (${regs} registers) from ${makers.join(", ")} — inverters (VFD), temperature controllers, power meters, panel meters and counters.

**Every value is taken from the manufacturer's own manual** (document, edition, page and the date it was checked are listed per device in \`devices.jsonl\` → \`sources\`, and per register in \`ref\`). Nothing is guessed. Models whose manuals contradict themselves were left out.

- \`registers.csv\` — one row per register: device, table (holding/input/coils/discrete), **0-based wire address**, the address as the manual writes it, type (u16/s16/u32/s32/f32/f64/string/bit), word order (ABCD/CDAB/…), scale (value = raw × scale), unit, access, function codes, English and Korean names, value meanings, manual page.
- \`devices.jsonl\` — one device per line with factory serial settings, notes and sources (JSON Schema: https://github.com/portdock/PortDock/blob/main/data/devices/schema.json).

Browse it: https://portdock.dev/devices/ · Source and updates: https://github.com/portdock/PortDock/tree/main/data/devices · Free tools that load these maps: https://portdock.dev

## Use with care
Unofficial; not affiliated with the manufacturers. Firmware and model variants differ — **check the device manual before writing to a device** (run commands, parameter changes). Report mistakes with a page number on GitHub.

## License and citation
CC BY 4.0. Please credit «PortDock device register maps (https://portdock.dev/devices/)». Manufacturer and model names are trademarks of their owners.
`;

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "registers.csv"), devicesCsv(devices));
fs.writeFileSync(path.join(out, "devices.jsonl"), devices.map((d) => JSON.stringify(d)).join("\n") + "\n");
fs.writeFileSync(path.join(out, "README.md"), card);
fs.copyFileSync(path.join(src, "LICENSE"), path.join(out, "LICENSE"));
console.log(`${out}: 장비 ${devices.length}종, 레지스터 ${regs}개`);
