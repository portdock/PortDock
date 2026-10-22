# PortDock 홈페이지 (portdock.dev · 도메인 전에는 portdock.pages.dev)

Astro 7 정적 사이트 → Cloudflare Pages. 한국어 `/`, 영어 `/en/`. 결정 근거: `C:\dev\review\2026-10-17_통신도구.md` 14절.

- 개발: `npm run dev -w portdock-site` · 빌드: `npm run build:site` (→ `site/dist`) · 검사: `npx astro check` · 계산기 시험: `npm test -w portdock-site`
- 사용법 페이지는 앱의 `apps/<도구>/src/help.ts` 를 그대로 읽는다 — 앱 도움말을 고치면 사이트도 바뀐다.
- 도구 소개 문구·내려받기 파일 이름: `src/data/tools.ts`. 릴리스 파일 이름은 버전 없이 `PortDock-<App>-setup.exe` 로 고정(릴리스 작업과 맞출 것).
- 광고는 `AdSlot` 을 둔 페이지(웹 도구·가이드)에만. 내려받기·도구 소개 페이지에는 두지 않는다(애드센스 정책 + «광고 없음» 약속).
- 사이트 주소는 빌드 변수 **`SITE_URL`**(기본 `https://portdock.dev`). canonical·hreflang·sitemap·`robots.txt`(`src/pages/robots.txt.ts`)·og:url·og:image·JSON-LD 가 모두 이 값을 따른다.
  시험: `SITE_URL=https://portdock.pages.dev npm run build -w portdock-site` 뒤 `dist/robots.txt`·`dist/sitemap-index.xml` 확인.
- 연락 메일·후원 주소·저장소 주소는 `shared/links.ts` 한 곳(앱과 함께 읽는다). `SPONSOR_URL` 이 비면 푸터·내려받기 페이지의 «후원» 이 숨는다.
- 공유 미리보기 그림 `public/og.png`(한국어)·`public/og-en.png`(영어), 1200×630 — `node site/og/make.mjs` 로 다시 만든다(윈도우 Edge 헤드리스로 찍음, 결과 PNG 를 커밋).
- 코드 서명 정책 페이지 `/code-signing/`(SignPath Foundation 조건). 승인되면 `src/views/CodeSigningPage.astro` 의 `status` 를 `"active"` 로.

## 처음 올릴 때 — 무료 주소 portdock.pages.dev (사용자)
1. Cloudflare 가입 → **Workers & Pages → Pages → 저장소 연결**(portdock/PortDock): 프로젝트 이름 `portdock`(→ `portdock.pages.dev`), 빌드 명령 `npm run build:site`, 출력 폴더 `site/dist`, 루트 `/`.
2. Pages → 설정 → 변수(빌드): `NODE_VERSION=22`, **`SITE_URL=https://portdock.pages.dev`** — 빠지면 canonical·sitemap 이 아직 없는 portdock.dev 를 가리킨다.
3. `PUBLIC_TURNSTILE_SITE_KEY` 는 **넣지 않는다** → 문의 페이지가 양식 대신 메일 주소 복사·GitHub 이슈·Discussions 안내로 나온다(메일 전달 함수는 도메인의 Email Routing 이 있어야 동작).
4. GitHub 저장소 Settings → Features 에서 **Discussions 켜기**(문의 페이지가 링크한다).
5. 배포 뒤 확인: `https://portdock.pages.dev/robots.txt` 의 Sitemap 줄, 아무 페이지의 `<link rel="canonical">` 가 pages.dev 인지.

