// 명령줄 인자 읽기(0.2.0) — 백엔드(crates/core/src/launch.rs take_args)가 넘긴 인자(실행 파일 이름 뺀 것)를 앱별 표(spec)로 나눈다.
// 잘못된 인자는 던지지 않고 bad 에 모아 화면이 한 줄로 알린다(설정은 맞는 것만 채운다). 자동으로 연결하지는 않는다.
// 지금은 Modbus Master 만 쓴다(apps/modbus-master/src/launch.ts). 다른 앱은 spec 과 값 검사만 더하면 된다.

/** 인자 이름 → 값이 따르는지("value") 혼자 쓰는지("flag") */
export type ArgSpec = Record<string, "value" | "flag">;

export interface ParsedArgs {
  /** 이름(«--» 뺀 소문자) → 값(flag 는 ""). 같은 이름이 또 오면 뒤의 것 */
  opts: Map<string, string>;
  /** 알 수 없거나 값이 빠진 인자(받은 모양 그대로) */
  bad: string[];
}

/** «--이름 값» · «--이름=값» 을 읽는다(«-이름» 도). 이름은 대소문자를 가리지 않는다 */
export function parseArgs(argv: readonly string[], spec: ArgSpec): ParsedArgs {
  const opts = new Map<string, string>();
  const bad: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const m = /^--?([A-Za-z][\w-]*)(?:=(.*))?$/s.exec(raw.trim());
    const name = m?.[1].toLowerCase();
    const kind = name ? spec[name] : undefined;
    if (!m || !name || !kind) {
      if (raw.trim()) bad.push(raw);
      continue;
    }
    if (kind === "flag") {
      if (m[2] !== undefined) bad.push(raw);
      else opts.set(name, "");
      continue;
    }
    let v = m[2];
    if (v === undefined) {
      const next = argv[i + 1];
      if (next === undefined || /^--?[A-Za-z]/.test(next)) {
        bad.push(raw);
        continue;
      }
      v = next;
      i++;
    }
    opts.set(name, v.trim());
  }
  return { opts, bad };
}

/** 10진 정수 min~max(앞뒤 공백 허용). 아니면 null */
export function intIn(s: string, min: number, max: number): number | null {
  const t = s.trim();
  if (!/^\d{1,10}$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

/** COM 포트 이름 «COM3»·«com12» → «COM3»(COM1~COM256 — 직접 넣는 포트·core launch 와 같은 범위). 아니면 null */
export function comPort(s: string): string | null {
  const m = /^com(\d{1,3})$/i.exec(s.trim());
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 256 ? `COM${Number(m[1])}` : null;
}

const HOST_RE = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,62})(?:\.[A-Za-z0-9-]{1,63})*$/;

/** IPv4 점 네 개(각 0~255, 앞자리 0 없음)인지 */
export const isIpv4 = (s: string) => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) && s.split(".").every((p) => Number(p) <= 255 && String(Number(p)) === p);

/** «host[:port]» · «[IPv6]:port» → { host, port }. 포트가 없으면 defPort. 호스트는 IPv4·이름(글자·숫자·-·.)·[IPv6] 만 */
export function hostPort(s: string, defPort: number): { host: string; port: number } | null {
  const t = s.trim();
  let host: string;
  let portText: string | undefined;
  const v6 = /^\[([0-9A-Fa-f:.]+)\](?::(.*))?$/.exec(t);
  if (v6) {
    host = v6[1];
    portText = v6[2];
    if (!host.includes(":")) return null;
  } else {
    const parts = t.split(":");
    if (parts.length > 2) return null;
    [host, portText] = parts;
    const numeric = /^[\d.]+$/.test(host);
    if (numeric ? !isIpv4(host) : !HOST_RE.test(host)) return null;
  }
  if (portText === undefined) return { host, port: defPort };
  const port = intIn(portText, 1, 65535);
  return port == null ? null : { host, port };
}
