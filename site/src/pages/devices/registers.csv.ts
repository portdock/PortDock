// 모든 장비의 레지스터를 한 CSV 로 — /devices/registers.csv (엑셀·pandas 로 바로 열기)
import type { APIRoute } from "astro";
import { DEVICES } from "../../data/devices";
import { devicesCsv } from "../../lib/devicesExport";

export const GET: APIRoute = () => new Response("﻿" + devicesCsv(DEVICES), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
