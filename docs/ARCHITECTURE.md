# PortDock architecture

> **한국어 요약**
> - PortDock 은 윈도우용 통신 시험 도구 12개(serial · modbus-slave · tcp · udp · simulator · netscan · modbus-master · scpi · plot · port-inspector · plc-simulator · hw-tester)를 한 저장소에서 만든다.
> - Rust 는 Cargo workspace 하나: 통신·해석 로직은 `crates/core`(Tauri 의존 없음), 각 앱의 `apps/<앱>/src-tauri` 는 core 를 감싼 Tauri 명령만 둔다.
> - 화면은 앱마다 React + Vite 프로젝트(npm workspaces)이고, 공용 화면·로직은 `shared/` 를 `@shared` 별칭으로 가져다 쓴다.
> - 오류 보고: Rust 가 비정상 종료 기록을 이 PC 에 파일로 남기고, 다음 실행 때 화면이 묻는다. 사용자가 보내기를 고르거나 «자동 전송» 을 켠 경우에만 Sentry 로 간다. 메일·GitHub 이슈·파일 저장도 고를 수 있다.
> - `data/devices` 의 장비 레지스터 맵(JSON, CC BY 4.0)은 앱(Modbus Master·Slave)과 사이트가 빌드 때 같은 파일을 읽는다.
> - 사이트(`site/`, Astro)는 앱의 `apps/*/src/help.ts` 를 그대로 읽어 사용법 페이지를 만든다 — 앱 도움말을 고치면 사이트도 바뀐다.
> - CI 는 push(main)·PR 마다 windows-latest 에서 화면 빌드 → node 시험 → 장비 데이터 검사 → clippy → cargo test → 고지문 검사 → 사이트 검사·빌드·빌드 결과 검사 → 개인 정보 검사(`tools/privacy-check.mjs`) 순으로 돈다.

This document describes how the repository is put together. Everything here was checked against the files named under each section; nothing is planned or aspirational.

## Directory layout

```
PortDock/
├─ Cargo.toml              Cargo workspace (core + 10 app shells), release profile
├─ package.json            npm workspaces (apps/*, site) and run/build scripts
├─ crates/core/            portdock-core — shared Rust logic, no Tauri dependency
├─ apps/<tool>/            one per tool (10): React/Vite UI in src/, Tauri shell in src-tauri/
│  ├─ src/                 App.tsx, api.ts (invoke wrappers), i18n.ts, help.ts, main.tsx
│  └─ src-tauri/           Cargo.toml, src/lib.rs (commands), tauri.conf.json, capabilities/
├─ shared/                 React components + UI-independent TS logic used by all apps (@shared)
├─ data/devices/           device Modbus register maps (JSON, CC BY 4.0) + schema.json
├─ site/                   portdock.dev (Astro, static) + site/functions (Cloudflare Pages Functions)
├─ tools/                  repo scripts: devices-check, notices, installer-license, build configs
├─ e2e/                    local UI automation (tauri-driver / mock-backend preview); not run in CI
├─ docs/                   test plan, release procedure, reviews
└─ .github/                CI and release workflows, issue templates
```

## Overall structure

Sources: `Cargo.toml`, `package.json`, `crates/core/Cargo.toml`, `apps/*/src-tauri/Cargo.toml`, `apps/*/src-tauri/src/lib.rs`, `apps/serial/vite.config.ts`, `apps/serial/tsconfig.json`

### Rust: one Cargo workspace

The root `Cargo.toml` declares a workspace (`resolver = "3"`) with thirteen members: `crates/core` and `apps/<tool>/src-tauri` for each of the twelve tools. Version, edition (2024), license (`GPL-3.0-only`) and authors are inherited from `[workspace.package]`. The release profile is size-oriented (`lto = true`, `codegen-units = 1`, `panic = "abort"`, `strip = true`).

