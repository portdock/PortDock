// 데이터 묶음 판 — /data/version.json (판·기준일·내용 해시·파일·바뀐 점). 받아 둔 사본이 최신인지 contentHash 로 견준다
import type { APIRoute } from "astro";
import { DEVICES, RELEASE, dataHome } from "../../data/devices";
import { CC_BY_URL, DATASET_NAME, DATA_FILES, DEVICE_JSON, DEVICE_MD, VERSION_NOTE, changelog, citeText } from "../../lib/dataRelease";
import { url } from "../../lib/i18n";

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  // 주소 틀({maker}) 은 new URL 이 %7B 로 바꾸므로 사이트 주소에 그대로 잇는다
  const tpl = (p: string) => new URL(site ?? "http://localhost").origin + p;
  return new Response(
    JSON.stringify(
      {
        name: DATASET_NAME,
        ...RELEASE,
        versionNote: VERSION_NOTE,
        url: dataHome(site),
        about: abs(url("en", "data/")),
        license: CC_BY_URL,
        citation: citeText(RELEASE, dataHome(site)),
        files: [...DATA_FILES.map((f) => ({ url: abs(f.path), format: f.format, description: f.en })), { urlTemplate: tpl(DEVICE_JSON), format: "application/json", description: "One device (pattern; id = maker/model)" }, { urlTemplate: tpl(DEVICE_MD), format: "text/markdown", description: "One device as a Markdown table (pattern)" }],
        changelog: changelog(DEVICES),
      },
      null,
      2,
    ) + "\n",
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
};
