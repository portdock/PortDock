// 장비 목록 JSON — /devices/index.json (AI·스크립트가 데이터셋을 찾는 입구, llms.txt 에서 가리킨다)
import type { APIRoute } from "astro";
import { CC_BY, DEVICES, SCHEMA_URL, rawUrl } from "../../data/devices";
import { url } from "../../lib/i18n";

export const GET: APIRoute = ({ site }) =>
  new Response(
    JSON.stringify(
      {
        name: "PortDock device register maps",
        license: CC_BY,
        schema: SCHEMA_URL,
        note: "Facts from manufacturer manuals only, with sources. Not affiliated with the makers. Check the device manual before use. address = 0-based wire address.",
        devices: DEVICES.map((d) => ({
          id: d.id,
          manufacturer: d.manufacturer.en,
          model: d.model,
          kind: d.kind,
          registers: d.registers.length,
          json: new URL(`/devices/${d.id}.json`, site).href,
          raw: rawUrl(d),
          page: { ko: new URL(url("ko", `devices/${d.id}/`), site).href, en: new URL(url("en", `devices/${d.id}/`), site).href },
        })),
      },
      null,
      2,
    ) + "\n",
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
