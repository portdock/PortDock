// 데이터 묶음 JSON Schema — /data/schema.json (all.json 전체, $defs/device = 장비 파일 하나). 원본 data/devices/schema.json 에서 빌드 때 만든다
import type { APIRoute } from "astro";
import deviceSchema from "../../../../data/devices/schema.json";
import { bundleSchema } from "../../lib/dataRelease";

export const GET: APIRoute = ({ site }) =>
  new Response(JSON.stringify(bundleSchema(deviceSchema, new URL("/data/schema.json", site).href), null, 2) + "\n", {
    headers: { "Content-Type": "application/schema+json; charset=utf-8" },
  });
