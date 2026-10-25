//! 표 — 장치 관리자 문제 코드, USB VID/PID → 칩 이름. 화면 언어와 무관하게 한국어·영어를 함께 넘긴다
//! (화면이 언어를 바꿔도 다시 읽지 않게).
//!
//! 문제 코드의 뜻: Microsoft «Device Manager error messages»
//! (https://learn.microsoft.com/windows-hardware/drivers/install/device-manager-error-messages) 의 메시지를 줄여 옮겼다.
//! «해결» 칸은 같은 문서의 권장 조치를 바탕으로 USB-시리얼 변환기에서 먼저 해 볼 것만 적었다.
//!
//! 칩 표: 제조사가 공개한 VID(USB-IF 할당)와, 제조사 문서·리눅스 커널 드라이버(ftdi_sio·pl2303·ch341·cp210x)의
//! 장치 표에 실린 PID 만 넣었다. 같은 VID/PID 를 쓰는 복제품도 있으므로 «칩 이름» 은 장치가 알려 준 번호로 본 이름일 뿐이다.

use serde::Serialize;

/// 한국어·영어 한 쌍
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Text {
    pub ko: String,
    pub en: String,
}

pub(crate) fn text(ko: &str, en: &str) -> Text {
    Text { ko: ko.into(), en: en.into() }
}

/// 문제 코드 하나의 뜻과 해 볼 것
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Problem {
    pub code: u32,
    pub meaning: Text,
    pub action: Text,
}

