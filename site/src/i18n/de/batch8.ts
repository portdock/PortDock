// de — 8차 묶음(윈도우 프로그램 소개 13쪽, scope.ts SCOPE8). 기준판 ja/batch8.ts 와 같은 틀.
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
