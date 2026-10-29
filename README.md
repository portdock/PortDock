# PortDock

[![CI](https://github.com/portdock/PortDock/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/portdock/PortDock/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Release](https://img.shields.io/github/v/release/portdock/PortDock?include_prereleases&sort=semver&label=release)](https://github.com/portdock/PortDock/releases)
![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D6)

[한국어](README.ko.md)

Free communication tools for testing field hardware on Windows. Each tool is a separate, small download; they share the same communication and decoding core.

| Tool | What it does |
|---|---|
| **PortDock Serial** | Serial (COM) terminal — RS-232/RS-485/USB serial, signal lines (DTR/RTS/CTS/DSR/RI/CD), auto-reconnect after a USB replug, framing, checksums (nine types plus custom CRC), Modbus RTU decoding and request builder, auto-reply, timestamped test logs |
| **PortDock Modbus Slave** | Modbus slave simulator over serial RTU, Modbus TCP or RTU over TCP — coil and register tables (32-bit, float and string cells), value simulation, fault injection, built-in device profiles, CSV register maps, and the master's requests as they arrive |
| **PortDock TCP** | TCP client, server and relay (monitor) — multiple peers, echo, auto-reconnect, Modbus TCP framing |
| **PortDock UDP** | UDP sender/receiver — broadcast, multicast, echo |
| **PortDock Simulator** | Rule-based fake device over serial, TCP and UDP — "when this arrives, reply with that" |
| **PortDock Net Scan** | Find devices on an industrial network: ping/ARP sweep, MAC vendor, industrial ports (Modbus 502, MC, XGT …), long-term ping monitor, Wake-on-LAN |
| **PortDock Modbus Master** | Modbus RTU/TCP master (poll tool): several poll tables, typed values (U16–F64, strings, byte orders, 40001 notation), writes 05/06/0F/10, slave ID and address range scan, built-in device profiles, decoded traffic, statistics, CSV value log, trends |
| **PortDock SCPI** | SCPI instrument terminal over LAN socket (5025) or RS-232, no VISA: query/write/read with response times, `*IDN?` identification, error queue draining, `*OPC?` waits, repeated numeric measurements (table, trend, CSV), block data (#…) with HEX preview and file save |
| **PortDock Plot** | Live plotter for numbers from serial, TCP or UDP: comma/space/tab/semicolon text (auto-detected), Arduino-style `name:value`, header names, binary frames (start bytes, u8–f64, endianness, checksum); up to 32 channels on left/right axes, pause, cursor, two-point Δt/Δvalue, zoom; statistics, CSV recording while receiving, CSV/PNG export |
| **PortDock Port Inspector** | Read-only COM port inspector, no administrator rights: device and driver (provider, version, date, INF), Device Manager problem code with its meaning and what to try, USB chip from VID/PID (FTDI, Prolific, WCH, Silicon Labs …), device settings such as the FTDI latency timer, USB power saving, plug and driver history from the event logs, COM number reservations (orphan and duplicate numbers); TX–RX loopback test per baud rate (lost/changed bytes, round-trip ms) and 2-wire RS-485 echo check; text/JSON export. It never changes settings |
| **PortDock PLC Simulator** | MC protocol (SLMP) server simulator, implemented from Mitsubishi Electric's public manuals (not affiliated; behaviour may differ from a real PLC) — 3E/4E frames, binary/ASCII, TCP server or UDP, batch and random read/write and loopback, 18 devices (D, W, R, ZR, M, X, Y, B, L, SM, SD …) with hex numbering for X/Y/B/W/ZR, end-code error replies, fault injection, value simulation, JSON save/load. Listens on 127.0.0.1 by default. *Coming in the next release.* |

Website: <https://portdock.dev>

## Download

Get the latest version from **[GitHub Releases](https://github.com/portdock/PortDock/releases/latest)**. File names never change, so these links always point to the newest release:

| Tool | Installer | Portable |
|---|---|---|
| Serial | [PortDock-Serial-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Serial-setup.exe) | [PortDock-Serial-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Serial-portable.zip) |
| Modbus Slave | [PortDock-Modbus-Slave-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Slave-setup.exe) | [PortDock-Modbus-Slave-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Slave-portable.zip) |
| TCP | [PortDock-TCP-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-TCP-setup.exe) | [PortDock-TCP-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-TCP-portable.zip) |
| UDP | [PortDock-UDP-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-UDP-setup.exe) | [PortDock-UDP-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-UDP-portable.zip) |
| Simulator | [PortDock-Simulator-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Simulator-setup.exe) | [PortDock-Simulator-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Simulator-portable.zip) |
| Net Scan | [PortDock-Net-Scan-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Net-Scan-setup.exe) | [PortDock-Net-Scan-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Net-Scan-portable.zip) |
| Modbus Master | [PortDock-Modbus-Master-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Master-setup.exe) | [PortDock-Modbus-Master-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Master-portable.zip) |
| SCPI | [PortDock-SCPI-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-SCPI-setup.exe) | [PortDock-SCPI-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-SCPI-portable.zip) |
| Plot | [PortDock-Plot-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Plot-setup.exe) | [PortDock-Plot-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Plot-portable.zip) |
| Port Inspector | [PortDock-Port-Inspector-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Port-Inspector-setup.exe) | [PortDock-Port-Inspector-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Port-Inspector-portable.zip) |
| PLC Simulator | [PortDock-PLC-Simulator-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-PLC-Simulator-setup.exe) | [PortDock-PLC-Simulator-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-PLC-Simulator-portable.zip) |

Windows 10/11, x64.

With [Scoop](https://scoop.sh) (portable edition): `scoop bucket add portdock https://github.com/portdock/scoop-bucket` → `scoop install portdock/portdock-serial` (app names: [scoop-bucket](https://github.com/portdock/scoop-bucket#install)).

### Installer or portable?

- **Installer** (`-setup.exe`) — installs for the current user only, so **no administrator rights** are needed. Adds a Start menu entry under *PortDock* and an uninstaller.
- **Portable** (`-portable.zip`) — unzip anywhere (a USB stick, a shared folder) and run the exe. Nothing is installed; settings stay in the `portdock-data` folder next to the exe. The folder must be writable.

### "Windows protected your PC"

The builds are **not code-signed yet**, so Microsoft Defender SmartScreen may warn on first run. Click **More info → Run anyway**. Before you do, you can check that the file is the one we published:

```powershell
Get-FileHash .\PortDock-Serial-setup.exe -Algorithm SHA256
```

Compare the result with `SHA256SUMS.txt` attached to the same release. Each release notes also include the Microsoft Defender scan result.

### WebView2

PortDock uses Microsoft Edge WebView2 to draw its window. It is built into Windows 11 and is normally present on up-to-date Windows 10.

- The installer downloads WebView2 automatically if it is missing (this needs internet).
- **Offline PCs**: use `PortDock-<App>-setup-offline.exe`, which bundles the WebView2 runtime (about +130 MB). Alternatively install the *Evergreen Standalone Installer* from <https://developer.microsoft.com/microsoft-edge/webview2/> (download it on another PC and copy it over), then install or run PortDock. The portable edition never installs WebView2 by itself.

### Where data is kept

| | Settings, command lists, rules (WebView2 data) | Error reports |
|---|---|---|
| Installed | `%LOCALAPPDATA%\dev.portdock.<tool>` (e.g. `dev.portdock.serial`) | `%LOCALAPPDATA%\dev.portdock.<tool>\reports` |
| Portable | `portdock-data\` next to the exe | `portdock-data\reports\<tool>` next to the exe (if that folder is not writable: same as installed) |

Settings → *Export settings* saves everything to one JSON file you can move to another PC. Log files go wherever you choose.

## Checks

Every push and pull request is checked on Windows ([ci.yml](.github/workflows/ci.yml)): frontend build and type check of all eleven apps, 230 Node tests (`shared/`, apps, tools), the device register map check (55 devices, 2268 registers), `cargo clippy` with warnings as errors, 312 Rust tests (309 run, 3 ignored), third-party notice and installer text checks, and the website check, tests and build followed by a check of the built pages (titles, links, structured data, sitemap). How the code is organised: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · how to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).

## Build from source

Requirements: Windows 10/11, [Node.js](https://nodejs.org/) 22+, [Rust](https://rustup.rs/) (stable, MSVC), Visual Studio Build Tools with "Desktop development with C++", WebView2.

```powershell
git clone https://github.com/portdock/PortDock
cd PortDock
npm install

npm run serial            # run in development mode (also: modbus-slave, tcp, udp, simulator, netscan, modbus-master, scpi, plot, port-inspector, plc-simulator)
npm run build:serial      # installer → target\release\bundle\nsis\
cargo test --workspace    # tests

# portable build (data next to the exe)
npm run tauri -w portdock-serial -- build --no-bundle --config "$PWD\tools\portable.conf.json"
```

Layout: `apps/<tool>` (each tool's window and Tauri shell), `crates/core` (shared Rust: checksums, HEX/ASCII, framing, Modbus, auto-reply, sessions), `shared/` (shared UI), `site/` (portdock.dev). Release procedure: [docs/release.md](docs/release.md).

## Code signing policy

> **Status: not signed at the moment.** Current releases are **not signed**. We plan to apply again to an open-source signing program (such as SignPath Foundation); the scope and roles below will apply once signing starts.

- **What is signed**: only PortDock's own programs, built by GitHub Actions ([release.yml](.github/workflows/release.yml)) from this repository. Every release is approved manually before signing.
- **Team roles** — PortDock currently has a single maintainer who holds every role ([portdock organisation members](https://github.com/orgs/portdock/people)):
  - Committers and reviewers (Authors, Reviewers): the maintainer — pull requests from others are reviewed before merging
  - Approvers: the maintainer
- **Privacy**: This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. Device traffic goes only where you point it; error reports go to Sentry only when you press send in the «!» report window or set *Automatic error reports* to *Send automatically* (default: *Ask after a crash*). Anonymous usage statistics (feature use counts, minutes open, program/Windows version, display language, installed/portable edition — never traffic, IP addresses, ports, COM names, file paths or PC/user/device names) go to Aptabase (EU) when you close the window, only if you chose *Send* when asked on first run or turned on *Send usage statistics* in Settings (default: off). The update check (from 0.3.0) asks the GitHub API (api.github.com) for the latest release once a day, only if you turn on *Check for new versions (once a day)* in Settings (no data sent, nothing downloaded or installed; default: off). If WebView2 is missing, the online installer downloads it from Microsoft. Details: [privacy policy](https://portdock.dev/privacy/) · [Sentry privacy policy](https://sentry.io/privacy/) · [Aptabase privacy policy](https://aptabase.com/legal/privacy) · [GitHub privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) · [Microsoft privacy statement](https://privacy.microsoft.com/privacystatement) (WebView2). The installer shows this notice on its license page.

## License

Copyright (C) 2026 PortDock

PortDock is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License version 3** ([LICENSE](LICENSE)). It comes with ABSOLUTELY NO WARRANTY.

Third-party components and their licenses are listed in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt), which also ships next to every program.
