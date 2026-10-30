// 모든 장비 레지스터 맵 한 파일 — /devices/all.json (데이터 묶음 통째로 받기). 판·인용·라이선스가 머리에 붙는다(lib/dataRelease.ts), 형식은 /data/schema.json
import type { APIRoute } from "astro";
import { DEVICES, dataHome } from "../../data/devices";
import { bundle } from "../../lib/dataRelease";

export const GET: APIRoute = ({ site }) =>
  new Response(JSON.stringify(bundle(DEVICES, { home: dataHome(site), schema: new URL("/data/schema.json", site).href })) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
