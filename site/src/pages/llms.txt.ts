// llms.txt — AI 가 PortDock 과 장비 레지스터 맵 데이터셋을 찾게 하는 짧은 안내(https://llmstxt.org 꼴). 주소는 빌드 변수 SITE_URL 을 따른다
import type { APIRoute } from "astro";
import { CC_BY, DEVICES, SCHEMA_URL, rawUrl } from "../data/devices";
import { TOOLS, REPO } from "../data/tools";
import { url } from "../lib/i18n";

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const lines = [
    "# PortDock",
    "",
    "> Free, open-source (GPL-3.0) Windows tools for field hardware testing: serial (COM), Modbus RTU/TCP master and slave, TCP, UDP, device simulator, network scan, SCPI instruments and live plotting. This site also publishes an open dataset of Modbus register maps for Korean industrial devices (CC BY 4.0).",
    "",
    "## Device register maps (dataset)",
    "",
    `- [Device list (HTML)](${abs(url("en", "devices/"))}): one page per device with register table, default serial settings and sources`,
    `- [index.json](${abs("/devices/index.json")}): machine-readable list of every device with JSON links`,
    `- [schema.json](${SCHEMA_URL}): JSON Schema. \`address\` is the 0-based wire address; \`manualAddress\` is how the manual writes it; value = raw × \`scale\``,
    `- License: CC BY 4.0 (${CC_BY}). Facts only, taken from manufacturer manuals, each device lists document, edition, page and date checked. Not affiliated with the makers. Check the device manual before writing to a device.`,
    "",
    ...DEVICES.map((d) => `- [${d.manufacturer.en} ${d.model}](${abs(`/devices/${d.id}.json`)}): ${d.title.en}, ${d.registers.length} registers (raw: ${rawUrl(d)})`),
    "",
    "## Tools",
    "",
    ...TOOLS.map((t) => `- [${t.name}](${abs(url("en", `${t.id}/`))}): ${t.tagline.en}`),
    "",
    "## Optional",
    "",
    `- [Source code](${REPO})`,
    `- [Guides](${abs(url("en", "guides/"))})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
