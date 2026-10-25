// 모든 장비 레지스터 맵 한 파일 — /devices/all.json (데이터셋 통째로 받기, llms.txt 에서 가리킨다)
import type { APIRoute } from "astro";
import { CC_BY, DEVICES, SCHEMA_URL } from "../../data/devices";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: "PortDock device register maps",
      license: CC_BY,
      attribution: "PortDock device register maps (https://portdock.dev/devices/)",
      schema: SCHEMA_URL,
      note: "Facts from manufacturer manuals only, with sources. Not affiliated with the makers. Check the device manual before writing to a device. address = 0-based wire address; value = raw × scale.",
      devices: DEVICES,
    }) + "\n",
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
