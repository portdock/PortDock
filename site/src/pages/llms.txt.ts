// llms.txt — AI 가 PortDock 과 장비 레지스터 맵 데이터셋·웹 도구·가이드를 찾게 하는 짧은 안내(https://llmstxt.org 꼴). 주소는 빌드 변수 SITE_URL 을 따른다.
// 목록은 data/ 의 DEVICES·TOOLS·WEB_TOOLS·GUIDES 에서 만든다 — 새 웹 도구·가이드를 더하면 저절로 들어간다.
import type { APIRoute } from "astro";
import { CC_BY, DEVICES, SCHEMA_URL, rawUrl } from "../data/devices";
import { TOOLS, REPO } from "../data/tools";
import { WEB_TOOLS } from "../data/webTools";
import { GUIDES } from "../data/guides";
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
    `- [all.json](${abs("/devices/all.json")}): every device and register in one JSON file`,
    `- [registers.csv](${abs("/devices/registers.csv")}): every register as one CSV row (device, table, address, type, scale, unit, name)`,
    `- [llms-full.txt](${abs("/llms-full.txt")}): all register tables as one Markdown document`,
    `- [schema.json](${SCHEMA_URL}): JSON Schema. \`address\` is the 0-based wire address; \`manualAddress\` is how the manual writes it; value = raw × \`scale\``,
    `- License: CC BY 4.0 (${CC_BY}). Facts only, taken from manufacturer manuals, each device lists document, edition, page and date checked. Not affiliated with the makers. Check the device manual before writing to a device.`,
    "",
    ...DEVICES.map((d) => `- [${d.manufacturer.en} ${d.model}](${abs(`/devices/${d.id}.json`)}): ${d.title.en}, ${d.registers.length} registers (raw: ${rawUrl(d)})`),
    "",
    "## Tools",
    "",
    ...TOOLS.map((t) => `- [${t.name}](${abs(url("en", `${t.id}/`))}): ${t.tagline.en}`),
    "",
    "## Web tools (browser calculators, nothing is sent anywhere)",
    "",
    `- [All web tools](${abs(url("en", "tools/"))})`,
    ...WEB_TOOLS.map((w) => `- [${w.name.en}](${abs(url("en", w.path))}): ${w.blurb.en}`),
    "",
    "## Guides",
    "",
    `- [All guides](${abs(url("en", "guides/"))})`,
    ...GUIDES.map((g) => `- [${g.title.en}](${abs(url("en", `guides/${g.slug}/`))}): ${g.desc.en}`),
    "",
    "## Optional",
    "",
    `- [Source code](${REPO})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
