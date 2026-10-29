//! Wi-Fi 신호·채널(Hardware Tester «Wi-Fi 신호») — Native Wifi API(wlanapi.dll)를 **부를 때만 불러 쓴다**(LoadLibraryExW·GetProcAddress).
//! 무선 랜 서비스가 없는 Windows Server(CI 러너)에는 wlanapi.dll 이 없을 수 있어, 정적으로 이으면 실행 파일이 아예 뜨지 않는다.
//!
//! 읽는 것: 지금 연결의 신호 품질(%)·RSSI(dBm)·링크 속도·무선 규격, 연결된 AP 의 주파수(→ 대역·채널), 주변 AP 의 **채널별 개수만**.
//! 네트워크 이름(SSID)·AP 주소(BSSID)는 꺼내지 않는다 — 연결된 AP 를 목록에서 찾을 때 메모리 안에서 BSSID 를 비교만 하고 버린다.
//! 스캔(WlanScan)은 하지 않는다 — Windows 가 이미 가진 목록만 읽는다. 설정을 바꾸는 호출은 없다.
//! Windows 11 24H2 부터 이 값들은 위치 권한이 있어야 읽힌다(없으면 ERROR_ACCESS_DENIED) —
//! https://learn.microsoft.com/en-us/windows/win32/nativewifi/wi-fi-access-location-changes

use serde::Serialize;

/// 채널 하나의 AP 개수(이름 없이)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelCount {
    /// «2.4» · «5» · «6»
    pub band: &'static str,
    pub channel: u32,
    pub count: u32,
    /// 지금 연결된 AP 의 채널인지
    pub mine: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiSignal {
    /// «ok» 읽음 · «denied» 위치 권한 없음(또는 위치 서비스 꺼짐) · «noWlan» wlanapi.dll·무선 랜 서비스 없음 ·
    /// «noAdapter» Wi-Fi 어댑터 없음 · «notConnected» 연결 안 됨 · «error» 그 밖
    pub state: &'static str,
    /// 신호 품질 0~100(%)
    pub quality: Option<u32>,
    /// dBm
    pub rssi: Option<i32>,
    /// 받기·보내기 링크 속도(Mbps)
    pub rx_mbps: Option<u32>,
    pub tx_mbps: Option<u32>,
    /// «802.11ax» 같은 규격 이름
    pub phy: Option<&'static str>,
    pub band: Option<&'static str>,
    pub channel: Option<u32>,
    /// 주변 AP 의 채널별 개수(Windows 가 가진 목록 그대로, 스캔 없음)
    pub channels: Vec<ChannelCount>,
    pub error: Option<String>,
}

/// 중심 주파수(kHz) → (대역, 채널). 모르는 주파수면 None
pub fn channel_of(khz: u32) -> Option<(&'static str, u32)> {
    let mhz = khz / 1000;
    match mhz {
        2484 => Some(("2.4", 14)),
        2412..=2472 if (mhz - 2407).is_multiple_of(5) => Some(("2.4", (mhz - 2407) / 5)),
        // 6GHz 는 5955 MHz = 1번(5950 + 5×채널), 5935 MHz = 2번
        5935 => Some(("6", 2)),
        5955..=7115 if (mhz - 5950).is_multiple_of(5) => Some(("6", (mhz - 5950) / 5)),
        5160..=5925 if (mhz - 5000).is_multiple_of(5) => Some(("5", (mhz - 5000) / 5)),
        _ => None,
    }
}

/// DOT11_PHY_TYPE → 규격 이름
pub fn phy_name(t: i32) -> Option<&'static str> {
    Some(match t {
        4 => "802.11a",
        5 => "802.11b",
        6 => "802.11g",
        7 => "802.11n",
        8 => "802.11ad",
        9 => "802.11ac",
        10 => "802.11ax",
        11 => "802.11be",
        _ => return None,
    })
}

