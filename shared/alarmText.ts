// (0.10.0) 값 감시·알람 화면 글 — Modbus Master·Plot 이 함께 쓴다(shared/AlarmPanel.tsx·AlarmRuleDialog.tsx)
import { dicts, type Lang } from "./lang.ts";
import { JA_ALARM, JA_KIND } from "./ja/alarm.ts";
import type { AlarmKind } from "./alarm.ts";

const ko = {
  title: "감시·알람",
  activeN: "걸림 {n}",
  noAlarm: "걸린 알람 없음 — 조건 {n}개 감시 중",
  notRunning: "연결하면 감시를 시작합니다(조건 {n}개)",
  ackAll: "모두 확인",
  ack: "확인",
  acked: "확인함",
  clearEnded: "끝난 것 지우기",
  sound: "소리",
  logStart: "기록 CSV…",
  logOn: "● 기록 {n}줄",
  logStop: "기록 멈춤",
  logTitle: "알람 기록 저장",
  ongoing: "진행 중",
  colKind: "조건",
  colName: "무엇",
  colValue: "값",
  colStart: "걸린 때",
  colEnd: "풀린 때",
  colDur: "지속",
  safety: "PortDock 은 안전 장치가 아닙니다 — 감시 보조용입니다. 설비 보호·인터록은 PLC·안전 회로가 맡아야 합니다.",
  // 조건 창
  dlgTitle: "감시 조건 — {a}",
  lo: "하한(이 값보다 작으면)",
  hi: "상한(이 값보다 크면)",
  stuck: "변화 없음(멈춤) 초",
  lost: "통신 끊김 초",
  hyst: "되돌아올 때 여유(히스테리시스)",
  hystHint: "하한 알람은 «하한 + 여유» 이상, 상한 알람은 «상한 − 여유» 이하가 돼야 풀립니다. 값이 경계에서 흔들릴 때 알람이 깜빡이지 않게 합니다.",
  emptyHint: "칸을 비우면 그 조건은 보지 않습니다. 값은 화면에 보이는 수(타입대로 읽은 값)로 판단합니다.",
  save: "저장",
  remove: "조건 지우기",
  close: "닫기",
  errLoHi: "하한은 상한보다 작아야 합니다.",
  errSecs: "초는 1~86400 사이로 넣습니다.",
  errHyst: "여유는 0 이상인 수입니다.",
  errNum: "수로 넣습니다.",
  errEmpty: "조건을 하나 이상 넣거나 «조건 지우기» 를 누릅니다.",
};
export type AlarmTextKey = keyof typeof ko;

const en: Record<AlarmTextKey, string> = {
  title: "Watch & alarms",
  activeN: "{n} active",
  noAlarm: "No active alarm — watching {n} condition(s)",
  notRunning: "Watching starts when you connect ({n} condition(s))",
  ackAll: "Acknowledge all",
  ack: "Ack",
  acked: "Acked",
  clearEnded: "Clear ended",
  sound: "Sound",
  logStart: "Log CSV…",
  logOn: "● Logged {n} lines",
  logStop: "Stop log",
  logTitle: "Save alarm log",
  ongoing: "ongoing",
  colKind: "Condition",
  colName: "What",
  colValue: "Value",
  colStart: "Raised",
  colEnd: "Cleared",
  colDur: "Duration",
  safety: "PortDock is not a safety device — it is a monitoring aid. Equipment protection and interlocks belong in the PLC and safety circuits.",
  dlgTitle: "Watch conditions — {a}",
  lo: "Low limit (alarm below)",
  hi: "High limit (alarm above)",
  stuck: "No change (stuck) seconds",
  lost: "Communication lost seconds",
  hyst: "Return margin (hysteresis)",
  hystHint: "A low alarm clears at «low + margin» or above, a high alarm at «high − margin» or below — so a value wobbling at the limit does not make the alarm flicker.",
  emptyHint: "Leave a box empty to skip that condition. Values are judged as the number shown on screen (decoded by type).",
  save: "Save",
  remove: "Remove conditions",
  close: "Close",
  errLoHi: "The low limit must be below the high limit.",
  errSecs: "Seconds must be 1–86400.",
  errHyst: "The margin is a number of 0 or more.",
  errNum: "Enter a number.",
  errEmpty: "Enter at least one condition, or press «Remove conditions».",
};

export const ALARM_TEXT = dicts(ko, en, { ja: JA_ALARM });

export function alarmText(lang: Lang, k: AlarmTextKey, v?: Record<string, string | number>): string {
  let s = ALARM_TEXT[lang][k];
  if (v) for (const [a, b] of Object.entries(v)) s = s.split(`{${a}}`).join(String(b));
  return s;
}

/** 조건 종류 이름 — 추가 언어(JA_KIND 등)에 없으면 영어 */
export const kindLabel = (k: AlarmKind, lang: Lang) => (lang === "ko" || lang === "en" ? KIND_LABEL[k][lang] : lang === "ja" ? JA_KIND[k] : KIND_LABEL[k].en);

export const KIND_LABEL: Record<AlarmKind, { ko: string; en: string }> = {
  lo: { ko: "하한", en: "Low" },
  hi: { ko: "상한", en: "High" },
  stuck: { ko: "멈춤", en: "Stuck" },
  lost: { ko: "끊김", en: "Lost" },
};
