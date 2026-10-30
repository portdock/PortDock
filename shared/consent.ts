// 여러 PortDock 앱이 함께 보는 «사용 통계» 동의(0.6.0) — 백엔드 consent.rs(공용 파일 shared-consent.json)를 읽고 쓴다.
// 한 앱에서 고르면 아직 묻지 않은 다른 앱은 다시 묻지 않고 그 값을 기본으로 쓴다. 앱마다 설정에서 따로 바꿀 수 있다.
// 읽지 못하면(파일 없음·깨짐·백엔드 없음) «묻지 않음» — 그 앱에서 묻는다. 기본은 꺼짐.
import { invoke } from "@tauri-apps/api/core";

/** 공용 동의(모양 검사 전 값 — usageData.sharedConsentPatch 가 고친다). 읽지 못하면 null */
export async function readSharedConsent(): Promise<unknown> {
  try {
    return await invoke<unknown>("consent_get");
  } catch {
    return null;
  }
}

/** 사용자가 고른 값을 공용 파일에 남긴다 — 실패해도 이 앱 설정은 그대로(다른 앱이 따로 물을 뿐) */
export function writeSharedConsent(usageStats: boolean) {
  invoke("consent_set", { usageStats }).catch(() => {});
}
