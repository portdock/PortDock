// 로직 분석기 캡처 해석기 «예시» — 빌드 때 만든 합성 캡처(lib/logicSample.ts). 한국어·영어 쪽이 같은 파일을 쓴다.
import type { APIRoute } from "astro";
import { sampleUartCsv } from "../../../lib/logicSample";

export const GET: APIRoute = () => new Response(sampleUartCsv(), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