/// 장치 관리자 문제 코드 → 뜻·해 볼 것. 표에 없는 번호는 번호만(뜻은 Microsoft 문서 안내)
pub fn problem(code: u32) -> Problem {
    let (mk, me, ak, ae): (&str, &str, &str, &str) = match code {
        1 => ("장치가 올바르게 구성되지 않았습니다.", "This device is not configured correctly.", "드라이버를 업데이트하거나 다시 설치합니다.", "Update or reinstall the driver."),
        3 => (
            "드라이버가 손상됐거나 메모리·자원이 부족할 수 있습니다.",
            "The driver may be corrupted, or the system may be low on memory or other resources.",
            "다른 프로그램을 닫고, 드라이버를 지웠다가 다시 설치합니다.",
            "Close other programs, then uninstall and reinstall the driver.",
        ),
        10 => (
            "장치를 시작할 수 없습니다.",
            "This device cannot start.",
            "변환기를 뺐다가 다른 USB 포트에 꽂고(허브 말고 PC 에 바로), 제조사 드라이버를 다시 설치합니다. 옛 칩·복제 칩이 새 드라이버에서 이 코드를 내는 경우가 있습니다.",
            "Unplug the adapter, plug it into another USB port (directly, not via a hub) and reinstall the vendor driver. Old or cloned chips can show this code with newer drivers.",
        ),
        12 => (
            "이 장치가 쓸 수 있는 자원이 모자랍니다.",
            "This device cannot find enough free resources that it can use.",
            "다른 장치와 자원이 겹칩니다 — 쓰지 않는 장치를 끄거나 다른 슬롯·포트를 씁니다.",
            "It conflicts with another device — disable unused devices or use another slot or port.",
        ),
        14 => ("PC 를 다시 시작해야 이 장치가 동작합니다.", "This device cannot work properly until you restart your computer.", "PC 를 다시 시작합니다.", "Restart the computer."),
        18 => ("이 장치의 드라이버를 다시 설치해야 합니다.", "Reinstall the drivers for this device.", "드라이버를 다시 설치합니다.", "Reinstall the driver."),
        19 => (
            "레지스트리의 구성 정보가 불완전하거나 손상됐습니다.",
            "Windows cannot start this device because its configuration information (in the registry) is incomplete or damaged.",
            "장치를 제거(장치 관리자)한 뒤 다시 꽂아 새로 설치합니다.",
            "Uninstall the device in Device Manager and plug it in again so it is installed fresh.",
        ),
        21 => ("Windows 가 이 장치를 제거하는 중입니다.", "Windows is removing this device.", "잠시 기다린 뒤 목록을 다시 읽거나 PC 를 다시 시작합니다.", "Wait a moment and refresh, or restart the computer."),
        22 => ("장치가 사용 안 함으로 되어 있습니다.", "This device is disabled.", "장치 관리자에서 장치를 «사용» 으로 바꿉니다.", "Enable the device in Device Manager."),
        24 => (
            "장치가 없거나, 제대로 동작하지 않거나, 드라이버가 다 설치되지 않았습니다.",
            "This device is not present, is not working properly, or does not have all its drivers installed.",
            "다시 꽂고, 드라이버를 다시 설치합니다.",
            "Plug it in again and reinstall the driver.",
        ),
        28 => (
            "이 장치의 드라이버가 설치되지 않았습니다.",
            "The drivers for this device are not installed.",
            "칩 제조사(FTDI·Prolific·WCH·Silicon Labs 등) 드라이버를 설치합니다. 칩 이름은 위 «칩» 칸을 봅니다.",
            "Install the chip vendor's driver (FTDI, Prolific, WCH, Silicon Labs …). See the «Chip» field above.",
        ),
        29 => (
            "장치 펌웨어가 필요한 자원을 주지 않아 꺼져 있습니다.",
            "This device is disabled because its firmware did not give it the required resources.",
            "BIOS/UEFI 설정에서 그 장치(내장 COM 등)가 켜져 있는지 봅니다.",
            "Check that the device (e.g. an onboard COM port) is enabled in the BIOS/UEFI setup.",
        ),
        31 => (
            "필요한 드라이버를 불러오지 못해 제대로 동작하지 않습니다.",
            "This device is not working properly because Windows cannot load the drivers required for this device.",
            "드라이버를 다시 설치합니다.",
            "Reinstall the driver.",
        ),
        32 => ("이 장치의 드라이버(서비스)가 꺼져 있습니다.", "A driver (service) for this device has been disabled.", "드라이버를 다시 설치합니다.", "Reinstall the driver."),
        33 => ("이 장치에 필요한 자원을 알 수 없습니다.", "Windows cannot determine which resources are required for this device.", "장치를 다른 포트·슬롯으로 옮기거나 바꿉니다.", "Move the device to another port or slot, or replace it."),
        34 => ("이 장치의 설정을 알 수 없습니다.", "Windows cannot determine the settings for this device.", "장치 설명서대로 자원을 직접 정하거나 장치를 바꿉니다.", "Configure its resources as the manual says, or replace the device."),
        35 => (
            "시스템 펌웨어에 이 장치를 구성할 정보가 없습니다.",
            "The system firmware does not include enough information to configure this device.",
            "메인보드 제조사에서 BIOS/UEFI 업데이트를 받습니다.",
            "Get a BIOS/UEFI update from the mainboard maker.",
        ),
        37 => ("장치 드라이버를 초기화하지 못했습니다.", "Windows cannot initialize the device driver for this hardware.", "드라이버를 다시 설치합니다.", "Reinstall the driver."),
        38 => (
            "이전 드라이버가 아직 메모리에 남아 있어 불러오지 못했습니다.",
            "Windows cannot load the driver because a previous instance of the driver is still in memory.",
            "PC 를 다시 시작합니다.",
            "Restart the computer.",
        ),
        39 => ("드라이버를 불러오지 못했습니다(손상되거나 없음).", "Windows cannot load the device driver. The driver may be corrupted or missing.", "드라이버를 다시 설치합니다.", "Reinstall the driver."),
        40 => (
            "레지스트리의 서비스 정보가 없거나 잘못됐습니다.",
            "The service key information in the registry is missing or recorded incorrectly.",
            "드라이버를 다시 설치합니다.",
            "Reinstall the driver.",
        ),
        41 => (
            "드라이버는 불러왔지만 장치를 찾지 못했습니다.",
            "Windows loaded the driver but cannot find the hardware device.",
            "다시 꽂고, 그래도 같으면 드라이버를 다시 설치합니다.",
            "Plug it in again; if it stays, reinstall the driver.",
        ),
        42 => (
            "같은 장치가 이미 돌고 있어 드라이버를 불러오지 못했습니다.",
            "There is a duplicate device already running in the system.",
            "PC 를 다시 시작합니다. 같은 일련번호의 변환기 두 개가 꽂혀 있지 않은지 봅니다.",
            "Restart the computer. Check that two adapters with the same serial number are not plugged in.",
        ),
        43 => (
            "장치가 문제를 알려 와서 Windows 가 장치를 멈췄습니다.",
            "Windows has stopped this device because it has reported problems.",
            "뺐다가 다시 꽂고, 다른 USB 포트·케이블을 써 봅니다. 허브를 거치면 빼고 PC 에 바로 꽂습니다.",
            "Unplug and replug, try another USB port and cable. If a hub is in between, plug directly into the PC.",
        ),
        44 => ("프로그램이나 서비스가 이 장치를 껐습니다.", "An application or service has shut down this hardware device.", "PC 를 다시 시작합니다.", "Restart the computer."),
        45 => (
            "지금 이 장치가 PC 에 연결돼 있지 않습니다.",
            "Currently, this hardware device is not connected to the computer.",
            "다시 꽂으면 사라집니다. 더 쓰지 않는 장치라면 장치 관리자에서 제거해도 됩니다.",
            "It clears when you plug it back in. If you no longer use it, you may uninstall it in Device Manager.",
        ),
        46 => ("Windows 가 종료하는 중이라 장치에 접근할 수 없습니다.", "Windows cannot access this device because the operating system is shutting down.", "PC 를 다시 시작합니다.", "Restart the computer."),
        47 => (
            "«안전하게 제거» 됐지만 아직 빼지 않았습니다.",
            "The device has been prepared for safe removal, but it has not been removed from the computer.",
            "뺐다가 다시 꽂습니다.",
            "Unplug it and plug it in again.",
        ),
        48 => (
            "Windows 와 문제가 알려진 소프트웨어라 시작이 막혔습니다.",
            "The software for this device has been blocked from starting because it is known to have problems with Windows.",
            "제조사에서 새 드라이버를 받습니다.",
            "Get a newer driver from the vendor.",
        ),
        49 => ("시스템 하이브가 너무 커서 새 장치를 시작할 수 없습니다.", "Windows cannot start new hardware devices because the system hive is too large.", "쓰지 않는 장치를 제거합니다.", "Uninstall devices that are no longer used."),
        50 => ("이 장치의 속성을 모두 적용하지 못했습니다.", "Windows cannot apply all of the properties for this device.", "제조사에서 새 드라이버를 받습니다.", "Get a newer driver from the vendor."),
        51 => ("다른 장치가 시작되기를 기다리는 중입니다.", "This device is currently waiting on another device or set of devices to start.", "잠시 기다리거나, 먼저 시작해야 할 장치의 문제를 봅니다.", "Wait, or check the device it depends on."),
        52 => (
            "드라이버의 디지털 서명을 확인할 수 없습니다.",
            "Windows cannot verify the digital signature for the drivers required for this device.",
            "서명된 드라이버를 제조사에서 받아 설치합니다.",
            "Install a signed driver from the vendor.",
        ),
        53 => ("Windows 커널 디버거용으로 예약된 장치입니다.", "This device has been reserved for use by the Windows kernel debugger.", "커널 디버깅 설정을 끕니다.", "Turn off kernel debugging."),
        54 => ("장치가 실패해 초기화(재설정) 중입니다.", "This device has failed and is undergoing a reset.", "잠시 기다린 뒤 다시 읽습니다.", "Wait and refresh."),
        _ => (
            "표에 없는 문제 코드입니다.",
            "This problem code is not in the table.",
            "Microsoft 문서 «Device Manager error messages» 에서 번호로 찾습니다.",
            "Look the number up in Microsoft's «Device Manager error messages».",
        ),
    };
    Problem { code, meaning: text(mk, me), action: text(ak, ae) }
}

