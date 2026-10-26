// «이 PC 랜카드» 카드 — 링크·이중·IPv4 + 랜카드 점검(고급 설정·절전·오류·프로필·방화벽, 용도별 판정)
// 판정·제조사 예는 shared/nicCheck.ts(순수 함수). 이 화면은 읽기만 한다 — 바꾸는 곳만 안내한다.
import { tip } from "@shared/tips";
import { fmtSpeed, LEVEL_TEXT, type NicList, type NicProp, type NicSummary } from "@shared/portinfo";
import { keyProps, NIC_CANNOT_SEE, NIC_PURPOSES, NIC_WHERE, nicVerdict, PROFILE_TEXT, PURPOSE_TEXT, rangeText, VENDOR_EXAMPLES, type NicPurpose } from "@shared/nicCheck";
import type { Key, Lang } from "./i18n";

type T = (k: Key, v?: Record<string, string | number>) => string;

function PropRow({ p, label, lang, t, vendor, link }: { p: NicProp; label?: string; lang: Lang; t: T; vendor?: string; link: (url: string) => void }) {
  const ex = vendor ? (VENDOR_EXAMPLES[vendor] ?? []) : null;
  return (
    <tr>
      <td>
        {label ?? p.name}
        <div className="hint mono">{p.keyword}</div>
      </td>
      <td>{p.display ?? "—"}</td>
      <td className="mono">{p.raw ?? t("nicDefault", { v: p.default ?? "—" })}</td>
      <td className="mono hint">{rangeText(p) || "—"}</td>
      {ex && (
        <td className="nic-vendor">
          {ex.length
            ? ex.map((e) => (
                <div key={e.vendor}>
                  <a
                    href={e.url}
                    data-tip={tip(lang, "piNicVendor")}
                    onClick={(ev) => {
                      ev.preventDefault();
                      link(e.url);
                    }}
                  >
                    {e.vendor}
                  </a>
                  : {e.text[lang]}
                </div>
              ))
            : "—"}
        </td>
      )}
    </tr>
  );
}

