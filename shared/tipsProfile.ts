// 말풍선 — Modbus Slave «장비 프로필로 흉내»(0.10.0): 값 만들기·연결 규칙·읽기/쓰기 제한.
// shared/tips.ts 의 TIPS 에 합쳐진다(키가 겹치지 않게 이 파일만 고친다).
type Tip = [ko: string, en: string];

export const PROFILE_TIPS: Record<string, Tip> = {
  devBehave: [
    "(0.10.0 부터) 장비 종류에 맞춰 그럴듯한 값을 만듭니다 — 전력 미터는 전압·전류·전력이 조금씩 흔들리고 전력량이 전력만큼 늘며, 인버터는 운전 지령을 쓰면 출력 주파수가 설정 주파수까지 오르고(0 이면 내려감) 전류·전압·전력이 따라갑니다. 온도 조절기는 PV 가 SV 로 다가갑니다. 이름·단위로 짐작한 규칙이라 «연결 규칙…» 에서 고칠 수 있습니다.",
    "(from 0.10.0) Makes plausible values for the device type — on power meters voltage, current and power drift slightly and energy grows with power; on inverters writing the run command ramps the output frequency to the frequency setting (down when 0) and current, voltage and power follow; on temperature controllers PV moves toward SV. The rules are guessed from names and units — edit them in «Link rules…».",
  ],
  devGuard: [
    "(0.10.0 부터) 장비 맵의 R/W 대로 답합니다 — 읽기 전용 칸에 쓰거나 쓰기 전용 칸을 읽으면 예외(기본 02), 맵에 없는 주소를 읽거나 쓰면 예외 02. 화면에서 값을 고치는 것은 막지 않습니다. 왼쪽 «장비 프로필» 에서 끄거나 예외 코드를 바꿉니다.",
    "(from 0.10.0) Answers by the map's R/W — writing a read-only cell or reading a write-only cell gives an exception (02 by default), reading or writing an address not in the map gives exception 02. Editing values on screen is not blocked. Turn it off or change the code under «Device profile» on the left.",
  ],
  profAccess: [
    "(0.10.0 부터) 마스터가 읽기 전용 칸에 쓰거나 쓰기 전용 칸을 읽으면 아래 예외로 답하고 값은 바꾸지 않습니다. 여러 칸 쓰기에 하나라도 끼면 통째로 거절합니다.",
    "(from 0.10.0) When the master writes a read-only cell or reads a write-only cell, the reply is the exception below and nothing is changed. A multi-register write is refused as a whole if any cell is affected.",
  ],
  profCode: [
    "(0.10.0 부터) 장비 데이터에는 이때 어떤 예외를 보내는지 적혀 있지 않아 고르게 했습니다 — 02 Illegal Data Address 또는 03 Illegal Data Value. 장비 매뉴얼의 예외 표를 볼 것.",
    "(from 0.10.0) The device data does not say which exception the device sends here, so you choose — 02 Illegal Data Address or 03 Illegal Data Value. See the exception table in the device manual.",
  ],
  profUnmapped: [
    "(0.10.0 부터) 응답 범위 안이라도 장비 맵에 없는 주소(빈 번지)를 건드리면 예외 02. 빈 번지를 0 으로 읽어 주는 장비를 흉내 내려면 끄세요.",
    "(from 0.10.0) Even inside the answered range, touching an address that is not in the device map (a gap) gives exception 02. Turn off to mimic devices that read gaps as 0.",
  ],
  profLinks: [
    "(0.10.0 부터) 칸끼리 잇는 규칙 — 따라가기(운전 지령이 켜지면 원본 × 배율로 초당 «빠르기» 만큼 다가가고 꺼지면 0 으로), 비례(원본 × 배율 + 더할 값), 누적(원본 × 배율을 초마다 더함). 백엔드가 0.1초마다 돌려 창을 내려 두어도 움직입니다.",
    "(from 0.10.0) Rules linking cells — Follow (while the run command is on, move toward source × gain by «rate» per second; to 0 when off), Proportional (source × gain + offset), Accumulate (add source × gain every second). The backend runs them every 0.1 s, also while the window is minimized.",
  ],
  profClear: [
    "(0.10.0 부터) 이 국번의 읽기/쓰기 제한과 연결 규칙을 끕니다. 칸 이름·형식·값·자동 변화는 그대로 둡니다.",
    "(from 0.10.0) Turns off access limits and link rules for this Slave ID. Cell names, types, values and simulations stay.",
  ],
  lnMask: [
    "(0.10.0 부터) 운전 지령 칸에서 볼 비트 묶음(10진수). 비트 1·2(정방향·역방향)면 2 + 4 = 6. 0 이면 값이 0 이 아닐 때 운전.",
    "(from 0.10.0) Bit mask to check in the run command cell (decimal). Bits 1 and 2 (forward, reverse) = 2 + 4 = 6. 0 means running whenever the value is not 0.",
  ],
  lnRate: [
    "(0.10.0 부터) 결과 칸의 원시 값이 1초에 움직이는 양. 0.01 Hz 단위 칸에서 초당 6 Hz 면 600. 실제 가감속 시간은 장비 파라미터를 볼 것.",
    "(from 0.10.0) How much the result cell's raw value moves per second. For a 0.01 Hz cell, 6 Hz/s is 600. Real ramp times follow the device parameters.",
  ],
  lnGain: [
    "(0.10.0 부터) 원본 원시 값에 곱하는 수. 배율(×0.01 등)이 다른 칸끼리는 여기서 맞춥니다 — 누적이면 «초당» 늘어날 양.",
    "(from 0.10.0) Multiplier for the source's raw value. Match cells with different scales (×0.01 …) here — for Accumulate it is the amount added per second.",
  ],
};