/// (주파수 kHz, 연결된 AP 인지) 목록 → 채널별 개수. 대역·채널 순
pub fn count_channels(entries: impl IntoIterator<Item = (u32, bool)>) -> Vec<ChannelCount> {
    let mut out: Vec<ChannelCount> = Vec::new();
    for (khz, mine) in entries {
        let Some((band, channel)) = channel_of(khz) else { continue };
        match out.iter_mut().find(|c| c.band == band && c.channel == channel) {
            Some(c) => {
                c.count += 1;
                c.mine |= mine;
            }
            None => out.push(ChannelCount { band, channel, count: 1, mine }),
        }
    }
    let order = |b: &str| match b {
        "2.4" => 0,
        "5" => 1,
        _ => 2,
    };
    out.sort_by_key(|c| (order(c.band), c.channel));
    out
}

#[cfg(windows)]
mod imp {
    use super::*;
    use std::ffi::c_void;
    use windows_sys::Win32::Foundation::{ERROR_ACCESS_DENIED, FreeLibrary, HANDLE, HMODULE};
    use windows_sys::Win32::NetworkManagement::WiFi::{
        WLAN_BSS_ENTRY, WLAN_BSS_LIST, WLAN_CONNECTION_ATTRIBUTES, WLAN_INTERFACE_INFO, WLAN_INTERFACE_INFO_LIST, dot11_BSS_type_any, wlan_interface_state_connected,
        wlan_intf_opcode_current_connection, wlan_intf_opcode_rssi,
    };
    use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LOAD_LIBRARY_SEARCH_SYSTEM32, LoadLibraryExW};
    use windows_sys::core::GUID;

    type Open = unsafe extern "system" fn(u32, *const c_void, *mut u32, *mut HANDLE) -> u32;
    type Close = unsafe extern "system" fn(HANDLE, *const c_void) -> u32;
    type Enum = unsafe extern "system" fn(HANDLE, *const c_void, *mut *mut WLAN_INTERFACE_INFO_LIST) -> u32;
    type Query = unsafe extern "system" fn(HANDLE, *const GUID, i32, *const c_void, *mut u32, *mut *mut c_void, *mut i32) -> u32;
    type BssList = unsafe extern "system" fn(HANDLE, *const GUID, *const c_void, i32, i32, *const c_void, *mut *mut WLAN_BSS_LIST) -> u32;
    type Free = unsafe extern "system" fn(*const c_void);

    struct Lib(HMODULE);
    impl Drop for Lib {
        fn drop(&mut self) {
            // SAFETY: LoadLibraryExW 가 준 모듈
            unsafe { FreeLibrary(self.0) };
        }
    }

    struct Api {
        _lib: Lib,
        open: Open,
        close: Close,
        enumerate: Enum,
        query: Query,
        bss: BssList,
        free: Free,
    }

    fn load() -> Option<Api> {
        let name: Vec<u16> = "wlanapi.dll".encode_utf16().chain(Some(0)).collect();
        // SAFETY: System32 에서만 찾는다(현재 폴더의 같은 이름 DLL 을 쓰지 않게)
        let m = unsafe { LoadLibraryExW(name.as_ptr(), std::ptr::null_mut(), LOAD_LIBRARY_SEARCH_SYSTEM32) };
        if m.is_null() {
            return None;
        }
        let lib = Lib(m);
        // SAFETY: 이름은 널로 끝나는 ASCII. 받은 주소는 Native Wifi 문서의 함수 모양으로만 부른다
        macro_rules! f {
            ($n:literal, $t:ty) => {
                unsafe { std::mem::transmute::<unsafe extern "system" fn() -> isize, $t>(GetProcAddress(lib.0, concat!($n, "\0").as_ptr())?) }
            };
        }
        Some(Api {
            open: f!("WlanOpenHandle", Open),
            close: f!("WlanCloseHandle", Close),
            enumerate: f!("WlanEnumInterfaces", Enum),
            query: f!("WlanQueryInterface", Query),
            bss: f!("WlanGetNetworkBssList", BssList),
            free: f!("WlanFreeMemory", Free),
            _lib: lib,
        })
    }

    fn err(code: u32) -> String {
        std::io::Error::from_raw_os_error(code as i32).to_string()
    }

    pub fn signal() -> WifiSignal {
        let mut out = WifiSignal { state: "error", ..Default::default() };
        let Some(api) = load() else {
            out.state = "noWlan";
            return out;
        };
        let (mut ver, mut h): (u32, HANDLE) = (0, std::ptr::null_mut());
        // SAFETY: 클라이언트 버전 2(Vista 이후)
        let r = unsafe { (api.open)(2, std::ptr::null(), &mut ver, &mut h) };
        if r != 0 {
            // 무선 랜 서비스(WlanSvc)가 없거나 멈춤
            out.state = "noWlan";
            out.error = Some(err(r));
            return out;
        }
        struct H<'a>(&'a Api, HANDLE);
        impl Drop for H<'_> {
            fn drop(&mut self) {
                // SAFETY: open 이 준 손잡이
                unsafe { (self.0.close)(self.1, std::ptr::null()) };
            }
        }
        let h = H(&api, h);
        let mut list: *mut WLAN_INTERFACE_INFO_LIST = std::ptr::null_mut();
        // SAFETY: 목록은 WlanFreeMemory 로 돌려준다
        let r = unsafe { (api.enumerate)(h.1, std::ptr::null(), &mut list) };
        if r != 0 || list.is_null() {
            out.error = Some(err(r));
            return out;
        }
        // SAFETY: dwNumberOfItems 개가 InterfaceInfo 에서 이어진다
        let ifs: Vec<WLAN_INTERFACE_INFO> = unsafe { std::slice::from_raw_parts((*list).InterfaceInfo.as_ptr(), (*list).dwNumberOfItems as usize).to_vec() };
        unsafe { (api.free)(list as *const c_void) };
        if ifs.is_empty() {
            out.state = "noAdapter";
            return out;
        }
        // 연결된 어댑터가 먼저
        let Some(i) = ifs.iter().find(|i| i.isState == wlan_interface_state_connected) else {
            out.state = "notConnected";
            // 연결이 없어도 주변 채널 개수는 읽어 본다(권한 확인을 겸함)
            match bss(&api, h.1, &ifs[0].InterfaceGuid, None) {
                Ok(c) => out.channels = c,
                Err(ERROR_ACCESS_DENIED) => out.state = "denied",
                Err(_) => {}
            }
            return out;
        };
        let guid = i.InterfaceGuid;
        let (mut size, mut data, mut kind) = (0u32, std::ptr::null_mut::<c_void>(), 0i32);
        // SAFETY: 결과는 WLAN_CONNECTION_ATTRIBUTES — 숫자 칸만 옮기고 바로 돌려준다(이름·주소 칸은 읽지 않는다)
        let r = unsafe { (api.query)(h.1, &guid, wlan_intf_opcode_current_connection, std::ptr::null(), &mut size, &mut data, &mut kind) };
        if r == ERROR_ACCESS_DENIED {
            out.state = "denied";
            return out;
        }
        if r != 0 || data.is_null() || (size as usize) < std::mem::size_of::<WLAN_CONNECTION_ATTRIBUTES>() {
            out.error = Some(err(r));
            return out;
        }
        let bssid = {
            // SAFETY: 크기를 위에서 확인했다
            let a = unsafe { &(*(data as *const WLAN_CONNECTION_ATTRIBUTES)).wlanAssociationAttributes };
            out.quality = Some(a.wlanSignalQuality.min(100));
            out.rx_mbps = Some(a.ulRxRate / 1000);
            out.tx_mbps = Some(a.ulTxRate / 1000);
            out.phy = phy_name(a.dot11PhyType);
            a.dot11Bssid
        };
        unsafe { (api.free)(data) };
        let (mut size, mut data) = (0u32, std::ptr::null_mut::<c_void>());
        // SAFETY: 결과는 LONG(dBm)
        if unsafe { (api.query)(h.1, &guid, wlan_intf_opcode_rssi, std::ptr::null(), &mut size, &mut data, &mut kind) } == 0 && !data.is_null() {
            if size as usize >= 4 {
                out.rssi = Some(unsafe { *(data as *const i32) });
            }
            unsafe { (api.free)(data) };
        }
        match bss(&api, h.1, &guid, Some(bssid)) {
            Ok(c) => {
                if let Some(m) = c.iter().find(|c| c.mine) {
                    out.band = Some(m.band);
                    out.channel = Some(m.channel);
                }
                out.channels = c;
            }
            Err(ERROR_ACCESS_DENIED) => {
                out.state = "denied";
                return out;
            }
            Err(e) => out.error = Some(err(e)),
        }
        out.state = "ok";
        out
    }

    /// Windows 가 가진 주변 AP 목록 → 채널별 개수. `mine` 이면 그 BSSID 의 채널에 표시(비교만 하고 버린다)
    fn bss(api: &Api, h: HANDLE, guid: &GUID, mine: Option<[u8; 6]>) -> Result<Vec<ChannelCount>, u32> {
        let mut list: *mut WLAN_BSS_LIST = std::ptr::null_mut();
        // SAFETY: SSID 거르기 없음(널), 모든 BSS 종류, 목록은 WlanFreeMemory 로 돌려준다
        let r = unsafe { (api.bss)(h, guid, std::ptr::null(), dot11_BSS_type_any, 0, std::ptr::null(), &mut list) };
        if r != 0 || list.is_null() {
            return Err(r);
        }
        // SAFETY: dwNumberOfItems 개가 wlanBssEntries 에서 이어진다
        let entries: &[WLAN_BSS_ENTRY] = unsafe { std::slice::from_raw_parts((*list).wlanBssEntries.as_ptr(), (*list).dwNumberOfItems as usize) };
        let counts = count_channels(entries.iter().map(|e| (e.ulChCenterFrequency, mine == Some(e.dot11Bssid))));
        unsafe { (api.free)(list as *const c_void) };
        Ok(counts)
    }
}

