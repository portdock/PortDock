// PortDock 홈페이지 — 정적 HTML(Cloudflare Pages). 한국어 기본(/), 영어 /en/
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

// 사이트 주소 — canonical·hreflang·sitemap·robots.txt·og:url·og:image·JSON-LD 가 모두 이 값을 따른다.
// 도메인 전에는 Cloudflare Pages 빌드 변수 SITE_URL=https://portdock.pages.dev 로 빌드한다(site/README.md).
const SITE_URL = (process.env.SITE_URL || "https://portdock.dev").trim().replace(/\/+$/, "");
if (!/^https?:\/\/[^/]+$/.test(SITE_URL)) throw new Error(`SITE_URL 은 «https://호스트» 꼴이어야 합니다: ${SITE_URL}`);

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "always",
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: "ko", locales: { ko: "ko-KR", en: "en-US" } },
    }),
  ],
  vite: {
    // 앱의 도움말(apps/*/src/help.ts)을 그대로 읽어 문서 페이지를 만든다
    resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
  },
});
