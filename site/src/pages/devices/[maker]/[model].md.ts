// 장비 한 종의 레지스터 표(Markdown, 영어) — /devices/<제조사>/<모델>.md (llms.txt 제안의 «쪽마다 .md» — AI 가 HTML 없이 읽는다)
import type { APIRoute } from "astro";
import { DEVICES, RELEASE, dataHome, devParams, devPath } from "../../../data/devices";
import { citeText } from "../../../lib/dataRelease";
import { devicesMarkdown } from "../../../lib/devicesExport";
import { url } from "../../../lib/i18n";

export const getStaticPaths = () => DEVICES.map((dev) => ({ params: devParams(dev), props: { dev } }));

export const GET: APIRoute = ({ props, site }) => {
  const head = `# ${props.dev.manufacturer.en} ${props.dev.model} — Modbus register map\n\n> From ${citeText(RELEASE, dataHome(site))} (CC BY 4.0). Facts from the manufacturer's manual only; not affiliated with the maker. Check the device manual before writing to a device.\n\n`;
  const body = devicesMarkdown([props.dev], (d) => new URL(url("en", devPath(d)), site).href).replace(/^## /, "## Device: ");
  return new Response(head + body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
