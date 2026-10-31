// Deutsch — Texte der Rechenbibliotheken (lib/*.ts) nach Gruppen. Eine Seite lädt nur die Gruppen aus libText in Base.astro (lib/tr.ts)
import checksum from "./lib/checksum.ts";
import modbusNames from "./lib/modbusNames.ts";
import modbusBuild from "./lib/modbusBuild.ts";
import modbusDecode from "./lib/modbusDecode.ts";
import modbusFloat from "./lib/modbusFloat.ts";
import analog from "./lib/analog.ts";
import subnet from "./lib/subnet.ts";
import mc from "./lib/mc.ts";
import pinouts from "./lib/pinouts.ts";

export default { checksum, modbusNames, modbusBuild, modbusDecode, modbusFloat, analog, subnet, mc, pinouts };
