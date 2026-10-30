// 장비 목록 JSON — /devices/index.json (AI·스크립트가 데이터 묶음을 찾는 입구, llms.txt 에서 가리킨다)
import type { APIRoute } from "astro";
import { CC_BY, DEVICES, RELEASE, SCHEMA_URL, dataHome, rawUrl } from "../../data/devices";
import { citeText } from "../../lib/dataRelease";
import { url } from "../../lib/i18n";

export const GET: APIRoute = ({ site }) =>
  new Response(
    JSON.stringify(
      {
        name: "PortDock device register maps",
        version: RELEASE.version,
        date: RELEASE.date,
        contentHash: RELEASE.contentHash,
        license: CC_BY,
        citation: citeText(RELEASE, dataHome(site)),
        about: new URL(url("en", "data/"), site).href,
        schema: SCHEMA_URL,
        note: "Facts from manufacturer manuals only, with sources. Not affiliated with the makers. Check the device manual before use. address = 0-based wire address.",
        devices: DEVICES.map((d) => ({
          id: d.id,
          manufacturer: d.manufacturer.en,
          model: d.model,
          kind: d.kind,
          registers: d.registers.length,
          checked: d.sources.map((s) => s.checked).sort().pop(),
          json: new URL(`/devices/${d.id}.json`, site).href,
          markdown: new URL(`/devices/${d.id}.md`, site).href,
          raw: rawUrl(d),
          page: { ko: new URL(url("ko", `devices/${d.id}/`), site).href, en: new URL(url("en", `devices/${d.id}/`), site).href },
        })),
      },
      null,
      2,
    ) + "\n",
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
