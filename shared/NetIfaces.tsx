// 이 PC 의 랜카드 IPv4 주소 — 서버·UDP 받을 주소·멀티캐스트 랜카드 칸을 «목록에서 고르기 + 직접 적기» 로.
// 백엔드 명령 `interfaces`(core net.rs, GetAdaptersAddresses) — TCP·UDP 앱.
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { tip } from "./tips";
import type { Lang } from "./uiText";
import "./net.css";

export interface NetIface {
  name: string;
  description: string;
  ipv4: string;
  prefix: number;
  mask: string;
  gateway?: string;
  up: boolean;
  loopback: boolean;
}

const L = {
  ko: {
    title: "이 PC 주소",
    all: "모든 랜카드",
    local: "이 PC 안에서만",
    down: "연결 안 됨",
    none: "랜카드 주소를 읽지 못했습니다",
    refresh: "다시 읽기",
    use: "이 주소로",
    gw: "게이트웨이",
    notHere: "«{a}» 는 이 PC 의 주소가 아닙니다 — 시작하면 «이 PC 에 없는 주소» 로 실패합니다. 아래 목록에서 고르세요.",
    downHere: "«{a}» 랜카드({b})가 연결돼 있지 않습니다(케이블·무선 확인).",
  },
  en: {
    title: "This PC",
    all: "all adapters",
    local: "this PC only",
    down: "not connected",
    none: "Could not read the adapter addresses",
    refresh: "Reload",
    use: "Use this address",
    gw: "gateway",
    notHere: "«{a}» is not an address of this PC — starting will fail with «address not available». Pick one from the list below.",
    downHere: "The adapter for «{a}» ({b}) is not connected (check cable / Wi-Fi).",
  },
};

export const ifaceText = (lang: Lang, k: keyof (typeof L)["ko"], a = "", b = "") => L[lang][k].replace("{a}", a).replace("{b}", b);

/** 랜카드 목록 — 처음에 한 번, «다시 읽기» 로 또. 백엔드가 없으면(미리보기 등) 빈 목록 */
export function useInterfaces() {
  const [list, setList] = useState<NetIface[] | null>(null);
  const refresh = useCallback(() => {
    invoke<NetIface[]>("interfaces")
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useEffect(refresh, [refresh]);
  return { list: list ?? [], loaded: list !== null, refresh };
}

/** 주소 칸에 붙는 고르기 목록(datalist). `any` 면 0.0.0.0 을 맨 앞에 */
export function IfaceOptions({ id, lang, list, any = true, loopback = true }: { id: string; lang: Lang; list: NetIface[]; any?: boolean; loopback?: boolean }) {
  const t = L[lang];
  const seen = new Set<string>();
  return (
    <datalist id={id}>
      {any && <option value="0.0.0.0">{t.all}</option>}
      {list
        .filter((i) => (loopback || !i.loopback) && !seen.has(i.ipv4) && seen.add(i.ipv4))
        .map((i) => (
          <option key={i.ipv4} value={i.ipv4}>
            {i.loopback ? t.local : `${i.name}${i.up ? "" : ` (${t.down})`}`}
          </option>
        ))}
    </datalist>
  );
}

/** 적은 주소가 이 PC 의 것인지 — 아니면 알림 문구(목록을 못 읽었거나 0.0.0.0·127.x·이름이면 null) */
export function ifaceProblem(lang: Lang, host: string, list: NetIface[]): string | null {
  const h = host.trim();
  if (!list.length || !/^\d+\.\d+\.\d+\.\d+$/.test(h) || h === "0.0.0.0" || h.startsWith("127.")) return null;
  const hit = list.find((i) => i.ipv4 === h);
  if (!hit) return ifaceText(lang, "notHere", h);
  if (!hit.up) return ifaceText(lang, "downHere", h, hit.name);
  return null;
}

/** «이 PC 주소» 목록 — 연결된 랜카드만(루프백 빼고), 누르면 그 주소를 고른다 */
export function IfaceList({ lang, list, loaded, onPick, refresh, disabled }: { lang: Lang; list: NetIface[]; loaded: boolean; onPick?: (ip: string) => void; refresh: () => void; disabled?: boolean }) {
  const t = L[lang];
  const shown = list.filter((i) => i.up && !i.loopback);
  return (
    <div className="ifaces">
      <div className="ifaces-head">
        <span data-tip={tip(lang, "ifaces")}>{t.title}</span>
        <button type="button" className="btn small ghost" onClick={refresh} aria-label={t.refresh} data-tip={tip(lang, "ifaceRefresh")}>
          ↻
        </button>
      </div>
      {loaded && shown.length === 0 && <div className="hint">{t.none}</div>}
      {shown.map((i) => (
        <button
          type="button"
          key={i.ipv4}
          className="iface"
          disabled={disabled || !onPick}
          onClick={() => onPick?.(i.ipv4)}
          title={`${i.description}\n${i.ipv4}/${i.prefix} (${i.mask})${i.gateway ? `\n${t.gw} ${i.gateway}` : ""}${onPick ? `\n${t.use}` : ""}`}
        >
          <span className="mono">
            {i.ipv4}/{i.prefix}
          </span>
          <span className="iface-name">{i.name}</span>
        </button>
      ))}
    </div>
  );
}
