// PortDock MCP(portdock-mcp.exe) 배포 파일 만들기 — .mcpb 묶음의 manifest.json 과 공식 MCP 레지스트리용 server.json.
// 레지스트리 제출(mcp-publisher publish)은 하지 않는다 — 사람이 확인한 뒤 한다(docs/mcp.md «배포»).
//
//   node tools/mcp.mjs manifest --out <폴더>                              # .mcpb 안에 넣을 manifest.json(릴리스 CI 가 부름)
//   node tools/mcp.mjs server-json --sums SHA256SUMS.txt [--out 파일]     # 릴리스의 .mcpb 해시를 넣은 server.json
//   node tools/mcp.mjs server-json --draft                                # crates/mcp/server.json(해시 자리 0) 다시 쓰기
//   옵션: --version 0.7.0(기본: Cargo.toml [workspace.package] version)
//
// 형식 근거(2026-10-30 확인):
//  - .mcpb: github.com/modelcontextprotocol/mcpb MANIFEST.md — manifest_version "0.3", server.type "binary",
//    mcp_config.command 는 «${__dirname}» 기준, Windows 는 .exe 를 앱이 붙인다(그래도 이 묶음은 Windows 전용이라 .exe 를 적는다),
//    user_config(type·title·description·default)·compatibility.platforms("win32")
//  - server.json: github.com/modelcontextprotocol/registry docs/modelcontextprotocol-io/package-types.mdx — registryType "mcpb",
//    identifier = GitHub 릴리스 주소(문자열 «mcp» 포함 — 파일 이름 .mcpb), fileSha256 필수(클라이언트가 설치 전에 확인), transport stdio.
//    이름 io.github.<조직>/<이름> 은 GitHub 로그인으로 소유를 확인한다(조직 portdock)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, SITE, ROOT, loadSums, downloadUrl, parseArgs, needVersion } from "./release-assets.mjs";

export const MCPB_FILE = "PortDock-MCP.mcpb";
export const ZIP_FILE = "PortDock-MCP.zip";
export const EXE = "portdock-mcp.exe";
export const REGISTRY_NAME = "io.github.portdock/portdock-mcp";
export const SCHEMA = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";
const DRAFT = path.join(ROOT, "crates", "mcp", "server.json");
const ZERO = "0".repeat(64);

/** 도구 이름·한 줄 설명 — crates/mcp/src/server.rs TOOL_NAMES 와 같은 순서(시험이 맞춰 본다) */
export const TOOLS = [
  ["ports_list", "List COM ports with device name, USB VID:PID and driver state (read-only)"],
  ["port_inspect", "Port Inspector report for one COM port: driver, USB path, power saving, events (read-only)"],
  ["serial_read", "Listen on a COM port for a set time; sends nothing (read-only)"],
  ["modbus_read", "One Modbus read (FC 01–04) over TCP, RTU or RTU over TCP (read-only)"],
  ["mc_read", "Mitsubishi MC protocol 3E binary batch read 0401 (read-only)"],
  ["scpi_query", "One SCPI query ending with ?; state-changing queries refused (read-only)"],
  ["ping", "Ping one IPv4 address up to 10 times, optional TCP connect timing (read-only)"],
  ["net_adapters", "Network adapter settings, link speed, power saving, firewall profiles (read-only)"],
  ["device_map_get", "Built-in Modbus register maps of industrial devices (read-only)"],
  ["modbus_write_sim", "Write to a Modbus TCP simulator on 127.0.0.1 only"],
  ["mc_write_sim", "Write to an MC protocol PLC simulator on 127.0.0.1 only"],
];

export const DESCRIPTION = "Read-only MCP server for COM ports, Modbus, MC protocol and SCPI devices on Windows";

export function workspaceVersion(root = ROOT) {
  const toml = fs.readFileSync(path.join(root, "Cargo.toml"), "utf8");
  const v = /\[workspace\.package\][^[]*?version\s*=\s*"([^"]+)"/.exec(toml)?.[1];
  return needVersion(v);
}

/** .mcpb 의 manifest.json */
export function manifestFor(version) {
  return {
    manifest_version: "0.3",
    name: "portdock-mcp",
    display_name: "PortDock MCP",
    version,
    description: DESCRIPTION,
    long_description:
      "Lets an AI client read this Windows PC's serial (COM) ports and network adapters (Port Inspector), listen on a serial port, and read Modbus RTU/TCP, Mitsubishi MC protocol (3E) and SCPI instruments. All tools only read, except two that write only to simulators on 127.0.0.1 (PortDock Modbus Slave, PLC Simulator). There is no tool that writes to real devices. Every call is kept in a local session log; nothing is sent elsewhere.",
    author: { name: "PortDock", url: SITE },
    repository: { type: "git", url: REPO },
    homepage: `${SITE}/en/guides/portdock-mcp/`,
    documentation: `${SITE}/en/guides/portdock-mcp/`,
    support: `${REPO}/issues`,
    license: "GPL-3.0-only",
    keywords: ["serial", "com-port", "modbus", "mc-protocol", "scpi", "industrial", "windows"],
    privacy_policies: [`${SITE}/en/privacy/`],
    server: {
      type: "binary",
      entry_point: `server/${EXE}`,
      mcp_config: {
        command: `\${__dirname}/server/${EXE}`,
        args: [],
        env: { PORTDOCK_MCP_LANG: "${user_config.lang}" },
      },
    },
    user_config: {
      lang: {
        type: "string",
        title: "Message language (en or ko)",
        description: "Language of error messages from PortDock: en (English) or ko (Korean).",
        default: "en",
        required: false,
      },
    },
    tools: TOOLS.map(([name, description]) => ({ name, description })),
    tools_generated: false,
    compatibility: { platforms: ["win32"] },
  };
}

/** 공식 레지스트리 server.json — sha 는 릴리스 .mcpb 의 SHA-256 */
export function serverJsonFor(version, sha) {
  if (!/^[0-9a-f]{64}$/.test(sha)) throw new Error(`fileSha256 형식이 아님: ${sha}`);
  return {
    $schema: SCHEMA,
    name: REGISTRY_NAME,
    title: "PortDock MCP",
    description: DESCRIPTION,
    version,
    websiteUrl: `${SITE}/en/guides/portdock-mcp/`,
    repository: { url: REPO, source: "github" },
    packages: [
      {
        registryType: "mcpb",
        identifier: downloadUrl(version, MCPB_FILE),
        version,
        fileSha256: sha,
        transport: { type: "stdio" },
      },
    ],
  };
}

const json = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest.filter((a) => a !== "--draft"));
  const version = needVersion(args.version || workspaceVersion());
  if (cmd === "manifest") {
    const out = path.resolve(args.out || ".");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "manifest.json"), json(manifestFor(version)), "utf8");
    console.log(`manifest.json (${version}) → ${out}`);
  } else if (cmd === "server-json" && rest.includes("--draft")) {
    fs.writeFileSync(DRAFT, json(serverJsonFor(version, ZERO)), "utf8");
    console.log(`초안 → ${DRAFT} (fileSha256 은 릴리스 뒤 --sums 로 채운다)`);
  } else if (cmd === "server-json") {
    const sums = await loadSums(version, args.sums);
    const sha = sums.get(MCPB_FILE);
    if (!sha) throw new Error(`SHA256SUMS 에 ${MCPB_FILE} 없음`);
    const text = json(serverJsonFor(version, sha));
    if (args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
    else process.stdout.write(text);
  } else {
    throw new Error("사용법: node tools/mcp.mjs manifest --out <폴더> | server-json --sums <파일> [--out <파일>] | server-json --draft");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
