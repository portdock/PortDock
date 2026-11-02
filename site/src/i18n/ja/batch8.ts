// 일본어 — 8차 묶음(윈도우 프로그램 소개 13쪽, scope.ts SCOPE8). 기준판: 다른 언어는 이 파일과 여기서 가져오는 apps/*.ts·pages/toolPage.ts 를 본떠 옮긴다(site/I18N.md «8차 묶음 붙이는 법»).
// pages = 앱 id 마다 소개 쪽 글(data/tools.ts 의 {ko,en} 글과 같은 모양·순서 — 이름·한 줄 소개(common.ts 의 apps)는 빼고),
// toolPage = 소개 화면(views/ToolPage.astro·components/AppShot.astro·DownloadBox.astro) 공통 글과 모든 앱 공통 기능 «화면 언어».
import type { Page8Id } from "../scope.ts";
import type { AppPage } from "../index.ts";
import toolPage from "./pages/toolPage.ts";
import serial from "./apps/serial.ts";
import modbusSlave from "./apps/modbus-slave.ts";
import tcp from "./apps/tcp.ts";
import udp from "./apps/udp.ts";
import simulator from "./apps/simulator.ts";
import netscan from "./apps/netscan.ts";
import modbusMaster from "./apps/modbus-master.ts";
import scpi from "./apps/scpi.ts";
import plot from "./apps/plot.ts";
import portInspector from "./apps/port-inspector.ts";
import plcSimulator from "./apps/plc-simulator.ts";
import hwTester from "./apps/hw-tester.ts";
import mcp from "./apps/mcp.ts";

export default {
  toolPage,
  pages: {
    serial,
    "modbus-slave": modbusSlave,
    tcp,
    udp,
    simulator,
    netscan,
    "modbus-master": modbusMaster,
    scpi,
    plot,
    "port-inspector": portInspector,
    "plc-simulator": plcSimulator,
    "hw-tester": hwTester,
    mcp,
  } satisfies Record<Page8Id, AppPage>,
};
