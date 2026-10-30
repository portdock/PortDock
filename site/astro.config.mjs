// PortDock 홈페이지 — 정적 HTML(Cloudflare Pages). 한국어 기본(/), 영어 /en/
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

// 영어 404(src/pages/en/404.astro)는 en/404/index.html 로 나온다 — Cloudflare Pages 가 /en/… 의 없는 주소에 쓰도록 en/404.html 로 옮긴다
const en404 = {
  name: "en-404",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const from = new URL("en/404/index.html", dir);
      if (!fs.existsSync(from)) return;
      fs.renameSync(from, new URL("en/404.html", dir));
      fs.rmdirSync(new URL("en/404/", dir));
    },
  },
};

// 사이트 주소 — canonical·hreflang·sitemap·robots.txt·og:url·og:image·JSON-LD 가 모두 이 값을 따른다.
// 도메인 전에는 Cloudflare Pages 빌드 변수 SITE_URL=https://portdock.pages.dev 로 빌드한다(site/README.md).
const SITE_URL = (process.env.SITE_URL || "https://portdock.dev").trim().replace(/\/+$/, "");
if (!/^https?:\/\/[^/]+$/.test(SITE_URL)) throw new Error(`SITE_URL 은 «https://호스트» 꼴이어야 합니다: ${SITE_URL}`);

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "always",
  // 스타일(약 9KB)을 페이지마다 넣는다 — 첫 화면을 막는 CSS 요청이 없어진다(Lighthouse render-blocking)
  build: { inlineStylesheets: "always" },
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: "ko", locales: { ko: "ko-KR", en: "en-US" } },
      filter: (page) => !page.endsWith("/en/404/"),
      // 데이터 묶음 파일(장비 맵 JSON·CSV·스키마·판)과 AI 용 안내도 sitemap 에 — 쪽(HTML)이 아니라 저절로 들어가지 않는다(tools/site-check.mjs 가 대조)
      customPages: ["/devices/all.json", "/devices/registers.csv", "/devices/index.json", "/data/schema.json", "/data/version.json", "/llms.txt", "/llms-full.txt"].map((p) => SITE_URL + p),
    }),
    en404,
  ],
  vite: {
    // 앱의 도움말(apps/*/src/help.ts)을 그대로 읽어 문서 페이지를 만든다
    resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
  },
});