- **`crates/core` (`portdock-core`)** holds the communication and parsing logic. Its `lib.rs` states the rule: only logic unrelated to the UI (Tauri) lives here. Its dependencies are `serde`, `serialport`, `chrono`, `socket2`, `encoding_rs`, plus Windows-only `windows-sys`, `crash-handler`, `minidumper`, `webview2-com`, `windows`. It does not depend on `tauri`.
- **`apps/<tool>/src-tauri` (`portdock-<tool>`)** each depend on `portdock-core = { path = "../../../crates/core" }` together with `tauri` 2 and the plugins `opener`, `dialog`, `window-state`. The library is named `portdock_<tool>_lib` (`staticlib`, `cdylib`, `rlib`); `main.rs` only calls `portdock_<tool>_lib::run()`.

### How the apps share core

Each app's `src-tauri/src/lib.rs` defines thin `#[tauri::command]` functions that call into `portdock_core` (for example `portdock_core::ports::list()`, `Session::start(...)`, `modbus::decode(...)`) and registers them in `run()` with `tauri::generate_handler![...]`. Open sessions are kept in `portdock_core::registry::Registry<T>` held in Tauri managed state. Session events are pushed to the UI over a `tauri::ipc::Channel<SessionEvent>`.

`run()` follows the same order in every app (all twelve call `webview_missing`, `report::install` and `run_failed`):

1. If `tauri::webview_version()` fails → `report::webview_missing` (message box, exit).
2. `report::install("<tool>", version)` (panic hook), `report::crash_monitor_or_attach()`, `report::test_crash_if_asked()`.
3. Tauri builder with plugins, `setup` that calls `report::watch_webview2` on Windows, managed state, and `invoke_handler`.
4. If `run` returns an error → `report::run_failed`.

Every app registers the same report commands: `set_lang`, `report_pending`, `report_dismiss`, `report_env`, `report_read_dump`. Net Scan additionally has app-only Rust modules (`scan`, `monitor`, `oui`, `range`, `win`, `wol`, `modbus_id`) in `apps/netscan/src-tauri/src/`; its MAC vendor table is embedded with `include_str!`/`include_bytes!` from `apps/netscan/src-tauri/data/`.

### Frontend: npm workspaces

The root `package.json` declares `"workspaces": ["apps/*", "site"]`. Each app is its own Vite + React 19 + TypeScript package (`portdock-<tool>`, scripts `dev`, `build` = `tsc && vite build`, `tauri`). The root scripts wrap them: `npm run <tool>` → `tauri dev`, `npm run build:<tool>` → `tauri build`, `npm run site` / `build:site`, and `npm test` → `cargo test --workspace`.

Shared UI code is not a package: each app's `vite.config.ts` aliases `@shared` to `../../shared`, and `tsconfig.json` maps `@shared/*` and includes `../../shared`. The UI calls Rust only through `invoke`/`Channel` from `@tauri-apps/api/core`, wrapped per app in `src/api.ts`.

Each `tauri.conf.json` sets a CSP whose `connect-src` allows only `self`, IPC and the Sentry ingest hosts (`apps/serial/src-tauri/tauri.conf.json`). `capabilities/default.json` grants a minimal permission set and lists the URLs the `opener` plugin may open.

## `crates/core/src` modules

Sources: the `//!` header and `pub` items of each file in `crates/core/src/`.

