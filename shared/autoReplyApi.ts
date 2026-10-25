// 자동응답 백엔드 명령 — 이름은 네 앱이 같다: set_rules · preview_rule · get_hits · reset_hits · set_match_options
// (+ set_auto_reply: Serial·TCP·UDP). 규칙 모양은 autoReply.ts
import { invoke } from "@tauri-apps/api/core";
import { ruleToWire, type AutoRule, type MatchOptions, type RulePreview, type SetRulesResult } from "./autoReply";

export interface AutoReplyApi {
  setRules: (rules: AutoRule[]) => Promise<SetRulesResult>;
  previewRule: (rule: AutoRule, sample: string) => Promise<RulePreview>;
  getHits: () => Promise<Record<string, number>>;
  resetHits: () => Promise<void>;
  setMatchOptions: (o: MatchOptions) => Promise<void>;
  /** Serial·TCP·UDP 만 — Simulator 는 늘 켜짐 */
  setEnabled: (on: boolean) => Promise<void>;
}

export const autoReplyApi: AutoReplyApi = {
  setRules: (rules) => invoke<SetRulesResult>("set_rules", { rules: rules.map(ruleToWire) }),
  previewRule: (rule, sample) => invoke<RulePreview>("preview_rule", { rule: ruleToWire(rule), sample }),
  getHits: () => invoke<Record<string, number>>("get_hits"),
  resetHits: () => invoke<void>("reset_hits"),
  setMatchOptions: (o) => invoke<void>("set_match_options", { stripTerminator: o.stripTerminator, logNoMatch: o.logNoMatch }),
  setEnabled: (on) => invoke<void>("set_auto_reply", { on }),
};

