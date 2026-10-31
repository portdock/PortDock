// SPI 모드 — 웹 도구 «SPI 모드 도우미». 모드 0~3(CPOL·CPHA) → 엣지마다 샘플·시프트, 바이트의 비트 파형, 전송 시간. 그림은 쪽(SpiPage.astro).
// 근거:
//   Linux 커널 문서 «Overview of Linux kernel SPI support»(spi-summary): CPOL = 클럭 쉼 상태, CPHA = 0 이면 앞 엣지에서 샘플,
//     1 이면 뒤 엣지에서 샘플. 모드 번호 = CPOL × 2 + CPHA(SPI_CPHA = 0x01, SPI_CPOL = 0x02).
//   그래서 CPHA = 0 은 첫 엣지 전에 첫 비트가 이미 놓여 있어야 하고(CS 가 내려가면 내놓음), CPHA = 1 은 첫 엣지에서 첫 비트를 내놓는다.
//   표기 차이: TI MSP430 USCI(SLAU208) UCCKPH = 1 이 «첫 엣지에서 잡음» → UCCKPH = NOT CPHA, UCCKPL = CPOL.
//     Microchip PIC MSSP: CKP = CPOL, CKE = 1 이 «활성 → 쉼 엣지에서 내보냄» → CKE = NOT CPHA.

export type Edge = "rising" | "falling";

export interface ModeInfo {
  mode: number;
  cpol: 0 | 1;
  cpha: 0 | 1;
  /** 데이터를 잡는 엣지 */
  sample: Edge;
  /** 데이터를 바꾸는 엣지 */
  shift: Edge;
}

export function modeInfo(mode: number): ModeInfo {
  if (![0, 1, 2, 3].includes(mode)) throw new RangeError("mode");
  const cpol = (mode >> 1) as 0 | 1;
  const cpha = (mode & 1) as 0 | 1;
  // 앞 엣지 = 쉼 → 활성. CPOL 0 이면 상승, 1 이면 하강
  const lead: Edge = cpol === 0 ? "rising" : "falling";
  const trail: Edge = cpol === 0 ? "falling" : "rising";
  return { mode, cpol, cpha, sample: cpha === 0 ? lead : trail, shift: cpha === 0 ? trail : lead };
}

/** 바이트 → 보낼 비트 순서 */
export const byteBits = (b: number, msbFirst: boolean) => {
  const bits = [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (b >> i) & 1);
  return msbFirst ? bits : bits.reverse();
};

export interface Wave {
  /** 전체 길이(반 주기 단위). 0 = CS 내려감 */
  len: number;
  /** CS 가 올라가는 때 */
  csUp: number;
  /** SCK 엣지 */
  edges: { t: number; dir: Edge; lead: boolean; action: "sample" | "shift" }[];
  /** MOSI 비트 칸 [t0, t1) */
  bits: { t0: number; t1: number; v: number; i: number }[];
  /** SCK 레벨 바뀜 [(t, level)] — t = 0 부터 */
  sck: [number, number][];
}

/**
 * 파형 — 시간 단위는 SCK 반 주기. CS 는 t = 0 에서 내려간다.
 * 비트 i 의 앞 엣지 = 2i + 1, 뒤 엣지 = 2i + 2.
 * CPHA 0: 비트 i 는 [2i, 2i + 2) 에 놓임(앞 엣지에서 샘플, 뒤 엣지에서 다음 비트로).
 * CPHA 1: 비트 i 는 [2i + 1, 2i + 3) 에 놓임(앞 엣지에서 내놓고 뒤 엣지에서 샘플).
 */
export function wave(bytes: number[], mode: number, msbFirst = true): Wave {
  const m = modeInfo(mode);
  const all = bytes.flatMap((b) => byteBits(b, msbFirst));
  const n = all.length;
  const idle = m.cpol;
  const edges: Wave["edges"] = [];
  const sck: [number, number][] = [[0, idle]];
  for (let i = 0; i < n; i++) {
    const lt = 2 * i + 1;
    const tt = 2 * i + 2;
    edges.push({ t: lt, dir: m.cpol === 0 ? "rising" : "falling", lead: true, action: m.cpha === 0 ? "sample" : "shift" });
    edges.push({ t: tt, dir: m.cpol === 0 ? "falling" : "rising", lead: false, action: m.cpha === 0 ? "shift" : "sample" });
    sck.push([lt, 1 - idle], [tt, idle]);
  }
  const off = m.cpha === 0 ? 0 : 1;
  const bits = all.map((v, i) => ({ t0: 2 * i + off, t1: 2 * i + 2 + off, v, i }));
  const csUp = 2 * n + 1;
  return { len: csUp + 1, csUp, edges, bits, sck };
}

/** 전송 시간(초) — 바이트 사이 쉼 없이 */
export const transferTime = (bytes: number, hz: number, bitsPerWord = 8) => {
  if (!(hz > 0) || !(bytes >= 0)) throw new RangeError("input");
  return (bytes * bitsPerWord) / hz;
};

/** 제조사·환경별 표기 → CPOL·CPHA 값 */
export const notations = (mode: number) => {
  const m = modeInfo(mode);
  return {
    generic: `CPOL=${m.cpol} CPHA=${m.cpha}`,
    linux: `SPI_MODE_${mode}`,
    arduino: `SPI_MODE${mode}`,
    msp430: `UCCKPL=${m.cpol} UCCKPH=${1 - m.cpha}`,
    pic: `CKP=${m.cpol} CKE=${1 - m.cpha}`,
  };
};

/** HEX 글 → 바이트 */
export function parseBytes(s: string): number[] {
  const h = s.replace(/0x/gi, "").replace(/[\s,;:.-]/g, "");
  if (!h) return [];
  if (!/^[0-9a-f]+$/i.test(h) || h.length % 2) throw new RangeError(s);
  return h.match(/../g)!.map((x) => parseInt(x, 16));
}
