// Dicionário em português do Brasil (pt) — copiado da versão de referência em japonês (ja) e traduzido a partir do inglês (site/I18N.md).
// ui = textos comuns, common = nomes de programas e ferramentas, pages = textos de cada página (mesmos nomes de SCOPE em scope.ts), lib = textos das bibliotecas de cálculo
import ui from "./ui.ts";
import common from "./common.ts";
import lib from "./lib.ts";
import home from "./pages/home.ts";
import tools from "./pages/tools.ts";
import download from "./pages/download.ts";
import safety from "./pages/safety.ts";
import privacy from "./pages/privacy.ts";
import analog from "./pages/analog.ts";
import modbus from "./pages/modbus.ts";
import modbusDecoder from "./pages/modbusDecoder.ts";
import modbusFloat from "./pages/modbusFloat.ts";
import mcDecoder from "./pages/mcDecoder.ts";
import rs485 from "./pages/rs485.ts";
import serialTiming from "./pages/serialTiming.ts";
import checksum from "./pages/checksum.ts";
import subnet from "./pages/subnet.ts";
import pinouts from "./pages/pinouts.ts";
import type { PageId } from "../scope.ts";

const pages = { home, tools, download, safety, privacy, analog, modbus, modbusDecoder, modbusFloat, mcDecoder, rs485, serialTiming, checksum, subnet, pinouts } satisfies Record<PageId, unknown>;

export default { ui, common, lib, pages };