/// VID/PID 로 본 칩
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Chip {
    pub vendor: String,
    /// PID 까지 알면 칩 이름(모르면 None — 제조사만)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chip: Option<String>,
    /// 알아 둘 것(«볼 것» 단서)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<Text>,
    /// 화면이 «볼 것» 이상으로 보일 단서인지
    pub clue: bool,
}

/// 제조사 VID
fn vendor(vid: u16) -> Option<&'static str> {
    Some(match vid {
        0x0403 => "FTDI",
        0x067B => "Prolific",
        0x1A86 => "WCH (Nanjing Qinheng)",
        0x10C4 => "Silicon Labs",
        0x04D8 => "Microchip",
        0x0483 => "STMicroelectronics",
        0x2341 => "Arduino",
        0x303A => "Espressif",
        0x2E8A => "Raspberry Pi",
        _ => return None,
    })
}

/// VID/PID → 칩. 모르는 VID 면 None
pub fn chip(vid: u16, pid: u16) -> Option<Chip> {
    let v = vendor(vid)?;
    let name: Option<&str> = match (vid, pid) {
        (0x0403, 0x6001) => Some("FT232R / FT232BM / FT245R"),
        (0x0403, 0x6010) => Some("FT2232C/D/H"),
        (0x0403, 0x6011) => Some("FT4232H"),
        (0x0403, 0x6014) => Some("FT232H"),
        (0x0403, 0x6015) => Some("FT-X (FT230X / FT231X / FT234XD …)"),
        (0x067B, 0x2303) => Some("PL2303 (HX/HXD/TA/RA …)"),
        (0x067B, 0x23A3) => Some("PL2303GC"),
        (0x067B, 0x23B3) => Some("PL2303GB"),
        (0x067B, 0x23C3) => Some("PL2303GT"),
        (0x067B, 0x23D3) => Some("PL2303GL"),
        (0x067B, 0x23E3) => Some("PL2303GE"),
        (0x067B, 0x23F3) => Some("PL2303GS"),
        (0x1A86, 0x7523) => Some("CH340 / CH341"),
        (0x1A86, 0x7522) => Some("CH340"),
        (0x1A86, 0x5523) => Some("CH341"),
        (0x1A86, 0x55D3) => Some("CH343"),
        (0x1A86, 0x55D4) => Some("CH9102"),
        (0x10C4, 0xEA60) => Some("CP210x (CP2102 / CP2102N / CP2104 …)"),
        (0x10C4, 0xEA70) => Some("CP2105"),
        (0x10C4, 0xEA71) => Some("CP2108"),
        (0x0483, 0x5740) => Some("STM32 Virtual COM Port (USB CDC)"),
        _ => None,
    };
    let (note, clue) = match (vid, pid) {
        (0x0403, 0x0000) => (
            Some(text(
                "PID 가 0000 입니다 — 2014년 FTDI 윈도우 드라이버가 복제 칩의 PID 를 0 으로 바꾼 일이 있었고, 그런 칩에서 보이는 값입니다(단정할 수는 없음).",
                "PID is 0000 — in 2014 an FTDI Windows driver rewrote the PID of cloned chips to 0, and such chips show this value (not conclusive).",
            )),
            true,
        ),
        (0x067B, 0x2303) => (
            Some(text(
                "PL2303 옛 리비전(HXA·XA)은 제조사가 단종해 Windows 8 이후 드라이버가 지원하지 않습니다. 리비전은 VID/PID 만으로 가릴 수 없습니다 — 문제 코드 10 이 함께 보이면 의심합니다.",
                "Old PL2303 revisions (HXA, XA) are discontinued and not supported by drivers for Windows 8 and later. The revision cannot be told from VID/PID alone — suspect it when problem code 10 shows too.",
            )),
            false,
        ),
        _ => (None, false),
    };
    Some(Chip { vendor: v.into(), chip: name.map(Into::into), note, clue })
}

