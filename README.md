# PortDock

[한국어](README.ko.md)

Free communication tools for testing field hardware on Windows. Each tool is a separate, small download; they share the same communication and decoding core.

| Tool | What it does |
|---|---|
| **PortDock Serial** | Serial (COM) terminal — RS-232/RS-485/USB serial, signal lines (DTR/RTS/CTS/DSR/RI/CD), auto-reconnect after a USB replug, framing, checksums, Modbus RTU decoding, timestamped test logs |
| **PortDock Modbus Slave** | Modbus RTU slave simulator — edit coils and registers in a table and watch the master's requests |
| **PortDock TCP** | TCP client and server — multiple peers, echo, auto-reconnect |
| **PortDock UDP** | UDP sender/receiver — broadcast, multicast, echo |
| **PortDock Simulator** | Rule-based fake device over serial, TCP and UDP — "when this arrives, reply with that" |
| **PortDock Net Scan** | Find devices on an industrial network: ping/ARP sweep, MAC vendor, industrial ports (Modbus 502, MC, XGT …), long-term ping monitor, Wake-on-LAN |
| **PortDock Modbus Master** | Modbus RTU/TCP master (poll tool): several poll tables, typed values (U16–F64, strings, byte orders, 40001 notation), writes 05/06/0F/10, slave ID and address range scan, decoded traffic, statistics, CSV value log, trends |
| **PortDock SCPI** | SCPI instrument terminal over LAN socket (5025) or RS-232, no VISA: query/write/read with response times, `*IDN?` identification, error queue draining, `*OPC?` waits, repeated numeric measurements (table, trend, CSV), block data (#…) with HEX preview and file save |
| **PortDock Plot** | Live plotter for numbers from serial, TCP or UDP: CSV/space/tab text, Arduino-style `name:value`, header names, binary frames (start bytes, u8–f64, endianness, checksum); up to 32 channels on left/right axes, pause, cursor, two-point Δt/Δvalue, zoom; statistics, CSV recording while receiving, CSV/PNG export |

Website: <https://portdock.dev>

## Download

Get the latest version from **[GitHub Releases](https://github.com/juhak0308/PortDock/releases/latest)**. File names never change, so these links always point to the newest release:

| Tool | Installer | Portable |
|---|---|---|
| Serial | [PortDock-Serial-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Serial-setup.exe) | [PortDock-Serial-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Serial-portable.zip) |
| Modbus Slave | [PortDock-Modbus-Slave-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Modbus-Slave-setup.exe) | [PortDock-Modbus-Slave-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Modbus-Slave-portable.zip) |
| TCP | [PortDock-TCP-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-TCP-setup.exe) | [PortDock-TCP-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-TCP-portable.zip) |
| UDP | [PortDock-UDP-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-UDP-setup.exe) | [PortDock-UDP-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-UDP-portable.zip) |
| Simulator | [PortDock-Simulator-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Simulator-setup.exe) | [PortDock-Simulator-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Simulator-portable.zip) |
| Net Scan | [PortDock-Net-Scan-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Net-Scan-setup.exe) | [PortDock-Net-Scan-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Net-Scan-portable.zip) |
| Modbus Master | [PortDock-Modbus-Master-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Modbus-Master-setup.exe) | [PortDock-Modbus-Master-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Modbus-Master-portable.zip) |
| SCPI | [PortDock-SCPI-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-SCPI-setup.exe) | [PortDock-SCPI-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-SCPI-portable.zip) |
| Plot | [PortDock-Plot-setup.exe](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Plot-setup.exe) | [PortDock-Plot-portable.zip](https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Plot-portable.zip) |

Windows 10/11, x64.

### Installer or portable?

- **Installer** (`-setup.exe`) — installs for the current user only, so **no administrator rights** are needed. Adds a Start menu entry under *PortDock* and an uninstaller.
- **Portable** (`-portable.zip`) — unzip anywhere (a USB stick, a shared folder) and run the exe. Nothing is installed; settings stay in the `portdock-data` folder next to the exe. The folder must be writable.

### "Windows protected your PC"

The builds are **not code-signed yet** (an application to SignPath's free open-source signing is planned), so Microsoft Defender SmartScreen may warn on first run. Click **More info → Run anyway**. Before you do, you can check that the file is the one we published:

```powershell
Get-FileHash .\PortDock-Serial-setup.exe -Algorithm SHA256
```

Compare the result with `SHA256SUMS.txt` attached to the same release. Each release also lists a VirusTotal scan link for every file.

### WebView2

PortDock uses Microsoft Edge WebView2 to draw its window. It is built into Windows 11 and is normally present on up-to-date Windows 10.

- The installer downloads WebView2 automatically if it is missing (this needs internet).
- **Offline PCs**: use `PortDock-<App>-setup-offline.exe`, which bundles the WebView2 runtime (about +130 MB). Alternatively install the *Evergreen Standalone Installer* from <https://developer.microsoft.com/microsoft-edge/webview2/> (download it on another PC and copy it over), then install or run PortDock. The portable edition never installs WebView2 by itself.

### Where data is kept

| | Settings, command lists, rules (WebView2 data) | Error reports |
|---|---|---|
| Installed | `%LOCALAPPDATA%\dev.portdock.<tool>` (e.g. `dev.portdock.serial`) | `%LOCALAPPDATA%\PortDock\reports\<tool>` |
| Portable | `portdock-data\` next to the exe | `%LOCALAPPDATA%\PortDock\reports\<tool>` |

Settings → *Export settings* saves everything to one JSON file you can move to another PC. Log files go wherever you choose.

## Build from source

Requirements: Windows 10/11, [Node.js](https://nodejs.org/) 22+, [Rust](https://rustup.rs/) (stable, MSVC), Visual Studio Build Tools with "Desktop development with C++", WebView2.

```powershell
git clone https://github.com/juhak0308/PortDock
cd PortDock
npm install

npm run serial            # run in development mode (also: modbus-slave, tcp, udp, simulator)
npm run build:serial      # installer → target\release\bundle\nsis\
cargo test --workspace    # tests

# portable build (data next to the exe)
npm run tauri -w portdock-serial -- build --no-bundle --config "$PWD\tools\portable.conf.json"
```

Layout: `apps/<tool>` (each tool's window and Tauri shell), `crates/core` (shared Rust: checksums, HEX/ASCII, framing, Modbus, auto-reply, sessions), `shared/` (shared UI), `site/` (portdock.dev). Release procedure: [docs/release.md](docs/release.md).

## License

Copyright (C) 2026 Juhak

PortDock is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License version 3** ([LICENSE](LICENSE)). It comes with ABSOLUTELY NO WARRANTY.

Third-party components and their licenses are listed in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt), which also ships next to every program.
