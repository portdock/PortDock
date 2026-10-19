// 바깥 주소·연락처 — 앱(shared/*)과 사이트(site/)가 함께 읽는 한 곳.
// 값을 바꾸면 앱 설정 창·문제 보고·사이트(문의·푸터·내려받기·코드 서명 정책)가 함께 바뀐다.

/** 연락 메일 — 문제 보고 메일·사이트 문의. 도메인이 생기면 contact@portdock.dev(Email Routing → 이 메일)로 바꾼다 */
export const CONTACT_EMAIL = "portdock.contact@gmail.com";

/** 소스 저장소 */
export const REPO_URL = "https://github.com/portdock/PortDock";

/** GitHub 조직 구성원 — 코드 서명 정책의 팀 역할 근거(구성원 공개 설정이어야 바깥에서 보인다) */
export const ORG_PEOPLE_URL = "https://github.com/orgs/portdock/people";

/**
 * 후원 주소 — 비워 두면 앱 설정 창·사이트 푸터·내려받기 페이지의 «후원» 링크가 모두 숨는다.
 * 값을 넣을 때 함께 할 일:
 *  1. apps/<앱>/src-tauri/capabilities/default.json 의 opener:allow-open-url 에 이 주소(또는 «주소/*»)를 더한다
 *     — 빠지면 앱에서 눌러도 열리지 않는다.
 *  2. .github/FUNDING.yml 의 해당 줄 주석을 푼다(GitHub 저장소 «Sponsor» 단추).
 */
export const SPONSOR_URL: string = "";
