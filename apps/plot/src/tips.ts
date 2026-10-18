// Plot 말풍선 — 이 앱에만 있는 칸. 공통 칸(포트·속도·데이터 비트 …)은 shared/tips.ts 의 것을 그대로 쓴다.
// (shared/tips.ts 로 옮길 때는 키 앞에 «pl» 을 붙인 그대로 옮기면 된다)
import { tip as sharedTip } from "@shared/tips";

type Tip = [ko: string, en: string];

const TIPS: Record<string, Tip> = {
  plTransport: [
    "숫자가 들어오는 곳. 시리얼(USB 보드·변환기), TCP 클라이언트(이 PC 가 장비의 포트에 접속), UDP 받기(장비가 이 PC 의 포트로 보냄).",
    "Where the numbers come from: serial (USB boards, adapters), TCP client (this PC connects to the device's port) or UDP receive (the device sends to a port on this PC).",
  ],
  plSerialAdv: ["DTR·자동 재연결. 흐름 제어는 쓰지 않습니다.", "DTR and auto reconnect. Flow control is not used."],
  plDtr: [
    "포트를 열 때 DTR 을 켭니다. 네이티브 USB 보드(Leonardo·ESP32-S2/S3·RP2040 등)는 DTR 이 켜져야 보내기 시작하는 경우가 많습니다. Uno 같은 보드는 열 때 한 번 리셋됩니다(Arduino IDE 와 같음).",
    "Asserts DTR when the port opens. Native-USB boards (Leonardo, ESP32-S2/S3, RP2040 …) often send only while DTR is on. Boards such as the Uno reset once on open (as with the Arduino IDE).",
  ],
  plAutoReconnect: ["USB 를 뽑았다 꽂으면 같은 장치를 찾아 다시 엽니다. 그 사이 값은 비어 있습니다.", "Reopens the same device after an unplug/replug. Values are missing in between."],
  plHost: ["접속할 장비의 IP(또는 이름). 끊기면 2초마다 다시 접속합니다.", "The device's IP (or host name) to connect to. Reconnects every 2 s after a drop."],
  plNetPort: ["장비가 듣는 TCP 포트.", "The TCP port the device listens on."],
  plBindHost: ["UDP 를 받을 이 PC 의 주소. 0.0.0.0 이면 모든 랜카드.", "This PC's address for UDP. 0.0.0.0 listens on every interface."],
  plBindPort: ["UDP 를 받을 이 PC 의 포트 — 장비가 보내는 «대상 포트» 와 같게.", "The UDP port on this PC — the same as the device's destination port."],
  plGroup: ["장비가 멀티캐스트(224.0.0.0~239.255.255.255)로 보내면 그 그룹 주소. 아니면 비워 둡니다.", "If the device sends to a multicast group (224.0.0.0–239.255.255.255), its address. Otherwise leave empty."],
  plStart: ["고른 곳에서 받기 시작·멈춤. 멈춰도 그래프·버퍼는 남습니다(«지우기» 로 비움).", "Starts/stops receiving. Stopping keeps the graph and buffer («Clear» empties them)."],
  plFmtKind: [
    "글자 줄: 한 줄에 숫자 여러 개(23.1,40 · 23.1 40 · 탭·세미콜론) 또는 «이름:값»(temp:23.1 hum:40, Arduino 시리얼 플로터 식). 바이너리: 시작 바이트·고정 길이 프레임. 받는 중에도 바꿀 수 있습니다.",
    "Text lines: several numbers per line (23.1,40 · 23.1 40 · tab · semicolon) or «name:value» pairs (temp:23.1 hum:40, as in the Arduino Serial Plotter). Binary: fixed-length frames with start bytes. Can change while receiving.",
  ],
  plSep: [
    "숫자 사이 구분자. 자동은 줄에 탭 > 세미콜론 > 쉼표 > 빈칸 순으로 있는 것을 씁니다. 세미콜론·탭·빈칸이면 «1,5» 를 1.5 로 읽습니다.",
    "Separator between numbers. Auto uses tab > semicolon > comma > space, whichever the line has. With semicolon, tab or space, «1,5» reads as 1.5.",
  ],
  plHeader: [
    "숫자가 하나도 없고 칸이 둘 이상인 줄(time,volt,amp)을 채널 이름으로 씁니다. 장비가 다시 보내면 이름도 바뀝니다. 끄면 그런 줄은 실패 줄입니다.",
    "A line with no numbers and two or more fields (time,volt,amp) becomes the channel names; sent again, the names change. Off: such lines count as failed.",
  ],
  plSync: ["프레임 첫 바이트(들), 예 «AA 55». 이걸 찾아 프레임을 맞춥니다. 비우면 고정 길이로만 자릅니다(한 번 어긋나면 체크섬이 있어야 다시 맞춥니다).", "The frame's first byte(s), e.g. «AA 55», used to find frame starts. Empty: frames are cut by length only (after a slip, only a checksum can resync)."],
  plChannels: ["한 프레임에 든 값 개수(1~32).", "Values per frame (1–32)."],
  plNum: ["값 하나의 형식 — 부호 없는(u)·있는(i) 정수 8·16·32비트, 실수 f32·f64.", "Format of one value — unsigned (u) / signed (i) 8-, 16- or 32-bit integers, f32 or f64 floats."],
  plEndian: ["여러 바이트 값의 순서. Arduino(AVR·ARM)·ESP32·PC 는 리틀 엔디언, 네트워크·Modbus 식은 빅 엔디언.", "Byte order of multi-byte values. Arduino (AVR, ARM), ESP32 and PCs are little-endian; network/Modbus style is big-endian."],
  plChecksum: ["프레임 끝의 체크섬. 틀린 프레임은 버리고(빨간 원시 줄) 한 바이트 밀어 다시 찾습니다. 계산 범위는 기본 시작 바이트 뒤 ~ 체크섬 앞.", "Checksum at the end of each frame. Bad frames are dropped (red raw line) and the search resumes one byte later. Computed by default from after the start bytes up to the checksum."],
  plCheckSync: ["체크섬 계산에 시작 바이트도 넣습니다.", "Include the start bytes in the checksum."],
  plPause: ["그래프만 멈춥니다 — 받기·CSV 기록은 계속. 확대·옮기기를 하면 저절로 멈춥니다. Space.", "Freezes the graph only — receiving and CSV recording continue. Zooming or panning pauses automatically. Space."],
  plResume: ["실시간 보기로 돌아갑니다(확대·옮기기·세로 조절을 버림). 그래프를 두 번 눌러도 됩니다. End.", "Back to the live view (drops zoom, pan and vertical scaling). Double-clicking the graph does the same. End."],
  plWindow: ["가로축. «최근 점» 은 받은 순서(점 N개), «최근 초» 는 PC 가 받은 시각(N초). 장비 시각이 아니므로 USB 묶음 때문에 점 간격이 고르지 않을 수 있습니다.", "Horizontal axis. «Last points» uses arrival order (N points), «Last seconds» the PC's receive time (N s) — not the device's clock, so USB batching can make spacing uneven."],
  plSpan: ["보이는 폭 — 점 수 또는 초. 버퍼는 최근 10만 줄입니다.", "Visible width — points or seconds. The buffer keeps the last 100,000 rows."],
  plY: ["세로축 범위. 자동은 보이는 값에 맞춥니다. 고정은 최소·최대. Shift+휠·Shift+끌기로 잠깐 바꾸면 «▶ 실시간» 까지 그대로.", "Vertical range. Auto fits the visible values; Fixed uses min and max. Shift+wheel / Shift+drag adjusts it until «▶ Live»."],
  plYRight: ["오른쪽 축 범위 — «축» 을 오른쪽으로 둔 채널(크기가 다른 값)용.", "Right axis range — for channels whose «Axis» is right (values of a different scale)."],
  plRecord: [
    "받는 동안 모든 값을 CSV 로 바로 씁니다(시각·0초부터 지난 초·채널). 그래프를 멈춰도, 버퍼에서 밀려나도 파일에는 남습니다. 엑셀에서 한글이 깨지지 않게 BOM 을 붙입니다. Ctrl+Shift+L.",
    "Writes every value to CSV while receiving (time, seconds since start, channels) — kept even when the graph is paused or the buffer rolls over. Starts with a BOM so Excel shows non-ASCII names. Ctrl+Shift+L.",
  ],
  plSaveCsv: ["지금 보이는 범위의 값만 CSV 로 저장합니다(시각·지난 초·받은 순서·채널). Ctrl+S.", "Saves only the values in view as CSV (time, elapsed, index, channels). Ctrl+S."],
  plSavePng: ["그래프 그림(범례·눈금·측정점 포함)을 PNG 로 저장합니다.", "Saves the graph (legend, ticks and markers included) as PNG."],
  plClear: ["버퍼·그래프·원시 줄·측정점을 비웁니다(CSV 기록 파일은 그대로). Ctrl+L.", "Empties the buffer, graph, raw lines and markers (a CSV recording file is kept). Ctrl+L."],
  plShow: ["채널을 그래프에 보이거나 숨깁니다(값은 계속 받음).", "Shows or hides the channel on the graph (values are still received)."],
  plColor: ["선 색. 기본 8색은 색약에도 구별되게 골랐고, 9번째 채널부터는 같은 색을 점선으로 그립니다.", "Line color. The 8 defaults are chosen to stay distinct for color-vision deficiency; channels 9+ reuse them dashed."],
  plName: ["채널 이름 — 비우면 장비가 보낸 이름(머리글·이름:값) 또는 CH1….", "Channel name — empty uses the name from the device (header, name:value) or CH1…."],
  plAxis: ["왼쪽·오른쪽 축. 크기가 다른 값(예: 온도와 압력)을 함께 볼 때 하나를 오른쪽으로.", "Left or right axis. Put one on the right when values have different scales (e.g. temperature and pressure)."],
  plStats: ["최근 값과 지금 보이는 범위의 최소·최대·평균(빈 값 제외).", "The latest value and the min, max and mean over the visible range (blanks excluded)."],
  plRaw: ["받은 줄 그대로(최근 것). 해석에 실패한 줄은 빨강과 이유, 연결·끊김 같은 사건은 회색.", "Received lines as is (latest). Failed lines show in red with the reason; events such as connect/disconnect in gray."],
  plCounts: ["받은 값 줄 수·해석 실패 수·초당 줄 수·받은 바이트(«지우기» 뒤로).", "Value rows, failed lines, rows per second and bytes received (since «Clear»)."],
};

/** 이 앱 말풍선 — 없으면 공용(shared/tips.ts) */
export function tip(lang: "ko" | "en", key: string) {
  const t = TIPS[key];
  return t ? t[lang === "ko" ? 0 : 1] : sharedTip(lang, key);
}

export const PLOT_TIP_KEYS = Object.keys(TIPS);