## 도메인을 산 뒤 (portdock.dev)
1. Cloudflare **Registrar 에서 portdock.dev 등록**(연 약 $12) → Pages → 사용자 지정 도메인 `portdock.dev`.
2. 빌드 변수 `SITE_URL` 을 지우거나 `https://portdock.dev` 로 → 다시 배포. ✅ 10/22. pages.dev 쪽은 canonical 이 portdock.dev 를 가리키고, `layouts/Base.astro` 머리의 한 줄 스크립트가 `portdock.pages.dev` 로 들어온 방문자를 같은 쪽의 portdock.dev 로 보낸다(배포 미리보기 주소는 그대로)
3. 앱 안 링크(apps/*/src-tauri/tauri.conf.json `homepage`, capabilities opener 허용, README, `.github/ISSUE_TEMPLATE/config.yml`, `tools/installer-license.mjs` 의 개인정보처리방침 주소)는 이미 portdock.dev 다. 도메인을 사지 않기로 하면 이것들을 pages.dev 로 바꾼다.
4. **Email Routing** 켜기 → 받을 내 메일 주소 검증 → `contact@portdock.dev` 같은 주소를 그 메일로 전달.
5. **Turnstile** 위젯 만들기(도메인 portdock.dev) → 사이트 키·비밀 키.
6. Pages → 설정 → 변수:
   - 빌드(공개): `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_CF_ANALYTICS_TOKEN`(Web Analytics), 나중에 `PUBLIC_ADSENSE_SLOT`(게시자 ID 는 `src/lib/ads.ts` 에 넣어 둠 — 10/22, 소유 확인 meta·`public/ads.txt` 포함), `PUBLIC_NAVER_SITE_VERIFICATION`, `PUBLIC_GOOGLE_SITE_VERIFICATION`
   - 함수(비밀): `TURNSTILE_SECRET`, `CONTACT_TO`(검증한 내 메일), `CONTACT_FROM`(예: contact@portdock.dev)
   - 바인딩: send_email, 이름 `EMAIL`, 허용 수신 주소 = `CONTACT_TO`
7. **Google Search Console**·**네이버 서치어드바이저**에 사이트 등록 → 확인 값을 위 변수에 → `<SITE_URL>/sitemap-index.xml` 제출(pages.dev 단계에서도 등록할 수 있다).
8. 애드센스는 사이트에 글·도구가 몇 개 쌓인 뒤 신청(개인정보처리방침 페이지 있음). **애드센스 사이트는 내가 소유한 도메인이어야 한다**(사이트 등록 때 루트 도메인 소유 확인) — `*.pages.dev` 로는 신청이 안 되는 것으로 본다(신청 전 다시 확인).

## AdSense Offerwall — «편의 묶음» 내려받기에만 (나중에, 코드 변경 없음)
Offerwall 은 방문자에게 «광고 보기 등으로 이어서 보기» 를 고르게 하는 애드센스 메시지다. 프로그램 자체(GitHub 릴리스)는 늘 그대로 무료로 두고, 따로 만드는 «편의 묶음»(예: 여러 도구를 한 번에 받는 zip) 페이지에만 건다.
1. 묶음 페이지를 한 경로 아래에만 만든다 — 예: `/bundle/`·`/en/bundle/`. 이 페이지에는 애드센스 스크립트가 있어야 하므로 `Base` 의 `ads` 를 켠다(내려받기·도구 소개 페이지의 «광고 없음» 약속은 그대로).
2. AdSense → **Privacy & messaging** → Offerwall 카드 **Create**(있으면 **Manage → Create message**) → **Select sites** 에서 portdock.dev.
3. **Add URLs → Add page inclusion**: `portdock.dev/bundle/`, `portdock.dev/en/bundle/` 두 줄. 포함 규칙을 하나라도 넣으면 **나머지 모든 페이지는 자동으로 빠진다**(넣지 않으면 사이트 전체에 걸린다 — 반드시 넣을 것).
   경로 규칙은 그 아래 페이지 전체에 걸리고 `www.` 유무는 같게 본다. 예외가 필요하면 **Add page exclusion**(제외가 포함보다 우선).
4. 언어(한국어·영어) → Metering(몇 쪽부터 보일지) → User choices(예: Rewarded ad — 보상으로 열어 줄 시간·쪽 수) → **Publish**.
5. 시험: 묶음 페이지 주소 끝에 `?fc=alwaysshow` 를 붙이면 바로 보인다(제외된 페이지에서는 보이지 않는 게 맞다).
근거: [Create an Offerwall message](https://support.google.com/adsense/answer/13866332), [About Offerwall messages](https://support.google.com/adsense/answer/13865318).

## 아직 없는 것
- 프로그램 화면 캡처(실행 검증 뒤 넣는다 — 지금 첫 화면 그림은 «기록 모양 예시»)
- 가이드 글 더, 웹 도구 추가
