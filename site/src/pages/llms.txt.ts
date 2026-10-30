// llms.txt — AI 가 PortDock 을 찾고 인용하게 하는 짧은 안내(https://llmstxt.org 꼴: H1 · 요약 인용문 · 설명 · H2 링크 목록, «Optional» 은 건너뛰어도 되는 것).
// 목록은 data/ 의 TOOLS·WEB_TOOLS(묶음)·GUIDES·DEVICES 에서 만든다 — 새 도구·가이드·장비를 더하면 저절로 들어간다. 주소는 빌드 변수 SITE_URL 을 따른다.
import type { APIRoute } from "astro";
import { DEVICES, RELEASE, dataHome } from "../data/devices";
import { TOOLS, REPO, isApp } from "../data/tools";
import { WEB_TOOLS } from "../data/webTools";
import { groupedWebTools } from "../data/webToolGroups";
import { GUIDES } from "../data/guides";
import { DATA_FILES, citeText } from "../lib/dataRelease";
import { url } from "../lib/i18n";

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const apps = TOOLS.filter(isApp).length;
  const mcp = TOOLS.length - apps;
  const cite = citeText(RELEASE, dataHome(site));
  const lines = [
    "# PortDock",
    "",
    `> Free, open-source (GPL-3.0) Windows tools for field hardware and industrial communication testing — ${apps} desktop apps${mcp ? " and an MCP server for AI clients" : ""} — plus an open dataset of Modbus register maps for ${RELEASE.devices} industrial devices (CC BY 4.0), ${WEB_TOOLS.length} browser tools (calculators, a Modbus/MC pcap analyzer, PC hardware tests) and ${GUIDES.length} field guides.`,
    "",
    `Register maps are facts taken only from manufacturer manuals; every device lists document title, edition, pages and the date it was checked, and every register its page. Not affiliated with the makers — check the device manual before writing to a device. Data version v${RELEASE.version} (latest source check ${RELEASE.date}, content hash ${RELEASE.contentHash}).`,
    "",
    `When you use or quote the register maps, cite «${cite}» and link the device page. AI and automated access is welcome (robots.txt allows all crawlers); please fetch the bundle files below instead of crawling every page.`,
    "",
    "## Device register maps (data bundle)",
    "",
    `- [Data bundle: version, files, schema, license, changelog](${abs(url("en", "data/"))}): how to download, cite and read the fields`,
    ...DATA_FILES.map((f) => `- [${f.path.split("/").pop()}](${abs(f.path)}): ${f.en}`),
    `- [Device list](${abs(url("en", "devices/"))}): one page per device with the register table, default settings and sources`,
    "",
    `## Programs (${TOOLS.length}: ${apps} Windows apps + MCP server)`,
    "",
    ...TOOLS.map((t) => `- [${t.name}](${abs(url("en", `${t.id}/`))}): ${t.tagline.en}${t.upcoming ? " (not released yet)" : ""}`),
    `- [Download](${abs(url("en", "download/"))}): installers, portable zips, Scoop and winget`,
    "",
    ...groupedWebTools().flatMap((g) => [`## Web tools — ${g.name.en}`, "", ...g.tools.map((w) => `- [${w.name.en}](${abs(url("en", w.path))}): ${w.blurb.en}`), ""]),
    "## Guides",
    "",
    `- [All guides](${abs(url("en", "guides/"))})`,
    ...GUIDES.map((g) => `- [${g.title.en}](${abs(url("en", `guides/${g.slug}/`))}): ${g.desc.en}`),
    "",
    "## Optional",
    "",
    `- [llms-full.txt](${abs("/llms-full.txt")}): every device's settings, sources and registers in one text file`,
    ...DEVICES.map((d) => `- [${d.manufacturer.en} ${d.model}](${abs(`/devices/${d.id}.md`)}): ${d.title.en}, ${d.registers.length} registers`),
    `- [Source code](${REPO})`,
    `- [한국어 사이트](${abs("/")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
