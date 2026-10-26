// llms-full.txt — 장비 레지스터 맵 전체를 한 문서로(AI 가 한 번에 읽는 용도, https://llmstxt.org 꼴). 짧은 안내는 llms.txt
import type { APIRoute } from "astro";
import { CC_BY, DEVICES, devPath } from "../data/devices";
import { devicesMarkdown } from "../lib/devicesExport";
import { url } from "../lib/i18n";

export const GET: APIRoute = ({ site }) => {
  const regs = DEVICES.reduce((n, d) => n + d.registers.length, 0);
  const head = [
    "# PortDock — Modbus register maps (full)",
    "",
    `> ${DEVICES.length} industrial devices, ${regs} registers, taken only from manufacturer manuals (document, edition, page and date for each). License CC BY 4.0 (${CC_BY}) — please cite «PortDock device register maps, https://portdock.dev/devices/ ». Not affiliated with the makers; check the device manual before writing to a device.`,
    "",
    `Machine-readable: ${new URL("/devices/all.json", site).href} · CSV: ${new URL("/devices/registers.csv", site).href}`,
    "",
  ];
  const body = devicesMarkdown(DEVICES, (d) => new URL(url("en", devPath(d)), site).href);
  return new Response(head.join("\n") + body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