| Module | Role |
|---|---|
| `lib.rs` | Declares the modules. Only UI-independent communication and parsing logic belongs in core. |
| `autoreply.rs` | Auto-reply: when a received frame matches a rule, send the configured reply (device emulation). HEX/ASCII wildcard patterns, reply templates (`{req …}`, `{counter}`, `{rand}`, `{time}`, `{unix}`), rule compilation, `responder` used by sessions. |
| `checksum.rs` | Checksums/CRCs appended on send and verified on receive; generic CRC parameters (reveng notation), position options (`ChecksumSpec`), `crc16_modbus`. |
| `codec.rs` | Send text → bytes: HEX in several notations, ASCII with escapes, encodings UTF-8/CP949/Latin-1/ASCII; `text_view` for displaying received bytes with the same rules as `shared/format.ts`. |
| `event.rs` | Common event shape all sessions emit to the UI and logs (`Frame`, `SessionEvent`, `EventSink`), file log writer and log options (`LogWriter`, `LogOptions`, `write_log`, `flush_frames`). |
| `framer.rs` | Cuts received bytes into frames (`FrameMode`: gap, terminator, …; idle gap always applies); Modbus request/response length helpers, length-field framing (big-endian, little-endian or ASCII-hex length field). |
| `loopback.rs` | Connection test (Port Inspector, Serial «Check connection…»): TX–RX loopback per baud rate (bytes same/lost/changed, 1-byte round-trip ms, driver error flags via `ClearCommError`) and 2-wire RS-485 echo detection; runs on a `Link` so it is unit-tested with a fake port. |
| `i18n.rs` | Backend message language: `set_lang` from the UI, `is_en`, and the `tr!(ko, en)` macro used for error/event strings. |
| `mc.rs` | PLC Simulator: MC protocol (SLMP) server — 3E/4E frames in binary or ASCII, commands 0401/1401/0403/1402/0619, 18 device types with per-device sizes, end-code error replies (C050–C061), fault injection and value simulation (`regmap`), one-line decode for the traffic log. Golden tests use the manual examples byte for byte. |
| `ping.rs` | ICMP echo (`IcmpSendEcho2`), next hop toward an address (`GetBestRoute` — the default gateway), DNS response time for one name (`DnsQuery_W`, cache and hosts file skipped). Shared by Net Scan and Hardware Tester (moved from `apps/netscan` 10/30) |
| `wlan.rs` | Hardware Tester «Wi-Fi signal»: Native Wifi API loaded only when called (`LoadLibraryExW` from System32 + `GetProcAddress`), so the exe still starts on Windows Server without `wlanapi.dll`. Reads signal quality, RSSI, link speed, PHY, the connected AP's channel and per-channel counts of nearby APs; SSID/BSSID are never copied out. Needs location permission on Windows 11 24H2+ |
| `modbus.rs` | Modbus frame decoding (`decode`: direction-agnostic RTU), exception names, `Summarizer` for one-line human summaries of RTU/TCP traffic. |
| `modbus_master.rs` | Modbus master (polling): request PDUs, response matching and checks (byte count, CRC, exception, MBAP transaction, RS-485 echo), timeout/retry/spacing, poll schedule, slave-ID and address-range search; `Link` abstraction and worker `Engine`. |
| `modbus_slave.rs` | Modbus slave emulation: register tables answering master requests (PDU core, RTU/TCP wrapping), fault injection (delay, no reply, forced exception, broken CRC/MBAP length), automatic value changes. |
| `net.rs` | This PC's network info: IPv4 addresses per adapter, which program holds a port when bind fails, bind error text. No admin rights needed. |
| `oserr.rs` | Common OS errors (network, serial I/O, serial open) translated to the UI language, keeping the Windows original in parentheses. |
| `plot.rs` | Plot: extracts numeric values from incoming bytes (text lines with separators/headers/`name:value`, binary formats); parsing is in Rust so only numbers cross to the WebView and CSV logging happens here. |
| `portinfo/` | Port Inspector: reads, for one COM port and without admin rights, the device and driver properties and problem code (CfgMgr32), Device Parameters and the Windows `Ports` defaults, COM number reservations (ComDB, SERIALCOMM), USB power saving (power options, WMI), PnP events from the event logs; VID/PID chip and problem-code tables in `tables.rs`. Read-only — nothing is written. |
| `ports.rs` | Serial port list with device name and USB info (`PortInfo`, `list`). |
| `registry.rs` | Store of open sessions shared by all apps: no lock held while opening, duplicate opens rejected, self-closed sessions removed by generation number (`Registry`, `auto_remove_sink`). |
| `regmap.rs` | Register value types (u16…f64), word/byte orders ABCD/CDAB/BADC/DCBA, value simulation, RNG — same rules as `apps/modbus-slave/src/regmap.ts`. |
| `report.rs` + `report/` | Problem reports: writes crash files locally and lets the UI ask the user later. `report/native.rs`: native crashes via a monitor process writing a minidump; `report/webview.rs`: WebView2 render-process failures. See [Error report flow](#error-report-flow). |
| `scpi.rs` | SCPI over LAN raw socket (usually TCP 5025) and serial: line terminators, IEEE 488.2 definite-length blocks, timeout/cancel, error-queue draining (`SYST:ERR?`). VXI-11, HiSLIP, USBTMC, GPIB are out of scope. |
| `serial.rs` | Serial session: read thread (receive, framing, 50 ms batches, disconnect detection, auto-reconnect) and write thread (send queue, partial writes, flow control). |
| `tcp.rs` | TCP session: client (auto-reconnect), server (multiple connections), relay (monitor between two peers); MBAP helpers (`is_mbap`, `decode_mbap`). |
| `udp.rs` | UDP session: one datagram = one frame with sender address; broadcast, multicast (join/rejoin), echo. |

## `shared/` (UI components and logic)

Sources: header comments of the files in `shared/`.

`shared/` holds React components (`*.tsx`) and UI-independent TypeScript (`*.ts`). Tests sit next to the module they cover (`*.test.ts`).

| Group | Files | Notes |
|---|---|---|
| App frame and dialogs | `HelpDialog.tsx`, `SettingsDialog.tsx`, `ReportDialog.tsx`, `FirstCard.tsx`, `NarrowBar.tsx`, `PinButton.tsx`, `Popover.tsx`, `Toast.tsx`, `TipLayer.tsx`, `Boundary.tsx`, `Splitter.tsx` | `HelpDialog.tsx` defines `HelpDoc = Record<"ko" \| "en", HelpSection[]>`, the type every `apps/*/src/help.ts` exports. |
| Help and text | `helpCommon.ts`, `helpAutoReply.ts`, `uiText.ts`, `ioText.ts`, `autoReplyText.ts`, `tips.ts`, `tipsIo.ts`, `mbwords.ts` | Shared wording in both languages. |
| Log view | `TerminalView.tsx` + `terminal.ts`, `LogFilter.tsx` + `logSearch.ts`, `LogMenu.tsx`, `logCopy.ts`, `useFollowTail.ts`, `FollowButton.tsx`, `useSimpleLog.ts`, `StatsBar.tsx` + `liveStats.ts` | Terminal view with ANSI SGR colours, incremental search/filter, copy, follow-tail. |
| Sending (Serial/TCP/UDP) | `CommandList.tsx`, `SendMode.tsx` + `notation.ts`, `ChecksumOptions.tsx`, `FileSend.tsx`, `sendHistory.ts`, `history.ts`, `TriggerPanel.tsx` + `triggers.ts`, `examples.ts`, `serialPresets.ts`, `interlocks.ts` | |
| Auto-reply | `AutoReplyPanel.tsx`, `AutoReplySection.tsx`, `autoReply.ts`, `autoReplyApi.ts` | Rule shape matches `autoreply::RuleSpec`; command names are the same in Simulator, Serial, TCP, UDP. |
| Modbus | `ModbusBuilder.tsx`, `modbusBuild.ts` (RTU requests), `mbap.ts` + `MbapDetail.tsx` (Modbus TCP), `mbPair.ts` + `MbValues.tsx` (request/response pairing), `modbus.css` | |
| Devices | `DeviceDialog.tsx`, `devices.ts`, `deviceData.ts` | See [Data: data/devices](#data-datadevices). |
| Network | `NetIfaces.tsx` | Calls the `interfaces` command (core `net.rs`). |
| Settings and misc | `settings.ts` (common settings in `localStorage("settings")`), `format.ts`, `framing.ts`, `shortcuts.ts`, `exitGuard.ts`, `browserGuard.ts`, `restoreFocus.ts`, `useWindowTitle.ts`, `links.ts` | `links.ts` holds contact e-mail, repo URL and sponsor URL; the apps and the site both read it. |
| Error reporting | `report.ts`, `ReportDialog.tsx` | See below. |

## Error report flow

Sources: `crates/core/src/report.rs`, `crates/core/src/report/native.rs`, `crates/core/src/report/webview.rs`, `shared/report.ts`, `shared/ReportDialog.tsx`, `shared/Boundary.tsx`, `shared/settings.ts`, `shared/SettingsDialog.tsx`, `apps/*/src/main.tsx`, `apps/*/src/App.tsx`, `site/functions/api/contact.ts`

The stated rule (header of `report.rs` and `report.ts`): nothing is sent silently. Files stay on the PC; the user decides whether and what to send.

### 1. Recording (Rust, local files only)

Three kinds of incident are written to the same folder as `crash-<time>-<pid>.txt` (native crashes also get a `.dmp` with the same stem):

| Incident | Mechanism |
|---|---|
| Rust panic | `report::install` sets a panic hook that writes thread, message, location and a forced backtrace, then calls the previous hook. |
| Native crash (access violation etc.) | `report::crash_monitor_or_attach` starts the same exe as `--portdock-crash-monitor <socket> <parent pid>` (no window); on a crash the monitor writes a minidump and a text file (`crash-handler`, `minidumper`). If a panic was already recorded, no second dump is made. |
| WebView2 render process failure | `watch_webview2` records it (at most one report per 30 s) and reloads the page. |

Details from `report.rs`:

- Folder (`reports_dir`): `<exe dir>\portdock-data\reports\<app>` when a writable `portdock-data` folder sits next to the exe (portable build); otherwise `%LOCALAPPDATA%\dev.portdock.<app>\reports`.
- Each text starts with app, version, OS, arch and time. The user profile path (`USERPROFILE`/`HOME`) is replaced with `~`.
- Only the latest 10 reports are kept (`KEEP`); a `.txt`/`.dmp` pair counts as one. Text passed to the UI is capped at 64 KiB, dumps at 20 MiB (`MAX_DUMP`).
- `PORTDOCK_TEST_CRASH=1` (panic) or `=native` (access violation) makes the app crash after 3 s to test the flow.
- Startup failures are not reports: missing WebView2 or a Tauri start error shows a Korean+English message box and exits.

### 2. Collecting in the UI

- `installErrorCapture()` (called in every `apps/*/src/main.tsx`) listens to `error` and `unhandledrejection`; `noteError` keeps up to 50 recent errors in memory for this run (repeats increment a counter). `Boundary.tsx` reports render crashes through `reportRenderCrash`.
- `ReportButton` (the «!» in each app header) calls `report_pending` at startup. If there are pending crash files it asks: send now / open report / later / discard.

### 3. User consent and sending

The setting «Automatic error reports» (`autoReport` in `shared/settings.ts`) is `ask` (default), `on` or `off`.

- `ask`: after a crash the app asks; nothing is sent until the user presses send. Uncaught UI exceptions are only collected.
- `on`: pending crash files are sent at startup without asking, and uncaught UI exceptions are sent as they happen (max 10 per run, deduplicated by first line). Files that fail to send stay for the next run.
- `off`: no startup prompt.

`ReportDialog` builds a Markdown report shown in a read-only preview: description, environment (app, version, OS, WebView user agent, screen, language), recent errors, crash reports, a settings snapshot limited to a whitelist of `localStorage` keys (command lists and rules are excluded), and optionally the last 200 log lines (off by default, with a warning that traffic may contain company data). `hideUserPaths` replaces `C:\Users\<name>` with `~`. Destinations the user can choose:

| Button | Where it goes |
|---|---|
| Send now | Sentry, directly from the WebView with `fetch`: an envelope (`/api/<project>/envelope/`) with the report as `report.txt`; minidumps go separately to `/api/<project>/minidump/` as multipart. The DSN is `SENTRY_DSN` in `shared/report.ts` (EU ingest host). Events carry `server_name: "-"` and tags app/source/os/lang. |
| Copy / Save to file | Clipboard, or a `.md` file through the save dialog and the `write_text` command. |
| E-mail | `mailto:` to `CONTACT_EMAIL` (`shared/links.ts`), body truncated to fit URL limits. |
| GitHub issue | `https://github.com/portdock/PortDock/issues/new` with title and body prefilled (truncated). |

After a report is sent or saved, closing the dialog deletes the crash files (`report_dismiss`); a crash with a minidump is deleted only after the dump itself was uploaded, so the user can still attach it manually.

### Server side

There is no PortDock-operated receiver for error reports; they go to Sentry. The only server function in the repository is `site/functions/api/contact.ts` — a Cloudflare Pages Function for the website contact form (`POST /api/contact`, Turnstile check, then e-mail via a `send_email` binding). It is not part of the error report flow.

## Data: `data/devices`

Sources: `data/devices/README.md`, `data/devices/schema.json`, `data/devices/LICENSE`, `tools/devices-check.mjs`, `shared/deviceData.ts`, `shared/devices.ts`, `shared/DeviceDialog.tsx`, `site/src/data/devices.ts`, `site/src/pages/devices/`

- One JSON file per device at `data/devices/<manufacturer>/<model>.json`; `id` equals that path. The format is described by `schema.json` (JSON Schema 2020-12). Data is licensed CC BY 4.0, separately from the GPL program code.
- **Check**: `node tools/devices-check.mjs` (run in CI) validates every file with a small built-in schema validator (no dependencies) plus rules the schema cannot express: id vs. path, address range and overlaps by type width, table vs. type, table vs. function code, access vs. function code, sources present and not dated in the future, `string` needs `len`, no scale on `bit`/`string`, no Hangul in any `en` text or in `model`/`models`. Other modes: `--list`, `--modbus-schema <id>` (export to nielsbasjes/modbus-schema YAML).
- **In the apps**: `shared/deviceData.ts` bundles all files at build time with Vite `import.meta.glob("../data/devices/*/*.json", { eager: true })`. `shared/devices.ts` converts a device into Modbus Master poll tables or Modbus Slave cells; `DeviceDialog.tsx` is the picker used by Modbus Master («device profile») and Modbus Slave («emulate device»).
- **On the site**: `site/src/data/devices.ts` globs the same `data/devices/*/*.json` and generates `/devices/` pages and JSON copies (`site/src/pages/devices/`).

## Site

Sources: `site/package.json`, `site/astro.config.mjs`, `site/src/data/tools.ts`, `site/src/views/DocsPage.astro`, `site/README.md`

- Static Astro site (Korean at `/`, English at `/en/`) deployed to Cloudflare Pages; the site URL comes from the build variable `SITE_URL` (default `https://portdock.dev`).
- `astro.config.mjs` sets the same `@shared` alias as the apps. `site/src/data/tools.ts` imports `help` from each `apps/<tool>/src/help.ts`, and `DocsPage.astro` renders it as the usage page. Editing an app's in-app help therefore changes the website.
- `shared/links.ts` is read by both apps and site.
- Scripts: `dev`, `build`, `check` (`astro check`), `test` (`node --test src/lib/checksum.test.ts`).

## Tests and CI

Sources: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `e2e/README.md`, `docs/test-plan.md`

### CI (`ci.yml`)

Runs on `windows-latest` for pushes to `main`, pull requests and manual dispatch, with Node 24 and stable Rust + clippy. Steps in order:

1. `npm ci`
2. Frontend build of all 12 apps: `npm run build -w portdock-<tool>` (`tsc` + `vite build`; this is also the type check, and produces the `dist` the Rust build needs)
3. `node --test "shared/**/*.test.ts" "apps/*/src/**/*.test.ts" "tools/**/*.test.mjs"`
4. `node tools/devices-check.mjs`
5. `cargo clippy --workspace --all-targets -- -D warnings`
6. `cargo test --workspace`
7. `node tools/notices.mjs --check` (THIRD_PARTY_NOTICES.txt is current)
8. `node tools/installer-license.mjs --check` (installer license page: privacy notice + GPL)
9. Site: `npm run check -w portdock-site`, `npm test -w portdock-site`, `npm run build -w portdock-site`, then `node tools/site-check.mjs site/dist` (titles, descriptions, canonical/hreflang, headings, JSON-LD required fields, internal links, sitemap)

### Release (`release.yml`)

Triggered by a `v*` tag (or manual dispatch, which only uploads build artifacts). A matrix builds each of the 12 apps on `windows-latest` (Node 22): checks that the tag matches the app version, regenerates notices, builds the NSIS installer, an offline installer with the WebView2 runtime (`tools/offline.conf.json`) and a portable zip (`tools/portable.conf.json`, `--no-bundle`). A final job on `ubuntu-latest` writes `SHA256SUMS.txt` and creates a **draft** GitHub release; a person publishes it. Code signing (SignPath) is present but commented out. Procedure: `docs/release.md`.

### Test inventory

- **Rust**: `cargo test --workspace` (run 2026-10-29): 309 passed, 3 ignored, 0 failed — 256 in `portdock-core`, 32 (+2 ignored) Net Scan, 6 Plot, 4 (+1 ignored: `cross_server`, a 127.0.0.1 server for manual cross-tests with an independent client) PLC Simulator, 3 Modbus Slave, 3 SCPI, 2 Port Inspector, 1 each in Serial, TCP and Modbus Master; Simulator and UDP have none. The repository has 266 `#[test]` functions (`grep -r "#\[test\]" crates apps --include=*.rs`). Tests are `#[cfg(test)]` modules inside the source files. The Port Inspector readers (`portinfo`) also read this PC for real in tests (device properties, registry, power options, event logs, WMI) without administrator rights and without needing a COM device.
- **Node** (`node --test`, Node 24 strips TypeScript types; the app and `shared/` test files start with `// @ts-nocheck`):
  - `shared/`: `autoReply.test.ts`, `devices.test.ts`, `ioFeatures.test.ts`, `logSearch.test.ts`, `mbPair.test.ts`, `mbap.test.ts`, `modbusBuild.test.ts`, `notation.test.ts`, `portinfo.test.ts`, `serialPresets.test.ts`
  - apps: `apps/modbus-master/src/model.test.ts`, `apps/modbus-slave/src/regmap.test.ts`, `apps/netscan/src/net.test.ts`, `apps/plot/src/model.test.ts`, `apps/port-inspector/src/model.test.ts`, `apps/plc-simulator/src/model.test.ts`, `apps/plc-simulator/src/launch.test.ts`, `apps/scpi/src/model.test.ts`
  - tools: `tools/devices-check.test.mjs` (`tools/site-check.mjs` is a checker for the built site, not a test file)
  - site: `site/src/lib/checksum.test.ts`
- **e2e/** (local only, not in CI; `e2e/README.md`):
  - Real-app runs with `tauri-driver` + Edge WebDriver (`tcp.mjs`, `udp.mjs`, `sim.mjs`, `slave.mjs`, `serial.mjs`): TCP, UDP and Simulator exchange data with a peer inside the PC; Serial and Modbus Slave cover what works without a port. Screenshots and `<tool>-results.json` go to `e2e/shots/`.
  - `e2e/ui-preview/`: the UI in a browser with a mock backend (`mock.js`, following the real command names and event shapes). `shots.mjs` captures layouts; `smoke.mjs` clicks every control in four combinations (Korean/English × light/dark) for all ten apps and fails on uncaught errors, overflow, clipped buttons and similar. Outbound network is blocked (fetch interception + CSP).
- **Manual hardware checklist**: `docs/test-plan.md` (common items C1–C44 plus per-app tables; ⏸ marks items that need a virtual COM pair or real devices).