function Nic({ n, list, purpose, lang, t, link }: { n: NicSummary; list: NicList; purpose: NicPurpose; lang: Lang; t: T; link: (url: string) => void }) {
  const advRead = !list.errors.some((e) => /AdvancedProperty/.test(e));
  const v = nicVerdict(n, purpose, list.firewall ?? [], advRead);
  const k = keyProps(n);
  const camera = purpose === "camera";
  const fw = n.profile ? list.firewall?.find((f) => f.profile === n.profile) : undefined;
  const onOff = (x: boolean | null | undefined) => (x == null ? "—" : x ? t("on") : t("off"));
  const rows: [string, string][] = [
    [t("nicLink"), `${n.up ? fmtSpeed(n.speed) : t("nicDown")}${n.fullDuplex == null ? "" : ` · ${n.fullDuplex ? t("full") : t("half")}`}`],
    ["IPv4", `${n.ipv4.join(", ") || "—"}${n.gateway ? ` · GW ${n.gateway}` : ""}`],
  ];
  if (n.profile !== undefined) rows.push([t("nicProfile"), n.profile ? `${PROFILE_TEXT[n.profile][lang]}${n.network ? ` (${n.network})` : ""}` : t("nicNoProfile")]);
  if (fw) rows.push([t("nicFwThis"), onOff(fw.enabled)]);
  if (n.canTurnOff !== undefined) rows.push([t("nicCanOff"), `${onOff(n.canTurnOff)}${n.pnpCapabilities != null ? ` · PnPCapabilities ${n.pnpCapabilities}` : ""}`]);
  if (n.stats) {
    rows.push([t("nicRxErr"), `${n.stats.inErrors.toLocaleString()} · ${n.stats.inDiscards.toLocaleString()}`]);
    rows.push([t("nicTxErr"), `${n.stats.outErrors.toLocaleString()} · ${n.stats.outDiscards.toLocaleString()}`]);
  }
  const head = (
    <tr>
      <th>{t("nicColItem")}</th>
      <th>{t("nicColNow")}</th>
      <th>{t("nicColRaw")}</th>
      <th>{t("nicColRange")}</th>
      {camera && <th>{t("nicColVendor")}</th>}
    </tr>
  );
  return (
    <div className={`nic-block${n.up ? "" : " down"}`}>
      <div className="nic-head">
        <b>{n.name}</b>
        <span className="hint ellipsis">{n.description}</span>
        <span className={`lv lv-${v.level}`}>{LEVEL_TEXT[v.level][lang]}</span>
      </div>
      {v.notes.length > 0 && (
        <ul className="card-notes">
          {v.notes.map((x, i) => (
            <li key={i}>{x[lang]}</li>
          ))}
        </ul>
      )}
      <dl className="kv">
        {rows.map(([a, b]) => (
          <div className="kv-row" key={a}>
            <dt>{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
      {n.advanced !== undefined && (
        <>
          <div className="sub-title">{t("nicAdv")}</div>
          {k.rows.length ? (
            <table className={`grid nic-props${camera ? " vendor" : ""}`}>
              <thead>{head}</thead>
              <tbody>
                {k.rows.map((r) => (
                  <PropRow key={r.prop.keyword} p={r.prop} label={r.label[lang]} lang={lang} t={t} vendor={camera ? r.id : undefined} link={link} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="hint">{t("nicNoAdv")}</div>
          )}
          {k.rows.length > 0 && k.missing.length > 0 && <div className="hint">{t("nicMissing", { list: k.missing.map((m) => m[lang]).join(", ") })}</div>}
          {k.others.length > 0 && (
            <details className="nic-others">
              <summary>{t("nicOthers", { n: k.others.length })}</summary>
              <table className="grid nic-props">
                <tbody>
                  {k.others.map((p) => (
                    <PropRow key={p.keyword} p={p} lang={lang} t={t} link={link} />
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export function NicCard({
  lang,
  t,
  nics,
  loading,
  onLoad,
  purpose,
  setPurpose,
  link,
}: {
  lang: Lang;
  t: T;
  nics: NicList | null;
  loading: boolean;
  onLoad: () => void;
  purpose: NicPurpose;
  setPurpose: (p: NicPurpose) => void;
  link: (url: string) => void;
}) {
  const purposeSel = (
    <label className="inline nic-purpose" data-tip={tip(lang, "piNicPurpose")}>
      {t("nicPurpose")}
      <select value={purpose} onChange={(e) => setPurpose(e.target.value as NicPurpose)} aria-label={t("nicPurpose")}>
        {NIC_PURPOSES.map((p) => (
          <option key={p} value={p}>
            {PURPOSE_TEXT[p][lang]}
          </option>
        ))}
      </select>
    </label>
  );
  if (!nics)
    return (
      <div className="row-inline">
        <button className="btn small" onClick={onLoad} disabled={loading}>
          {loading ? t("loading") : t("nicsLoad")}
        </button>
        {purposeSel}
      </div>
    );
  return (
    <>
      <div className="row-inline">
        {purposeSel}
        {loading && <span className="hint">{t("loading")}</span>}
      </div>
      {nics.firewall && nics.firewall.length > 0 && (
        <div className="hint">
          {t("nicFirewall")}:{" "}
          {nics.firewall.map((f) => `${PROFILE_TEXT[f.profile][lang]} ${f.enabled == null ? "—" : f.enabled ? t("on") : t("off")}${f.current ? ` (${t("nicCurrent")})` : ""}`).join(" · ")}
        </div>
      )}
      {nics.nics.map((n) => (
        <Nic key={n.name} n={n} list={nics} purpose={purpose} lang={lang} t={t} link={link} />
      ))}
      {nics.errors.map((x) => (
        <div key={x} className="hint warn">
          {t("readFail")}: {x}
        </div>
      ))}
      {purpose === "camera" && (
        <div className="hint nic-vendor-note">
          {t("nicVendorNote")}{" "}
          {(VENDOR_EXAMPLES.firewall ?? []).map((e) => (
            <span key={e.vendor}>
              {t("nicFwVendor")} ·{" "}
              <a
                href={e.url}
                onClick={(ev) => {
                  ev.preventDefault();
                  link(e.url);
                }}
              >
                {e.vendor}
              </a>
              : {e.text[lang]}
            </span>
          ))}
        </div>
      )}
      <div className="hint">{t("nicsNote")}</div>
      <div className="hint">{NIC_WHERE[lang]}</div>
      <div className="sub-title">{t("nicCannot")}</div>
      <ul className="plain hint">
        {NIC_CANNOT_SEE.map((c) => (
          <li key={c.en}>{c[lang]}</li>
        ))}
      </ul>
    </>
  );
}
