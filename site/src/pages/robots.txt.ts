// robots.txt — 사이트맵 주소가 빌드 변수 SITE_URL 을 따르도록 빌드 때 만든다
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) =>
  new Response(["User-agent: *", "Allow: /", `Sitemap: ${new URL("/sitemap-index.xml", site).href}`, ""].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
