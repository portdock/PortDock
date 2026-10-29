// 웹 도구 «GigE 카메라 대역폭 계산기» — 해상도·픽셀 형식·프레임 수·카메라 수 → 영상 데이터 속도와 링크 대비 비율.
// 근거:
//  - Beckhoff TwinCAT 3 Vision «Bandwidth management for GigE Vision»(infosys.beckhoff.com)
//      영상 데이터 속도[바이트/s] = 화소 수 × 화소당 바이트 × 프레임 수 — 프로토콜 오버헤드는 넣지 않은 단순 계산
//      예: 1920 × 1200, Mono8(1 바이트), 30 fps = 69.12 MB/s, 카메라 3대 = 207.36 MB/s, 15 fps 로 줄이면 103.68 MB/s
//      1 Gbit/s 연결의 총 속도 125 MB/s, 그 예에서는 안정적으로 쓸 수 있는 속도를 약 110~115 MB/s 로 가정
//  - EMVA GenICam Pixel Format Naming Convention(PFNC) 2.4(2021-06-16)
//      §4 성분당 비트 × 성분 수(RGB8 = 24 비트), §6.1 unpacked 는 성분마다 다음 바이트 경계까지 채움(Mono12 → 2 바이트),
//      §6.1.x lsb packed(«p» 꼬리표)는 빈 비트 없이 이어 붙임(Mono12p → 12 비트), §3.1.3 4:2:2 는 화소 둘에 L·M·L·N(YCbCr422_8 → 16 비트)
// MB = 10⁶ 바이트(Beckhoff 예와 같은 단위).

export interface PixelFormat {
  id: string;
  /** 화소 하나가 차지하는 비트(빈 비트 포함) */
  bits: number;
}

export const PIXEL_FORMATS: PixelFormat[] = [
  { id: "Mono8", bits: 8 },
  { id: "Mono10", bits: 16 },
  { id: "Mono10p", bits: 10 },
  { id: "Mono12", bits: 16 },
  { id: "Mono12p", bits: 12 },
  { id: "Mono16", bits: 16 },
  { id: "Bayer**8", bits: 8 },
  { id: "Bayer**10", bits: 16 },
  { id: "Bayer**10p", bits: 10 },
  { id: "Bayer**12", bits: 16 },
  { id: "Bayer**12p", bits: 12 },
  { id: "RGB8 / BGR8", bits: 24 },
  { id: "YCbCr422_8", bits: 16 },
];

export const bitsOf = (id: string) => PIXEL_FORMATS.find((p) => p.id === id)?.bits;

/** 링크 속도(Gbit/s) → 총 속도 바이트/s (1 Gbit/s = 125 MB/s) */
export const linkBytes = (gbps: number) => (gbps * 1e9) / 8;

const pos = (x: number) => Number.isFinite(x) && x > 0;

/** 카메라 한 대의 영상 데이터 속도(바이트/s) */
export function streamRate(width: number, height: number, bits: number, fps: number) {
  if (![width, height].every((v) => Number.isInteger(v) && v > 0 && v <= 100000) || !pos(bits) || !pos(fps)) throw new RangeError("gige");
  return (width * height * bits * fps) / 8;
}

export interface GigeOut {
  /** 카메라 한 대 바이트/s */
  perCamera: number;
  /** 한 프레임 바이트 */
  frameBytes: number;
  /** 모든 카메라 합 바이트/s */
  total: number;
  /** 링크 총 속도 대비(0~) */
  ofLink: number;
  /** 쓸 수 있다고 정한 속도 대비(0~) */
  ofUsable: number;
  /** 쓸 수 있는 속도 안에서 카메라마다 낼 수 있는 최대 fps */
  maxFps: number;
}

/**
 * cameras 대가 한 링크(랜카드 포트·스위치 업링크)를 나눠 쓸 때.
 * usableRatio: 링크 총 속도 가운데 영상에 쓸 수 있다고 볼 비율(Beckhoff 예 110~115 / 125 = 0.88~0.92) — 사용자가 정한다.
 */
export function gige(width: number, height: number, bits: number, fps: number, cameras: number, linkGbps: number, usableRatio: number): GigeOut {
  if (!(Number.isInteger(cameras) && cameras >= 1 && cameras <= 64) || !pos(linkGbps) || !(usableRatio > 0 && usableRatio <= 1)) throw new RangeError("gige");
  const perCamera = streamRate(width, height, bits, fps);
  const frameBytes = (width * height * bits) / 8;
  const total = perCamera * cameras;
  const link = linkBytes(linkGbps);
  const usable = link * usableRatio;
  return { perCamera, frameBytes, total, ofLink: total / link, ofUsable: total / usable, maxFps: usable / cameras / frameBytes };
}
