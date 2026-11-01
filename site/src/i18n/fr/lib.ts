// 프랑스어 — 계산 라이브러리(lib/*.ts) 문구를 묶음별로. 쪽에는 Base.astro 의 libText 로 고른 묶음만 싣는다(lib/tr.ts)
import checksum from "./lib/checksum.ts";
import modbusNames from "./lib/modbusNames.ts";
import modbusBuild from "./lib/modbusBuild.ts";
import modbusDecode from "./lib/modbusDecode.ts";
import modbusFloat from "./lib/modbusFloat.ts";
import analog from "./lib/analog.ts";
import subnet from "./lib/subnet.ts";
import mc from "./lib/mc.ts";
import pinouts from "./lib/pinouts.ts";

export default { checksum, modbusNames, modbusBuild, modbusDecode, modbusFloat, analog, subnet, mc, pinouts };
