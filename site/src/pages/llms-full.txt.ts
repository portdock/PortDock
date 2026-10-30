// llms-full.txt — AI 가 한 번에 읽는 장비 맵 요약(https://llmstxt.org 꼴). 짧은 안내는 llms.txt
// 크기: 전체 표(매뉴얼 주소·함수 코드·값 뜻까지)는 270KB 를 넘어 AI 가 한 번에 받기 어렵다 — 여기는 레지스터 한 줄 요약만 두고
// (상한 200KB, tools/data-release.test.mjs), 전체 표는 장비별 .md·JSON·all.json 으로 잇는다.
import type { APIRoute } from "astro";
import { DEVICES, RELEASE, dataHome, devPath } from "../data/devices";
import { citeText } from "../lib/dataRelease";
import { devicesDigest } from "../lib/devicesExport";
import { url } from "../lib/i18n";

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const head = [
    "# PortDock — Modbus register maps (digest)",
    "",
    `> ${RELEASE.devices} industrial devices from ${RELEASE.makers} makers, ${RELEASE.registers} registers. Data version v${RELEASE.version} (latest source check ${RELEASE.date}, content hash ${RELEASE.contentHash}). License CC BY 4.0 — cite «${citeText(RELEASE, dataHome(site))}».`,
    "",
    "## Source rules",
    "",
    "- Facts only (address, type, unit, scale, access, function codes, value meanings), taken from the manufacturer's own manual. Nothing guessed; items not confirmed in a manual are left out; manual sentences are not copied.",
    "- Every device lists its sources: document title, edition, pages and the date the document was opened and checked. Every register has its page (`ref` in JSON).",
    "- Unofficial and not affiliated with the makers. Firmware and model variants differ — check the device manual before writing (run commands, settings). Report mistakes with a page number on GitHub.",
    "",
    "## Reading the lines below",
    "",
    "- `HR` holding register, `IR` input register, `CO` coil, `DI` discrete input. The number is the 0-based address on the wire (the manual may write it 1-based or as 40001; the JSON keeps that in `manualAddress`).",
    "- Real value = raw × scale, in the given unit. Types: u16 s16 u32 s32 f32 f64 string bit; ABCD = big-endian, CDAB = word swap. Access r / rw / w.",
    `- Full tables with manual address, function codes, value meanings and page: ${new URL("/", site).origin}/devices/<maker>/<model>.md (e.g. ${abs(`/devices/${DEVICES[0].id}.md`)}), or ${abs("/devices/all.json")} (schema ${abs("/data/schema.json")}).`,
    "",
  ];
  const body = devicesDigest(DEVICES, (d) => ({ page: abs(url("en", devPath(d))), json: abs(`/devices/${d.id}.json`), md: abs(`/devices/${d.id}.md`) }));
  return new Response(head.join("\n") + body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
