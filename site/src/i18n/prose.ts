// 추가 언어의 긴 본문(문장 안에 링크가 많은 안전 원칙·개인정보처리방침) — 문구 표가 아니라 마크업(.astro)으로 둔다.
// i18n/index.ts 와 따로 두는 이유: index.ts 는 node 시험에서도 읽는데 node 는 .astro 를 못 읽는다.
import type { ExtraLang } from "./langs";
import JaSafety from "./ja/SafetyBody.astro";
import JaPrivacy from "./ja/PrivacyBody.astro";
import DeSafety from "./de/SafetyBody.astro";
import DePrivacy from "./de/PrivacyBody.astro";
import ViSafety from "./vi/SafetyBody.astro";
import ViPrivacy from "./vi/PrivacyBody.astro";

export const PROSE = {
  ja: { safety: JaSafety, privacy: JaPrivacy },
  de: { safety: DeSafety, privacy: DePrivacy },
  vi: { safety: ViSafety, privacy: ViPrivacy },
} satisfies Record<ExtraLang, { safety: unknown; privacy: unknown }>;
