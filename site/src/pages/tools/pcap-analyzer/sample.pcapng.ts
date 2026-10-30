// pcap 해석기 «예시 캡처» — 빌드 때 만든 합성 pcapng(lib/pcapSample.ts). 한국어·영어 쪽이 같은 파일을 쓴다.
import type { APIRoute } from "astro";
import { samplePcapng } from "../../../lib/pcapSample";

export const GET: APIRoute = () => new Response(new Uint8Array(samplePcapng()), { headers: { "Content-Type": "application/octet-stream" } });