/// 장치 인스턴스 ID·하드웨어 ID 에서 VID·PID 를 꺼낸다(«USB\VID_0403&PID_6001\…», «FTDIBUS\VID_0403+PID_6001+…»)
pub fn vid_pid(id: &str) -> Option<(u16, u16)> {
    let up = id.to_ascii_uppercase();
    let hex4 = |s: &str| -> Option<u16> {
        let h: String = s.chars().take(4).collect();
        if h.len() == 4 { u16::from_str_radix(&h, 16).ok() } else { None }
    };
    let v = up.find("VID_").and_then(|i| hex4(&up[i + 4..]))?;
    let p = up.find("PID_").and_then(|i| hex4(&up[i + 4..]))?;
    Some((v, p))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_problem_codes() {
        let p = problem(10);
        assert_eq!(p.code, 10);
        assert!(p.meaning.en.contains("cannot start"));
        assert!(p.meaning.ko.contains("시작할 수 없"));
        assert!(problem(28).action.ko.contains("드라이버"));
        assert!(problem(43).meaning.en.contains("reported problems"));
        assert!(problem(45).meaning.en.contains("not connected"));
        // 표에 없는 번호도 번호는 그대로
        let u = problem(999);
        assert_eq!(u.code, 999);
        assert!(u.action.en.contains("Device Manager error messages"));
        // 표의 모든 번호에 한국어·영어가 다 있다
        for c in 0..60 {
            let p = problem(c);
            assert!(!p.meaning.ko.is_empty() && !p.meaning.en.is_empty() && !p.action.ko.is_empty() && !p.action.en.is_empty());
        }
    }

    #[test]
    fn chips_by_vid_pid() {
        assert_eq!(chip(0x0403, 0x6001).unwrap().chip.as_deref(), Some("FT232R / FT232BM / FT245R"));
        assert_eq!(chip(0x1A86, 0x7523).unwrap().vendor, "WCH (Nanjing Qinheng)");
        assert_eq!(chip(0x10C4, 0xEA60).unwrap().chip.as_deref(), Some("CP210x (CP2102 / CP2102N / CP2104 …)"));
        // 제조사만 아는 PID
        let c = chip(0x0403, 0x1234).unwrap();
        assert_eq!(c.vendor, "FTDI");
        assert!(c.chip.is_none() && !c.clue);
        // 단서
        let z = chip(0x0403, 0x0000).unwrap();
        assert!(z.clue && z.note.unwrap().en.contains("2014"));
        assert!(chip(0x067B, 0x2303).unwrap().note.is_some());
        assert!(chip(0x1234, 0x5678).is_none());
    }

    #[test]
    fn vid_pid_from_ids() {
        assert_eq!(vid_pid(r"USB\VID_0403&PID_6001\A12345"), Some((0x0403, 0x6001)));
        assert_eq!(vid_pid(r"FTDIBUS\VID_0403+PID_6001+A12345A\0000"), Some((0x0403, 0x6001)));
        assert_eq!(vid_pid(r"usb\vid_1a86&pid_7523\5&1234&0&2"), Some((0x1A86, 0x7523)));
        assert_eq!(vid_pid(r"USB\VID_10C4&PID_EA60&MI_00\6&abc"), Some((0x10C4, 0xEA60)));
        assert_eq!(vid_pid(r"ACPI\PNP0501\0"), None);
        assert_eq!(vid_pid(r"USB\VID_12"), None);
    }
}
