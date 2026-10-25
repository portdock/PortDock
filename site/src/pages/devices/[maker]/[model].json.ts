// 장비 JSON 사본 — /devices/<제조사>/<모델>.json (원본은 저장소 data/devices, CC BY 4.0)
import type { APIRoute } from "astro";
import { DEVICES, devParams } from "../../../data/devices";

export const getStaticPaths = () => DEVICES.map((dev) => ({ params: devParams(dev), props: { dev } }));

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.dev, null, 2) + "\n", { headers: { "Content-Type": "application/json; charset=utf-8" } });
