// 일본어(ja) 사전 — 추가 언어의 기준판. 다른 언어는 이 폴더를 통째로 복사해 옮긴다(site/I18N.md).
// ui = 공용 문구, common = 프로그램·웹 도구 이름 등, pages = 쪽마다 문구(scope.ts SCOPE 의 값과 같은 이름), lib = 계산 라이브러리 문구
import ui from "./ui.ts";
import common from "./common.ts";
import lib from "./lib.ts";
import home from "./pages/home.ts";
import tools from "./pages/tools.ts";
import download from "./pages/download.ts";
import safety from "./pages/safety.ts";
import privacy from "./pages/privacy.ts";
import analog from "./pages/analog.ts";
import modbus from "./pages/modbus.ts";
import modbusDecoder from "./pages/modbusDecoder.ts";
import modbusFloat from "./pages/modbusFloat.ts";
import mcDecoder from "./pages/mcDecoder.ts";
import rs485 from "./pages/rs485.ts";
import serialTiming from "./pages/serialTiming.ts";
import checksum from "./pages/checksum.ts";
import subnet from "./pages/subnet.ts";
import pinouts from "./pages/pinouts.ts";
import type { PageId } from "../scope.ts";

const pages = { home, tools, download, safety, privacy, analog, modbus, modbusDecoder, modbusFloat, mcDecoder, rs485, serialTiming, checksum, subnet, pinouts } satisfies Record<PageId, unknown>;

export default { ui, common, lib, pages };