/// 지금 Wi-Fi 신호·채널 — 사용자가 «신호 보기» 를 켰을 때만 부른다
pub fn signal() -> WifiSignal {
    #[cfg(windows)]
    {
        imp::signal()
    }
    #[cfg(not(windows))]
    {
        WifiSignal { state: "noWlan", ..Default::default() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn channels() {
        assert_eq!(channel_of(2_412_000), Some(("2.4", 1)));
        assert_eq!(channel_of(2_437_000), Some(("2.4", 6)));
        assert_eq!(channel_of(2_484_000), Some(("2.4", 14)));
        assert_eq!(channel_of(5_180_000), Some(("5", 36)));
        assert_eq!(channel_of(5_825_000), Some(("5", 165)));
        assert_eq!(channel_of(5_955_000), Some(("6", 1)));
        assert_eq!(channel_of(6_115_000), Some(("6", 33)));
        assert_eq!(channel_of(5_935_000), Some(("6", 2)));
        assert_eq!(channel_of(0), None);
        assert_eq!(channel_of(2_413_000), None);
    }

    #[test]
    fn counts_by_channel_without_names() {
        let c = count_channels([(2_437_000, false), (5_180_000, true), (2_437_000, false), (2_412_000, false), (9, false)]);
        assert_eq!(c.len(), 3);
        assert_eq!((c[0].band, c[0].channel, c[0].count, c[0].mine), ("2.4", 1, 1, false));
        assert_eq!((c[1].band, c[1].channel, c[1].count), ("2.4", 6, 2));
        assert_eq!((c[2].band, c[2].channel, c[2].count, c[2].mine), ("5", 36, 1, true));
        // 화면으로 가는 모양에 이름·주소 칸이 없다
        let v = serde_json::to_value(&c[0]).unwrap();
        let keys: Vec<&String> = v.as_object().unwrap().keys().collect();
        assert_eq!(keys, ["band", "channel", "count", "mine"]);
    }

    #[test]
    fn phy() {
        assert_eq!(phy_name(10), Some("802.11ax"));
        assert_eq!(phy_name(0), None);
    }

    /// 이 PC 에서 불러 본다 — 서버(CI)에는 wlanapi.dll·서비스가 없을 수 있다(«noWlan»). 어떤 경우에도 죽지 않고 정해진 상태 하나.
    /// Windows 11 24H2 는 이 호출에 위치 권한 묻는 창을 띄울 수 있어 기본으로는 돌리지 않는다:
    /// cargo test -p portdock-core signal_never_panics -- --ignored
    #[test]
    #[ignore]
    fn signal_never_panics() {
        let s = signal();
        assert!(["ok", "denied", "noWlan", "noAdapter", "notConnected", "error"].contains(&s.state), "{s:?}");
        assert!(s.quality.is_none_or(|q| q <= 100));
        let v = serde_json::to_value(&s).unwrap();
        let text = v.to_string().to_lowercase();
        assert!(!text.contains("ssid") && !text.contains("bssid"));
    }
}
