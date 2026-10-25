# Contributing to PortDock

[English](#english) · [한국어 요약](#한국어-요약)

## English

PortDock is ten Windows tools (Serial, Modbus Slave, TCP, UDP, Simulator, Net Scan, Modbus Master, SCPI, Plot, Port Inspector) built with Tauri 2, Rust and React/TypeScript in one repository. How the pieces fit together: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Requirements and build

Requirements (from [README.md](README.md#build-from-source)): Windows 10/11, Node.js 22+, Rust (stable, MSVC), Visual Studio Build Tools with "Desktop development with C++", WebView2. CI uses Node 24 for the `node --test` step, which runs `.ts` test files directly.

```powershell
git clone https://github.com/portdock/PortDock
cd PortDock
npm install

npm run serial            # run in development mode
npm run build:serial      # installer → target\release\bundle\nsis\
cargo test --workspace    # Rust tests (same as `npm test`)

# portable build (data next to the exe)
npm run tauri -w portdock-serial -- build --no-bundle --config "$PWD\tools\portable.conf.json"
```

The same `npm run <tool>` / `npm run build:<tool>` scripts exist for `serial`, `modbus-slave`, `tcp`, `udp`, `simulator`, `netscan`, `modbus-master`, `scpi`, `plot`, `port-inspector`. The website: `npm run site` (dev) and `npm run build:site`.

### Checks before a pull request

CI (`.github/workflows/ci.yml`, `windows-latest`, on pushes to `main` and on pull requests) runs these in this order. Run the ones your change touches locally:

```powershell
# 1. frontend build of each app (tsc type check + vite) — repeat for all 10 apps
npm run build -w portdock-serial
#    … portdock-modbus-slave, portdock-modbus-master, portdock-tcp, portdock-udp,
#      portdock-simulator, portdock-netscan, portdock-scpi, portdock-plot,
#      portdock-port-inspector

# 2. UI-independent TypeScript and tool tests
node --test "shared/**/*.test.ts" "apps/*/src/**/*.test.ts" "tools/**/*.test.mjs"

# 3. device register maps
node tools/devices-check.mjs

# 4. Rust lint — any warning fails
cargo clippy --workspace --all-targets -- -D warnings

# 5. Rust tests
cargo test --workspace

# 6. third-party notices and installer license page are up to date
node tools/notices.mjs --check
node tools/installer-license.mjs --check

# 7. website
npm run check -w portdock-site
npm test -w portdock-site
npm run build -w portdock-site
node tools/site-check.mjs site/dist     # checks the built site output

# 8. no personal data (private paths, personal e-mail, real names, personal plans) in tracked files and the built site
node tools/privacy-check.mjs site/dist
```

### Manual and UI checks (local, not in CI)

- **Hardware checklist** — [docs/test-plan.md](docs/test-plan.md). Common items for all apps (C1–C44) and per-app tables. Items marked ⏸ need a virtual COM pair (e.g. com0com) or real devices. Real-device items are written as preparation → steps → expected result; when the result differs, keep a screenshot, the saved traffic log and the report saved from the «!» window.
- **UI automation** — [e2e/README.md](e2e/README.md).
  - Real app: build the app, install `tauri-driver` and an Edge WebDriver matching the installed WebView2 version, then run `node tcp.mjs`, `udp.mjs`, `sim.mjs`, `slave.mjs`, `serial.mjs` in `e2e/`. Results and screenshots go to `e2e/shots/`.
  - Preview without Rust or devices: start the UI with the mock backend (`APP=<tool> PORT=520x npx vite --config e2e/ui-preview/vite.config.mjs`), then `node ui-preview/smoke.mjs [tool]` clicks every control in Korean/English × light/dark and exits with code 1 on uncaught errors, overflow, clipped buttons and similar. `node ui-preview/shots.mjs` captures layouts. The mock backend blocks outbound network, so the error-report «Send now» never reaches Sentry.
  - The mock backend only finds UI-side bugs; communication and timing are covered by the hardware checklist.

### Code conventions (as seen in the repository)

- **Two languages for every UI string.** Each `apps/<tool>/src/i18n.ts` has a Korean `ko` object and `const en: typeof ko`, so a key missing in English is a type error (`apps/serial/src/i18n.ts`: "새 문구는 두 언어를 함께 넣는다" — add new strings in both languages). Help text in `apps/<tool>/src/help.ts` is a `HelpDoc` with `ko` and `en` sections. Rust messages shown to the user use `tr!("한국어", "English")` (`crates/core/src/i18n.rs`).
- **Help is also the website.** `site/src/data/tools.ts` imports each app's `help.ts` and the site renders it as the usage page, so editing in-app help changes portdock.dev too.
- **Logic placement.** Communication and parsing go into `crates/core` (no Tauri there); app `src-tauri/src/lib.rs` files only wrap it as Tauri commands. Shared UI code goes into `shared/` (imported as `@shared/...`). UI-independent TypeScript has `node --test` tests next to it (`*.test.ts`, starting with `// @ts-nocheck`); Rust tests are `#[cfg(test)]` modules in the same file.
- **Clippy warnings fail CI** (`-D warnings`, all targets).
- **Third-party dependencies.** If you add, remove or update a Rust or npm dependency that ships in the apps, regenerate the notices with `node tools/notices.mjs` and commit `THIRD_PARTY_NOTICES.txt`; CI fails on `--check` otherwise. The script collects normal (not build/dev) Rust dependencies of the apps for `x86_64-pc-windows-msvc` and the npm `dependencies` of `apps/*/package.json` recursively. If you change what the program sends over the network, keep `tools/installer-license.mjs` (installer privacy notice) in line with `shared/report.ts` and regenerate with `node tools/installer-license.mjs`.
- **Comments are in Korean** (Rust `//!`/`///` and TypeScript `//` comments throughout `crates/`, `apps/`, `shared/`, `tools/`). New comments follow the same language.
- **Outbound URLs** live in `shared/links.ts`; an app can open a URL only if it is listed in `apps/<tool>/src-tauri/capabilities/default.json`.

### Commit messages

From the history (`git log --oneline`):

- One-line summary in Korean.
- Usually prefixed with the area and a colon: `docs: …`, `e2e: …`, `도움말: …`, `장비 데이터: …`, `화면 문구: …`, `Simulator: …`, `쉽게 쓰기: …`. Some use a dash instead: `SECURITY.md — …`.
- Several related changes in one subject are separated with `·`.
- An optional body explains what changed and why, often as `- ` bullet lines.

Example from the log: `도움말: 장비 프로필·흉내 설명을 실제 내장 10종과 동작에 맞게`

### Contributing device data (`data/devices`)

Register maps for industrial devices, one file per device. Read [data/devices/README.md](data/devices/README.md) first.

- **Location**: `data/devices/<manufacturer>/<model>.json`, lowercase with hyphens. The `id` field is `<manufacturer>/<model>` and must equal the path.
- **Schema**: [data/devices/schema.json](data/devices/schema.json). Required top-level fields: `schemaVersion` (1), `id`, `manufacturer`, `model`, `kind`, `title`, `protocols`, `comm` (with `addressing`: `zero`, `one` or `plc`), `registers`, `sources`. Each register needs `table`, `address` (always the 0-based on-wire address), `manualAddress` (exactly as the manual writes it), `type`, `name`, `access`, `fc`; optional `order`, `len`, `unit`, `scale`, `range`, `values`, `bits`, `description`, `ref`, `source`.
- **Sources are mandatory.** Use only the manufacturer's official, public manual — not blogs, distributor summaries or memory. Each entry in `sources` has the document title (as on the cover), the manufacturer's download URL, the date you checked it (`checked`, YYYY-MM-DD), and optionally `publisher`, `edition` and `pages`. Put the page/table for each register in `ref`.
- **Only what you verified.** Leave out anything you could not confirm in the manual. Confirm from the manual's frame examples whether its addresses are 0-based or 1-based (40001 style); `address` is always 0-based.
- **Facts, not copied text.** Write short facts (address, name, unit, scale, R/W, function code, value meanings) in both Korean and English (`{ "ko": …, "en": … }`). Do not copy sentences from the manual. `en` text must not contain Hangul; `model`/`models` must not contain Hangul either.
- **Check**: `node tools/devices-check.mjs` — schema, id vs. path, address range and overlaps by type width, table/type/function-code/access consistency, sources and dates, `len` for `string`, no scale on `bit`/`string`, no Hangul in English text. `--list` shows all devices.
- **License**: device data is [CC BY 4.0](data/devices/LICENSE), separate from the GPL-3.0 program code. By contributing a device file you license it under CC BY 4.0.
- This data is unofficial and not affiliated with the manufacturers. Manufacturer and model names are their trademarks.

### Bugs and security

- Bugs and feature requests: GitHub issues with the templates in [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE) (`bug.yml`, `feature.yml`). Attaching the report saved from the in-app «!» window helps; issues are public, so leave out confidential data.
- Security vulnerabilities: do not open a public issue — follow [SECURITY.md](SECURITY.md) (GitHub private advisory or e-mail with `[security]`).
- Mistakes in device register maps are normal issues (with the page number).

### License

PortDock's program code is licensed under the [GNU General Public License v3.0](LICENSE) (`GPL-3.0-only` in `Cargo.toml`). Contributions to the code are accepted under the same license. Device data in `data/devices` is CC BY 4.0 (see above).

---

## 한국어 요약

PortDock 은 Tauri 2·Rust·React/TS 로 만든 윈도우용 통신 시험 도구 10개를 한 저장소에서 만든다. 구조는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**준비·빌드** — 윈도우 10/11, Node.js 22+, Rust(stable, MSVC), Visual Studio Build Tools(C++ 데스크톱 개발), WebView2. `npm install` → `npm run <앱>`(개발 실행) · `npm run build:<앱>`(설치판) · `cargo test --workspace`. 앱 이름: serial · modbus-slave · tcp · udp · simulator · netscan · modbus-master · scpi · plot · port-inspector.

**PR 전 검사(CI 와 같은 순서)**
1. 9앱 화면 빌드 `npm run build -w portdock-<앱>`
2. `node --test "shared/**/*.test.ts" "apps/*/src/**/*.test.ts" "tools/**/*.test.mjs"`
3. `node tools/devices-check.mjs`
4. `cargo clippy --workspace --all-targets -- -D warnings` (경고 = 실패)
5. `cargo test --workspace`
6. `node tools/notices.mjs --check` · `node tools/installer-license.mjs --check`
7. 사이트 `npm run check -w portdock-site` · `npm test -w portdock-site` · `npm run build -w portdock-site` · `node tools/site-check.mjs site/dist`
8. 개인 정보 검사 `node tools/privacy-check.mjs site/dist` — 개인 경로·개인 메일·실명·개인 계획·결정 기록이 공개 파일이나 사이트에 들어가면 실패. 운영 메모는 이 저장소에 두지 않는다(허용은 그 파일 `ALLOW` 에 이유와 함께)

**CI 밖 점검** — 실기 점검표 [docs/test-plan.md](docs/test-plan.md)(공통 C1–C44 + 앱별, ⏸ 는 가상 COM 쌍·실제 장비 필요). 화면 자동 조작 [e2e/README.md](e2e/README.md): tauri-driver 로 실제 앱을 띄워 누르는 점검, 가짜 백엔드로 화면만 띄워 모든 칸을 누르는 `ui-preview/smoke.mjs`(한·영 × 밝게·어둡게, 바깥 전송 막힘).

**코드 규칙**
- 화면 문구는 한·영 둘 다 — `apps/<앱>/src/i18n.ts` 의 `en: typeof ko`, 도움말 `help.ts` 도 ko·en. Rust 사용자 문구는 `tr!(한국어, 영어)`.
- 앱 도움말(`help.ts`)을 고치면 사이트 사용법 페이지도 바뀐다(`site/src/data/tools.ts` 가 그대로 읽음).
- 통신·해석은 `crates/core`, 앱 `src-tauri` 는 명령 감싸기만, 공용 화면은 `shared/`.
- clippy 경고는 CI 실패.
- 제3자 의존성을 바꾸면 `node tools/notices.mjs` 로 `THIRD_PARTY_NOTICES.txt` 다시 만들어 함께 커밋.
- 코드 주석은 한국어.

**커밋** — 한국어 한 줄 요약, 보통 «영역: 내용»(`docs:`·`e2e:`·`도움말:`·`장비 데이터:`·`Simulator:` …), 여러 변경은 `·` 로 잇는다. 본문은 필요하면 무엇·왜를 `- ` 줄로.

**장비 데이터(`data/devices`)** — `<제조사>/<모델>.json`, `id` = 경로. 스키마 `schema.json`. **출처 필수**: 제조사 공식 공개 매뉴얼만(문서 이름·주소·확인일, 판·쪽), 레지스터마다 `ref` 에 쪽·표. 매뉴얼에서 확인 못 한 항목은 넣지 않는다. 매뉴얼 문장은 옮기지 않고 사실만 한·영으로(`en` 에 한글 금지). `address` 는 늘 0 기준. 검사 `node tools/devices-check.mjs`. 라이선스 CC BY 4.0(프로그램 GPL-3.0 과 별개). 제조사와 무관한 비공식 자료.

**버그·보안** — 이슈 템플릿 [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE), 보안 문제는 공개 이슈 대신 [SECURITY.md](SECURITY.md).

**라이선스** — 프로그램 코드는 [GPL-3.0](LICENSE)(`GPL-3.0-only`), 기여한 코드도 같은 라이선스로 받는다. 장비 데이터는 CC BY 4.0.
