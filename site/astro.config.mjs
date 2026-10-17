// PortDock 홈페이지 — 정적 HTML(Cloudflare Pages). 한국어 기본(/), 영어 /en/
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://portdock.dev",
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
