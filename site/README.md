# PortDock 홈페이지 (portdock.dev)

Astro 7 정적 사이트 → Cloudflare Pages. 한국어 `/`, 영어 `/en/`. 결정 근거: `C:\dev\review\2026-10-17_통신도구.md` 14절.

- 개발: `npm run dev -w portdock-site` · 빌드: `npm run build:site` (→ `site/dist`) · 검사: `npx astro check` · 계산기 시험: `npm test -w portdock-site`
- 사용법 페이지는 앱의 `apps/<도구>/src/help.ts` 를 그대로 읽는다 — 앱 도움말을 고치면 사이트도 바뀐다.
- 도구 소개 문구·내려받기 파일 이름: `src/data/tools.ts`. 릴리스 파일 이름은 버전 없이 `PortDock-<App>-setup.exe` 로 고정(릴리스 작업과 맞출 것).
- 광고는 `AdSlot` 을 둔 페이지(웹 도구·가이드)에만. 내려받기·도구 소개 페이지에는 두지 않는다(애드센스 정책 + «광고 없음» 약속).

## 처음 올릴 때 (사용자)
1. Cloudflare 가입 → **Registrar 에서 portdock.dev 등록**(연 약 $12).
2. 이 저장소를 GitHub 에 올린 뒤 **Pages → 저장소 연결**: 빌드 명령 `npm run build:site`, 출력 폴더 `site/dist`, 루트 `/`, 환경 변수 `NODE_VERSION=22`.
3. Pages → 사용자 지정 도메인 `portdock.dev`.
4. **Email Routing** 켜기 → 받을 내 메일 주소 검증 → `contact@portdock.dev` 같은 주소를 그 메일로 전달.
5. **Turnstile** 위젯 만들기(도메인 portdock.dev) → 사이트 키·비밀 키.
6. Pages → 설정 → 변수:
   - 빌드(공개): `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_CF_ANALYTICS_TOKEN`(Web Analytics), 나중에 `PUBLIC_ADSENSE_CLIENT`·`PUBLIC_ADSENSE_SLOT`, `PUBLIC_NAVER_SITE_VERIFICATION`, `PUBLIC_GOOGLE_SITE_VERIFICATION`
   - 함수(비밀): `TURNSTILE_SECRET`, `CONTACT_TO`(검증한 내 메일), `CONTACT_FROM`(예: contact@portdock.dev)
   - 바인딩: send_email, 이름 `EMAIL`, 허용 수신 주소 = `CONTACT_TO`
7. **Google Search Console**·**네이버 서치어드바이저**에 사이트 등록 → 확인 값을 위 변수에 → `https://portdock.dev/sitemap-index.xml` 제출.
8. 애드센스는 사이트에 글·도구가 몇 개 쌓인 뒤 신청(개인정보처리방침 페이지 있음).

## 아직 없는 것
- 프로그램 화면 캡처(실행 검증 뒤 넣는다 — 지금 첫 화면 그림은 «기록 모양 예시»)
- `og.png`(공유 미리보기 그림), 가이드 글, 웹 도구 추가(HEX↔ASCII, Modbus 요청 만들기)
