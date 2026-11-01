// 스페인어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 es 와 같게(ID de esclavo·registro de retención·entrada discreta·bobina).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Es<K extends string> = Partial<Record<K, string>>;

export const ES_MB_BUILDER: Es<MbBuilderTextKey> = {
  title: "Crear petición Modbus",
  titleTcp: "Crear petición Modbus TCP",
  slave: "ID de esclavo",
  slaveHint: "1–247 (escritura: 0 = difusión, sin respuesta)",
  unitHint: "0–255 — va en el campo Unit ID del MBAP. Normalmente 1; el ID de esclavo RTU detrás de una pasarela; cualquiera si el equipo lo ignora",
  tid: "ID de transacción",
  tidHint: "0–65535 — la respuesta lo repite. Con «ID de transacción automático» activado en la barra de envío cambia en cada envío",
  func: "Función",
  addr: "Dirección inicial",
  zero: "Base 0",
  plc: "Notación {a}",
  qty: "Cantidad",
  qtyHint: "1–{a}",
  values: "Valores",
  valuesHint: "Separados por coma/espacio. Decimal o hex 0x; se admiten negativos",
  coilsHint: "1 (ON) / 0 (OFF), separados por coma/espacio — el primer valor es la dirección inicial",
  coil: "Valor",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} valores",
  preview: "Petición (antes del CRC)",
  previewTcp: "Petición (cabecera MBAP + PDU)",
  crcNote: "+ 2 bytes de CRC16 Modbus los añade la barra de envío",
  tcpNote: "Modbus TCP no tiene CRC — se envía tal cual, sin checksum",
  put: "Poner en entrada",
  send: "Enviar",
  sendTip: "Envía esta petición ahora (HEX, con CRC16 Modbus, sin fin de línea). Enter en este diálogo hace lo mismo",
  toPlc: "Cambiar a notación {a}",
  putTip: "Pone la barra de envío en HEX, checksum CRC16 Modbus, sin fin de línea, y rellena estos bytes",
  putTipTcp: "Pone la barra de envío en HEX, sin checksum, sin fin de línea, y rellena estos bytes",
  add: "Guardar en lista",
  added: "Se añadió «{a}» a la lista de comandos",
  close: "Cerrar",
  bcast: "El ID de esclavo 0 escribe en todos los equipos; ninguno responde.",
  help: "¿Primera vez?",
  helpLink: "Ver guía",
  helpTip: "Abre la guía de Modbus en la Ayuda (este diálogo se cierra)",
};

export const ES_MB_VALUES: Es<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Emparejado con la petición",
  from: "ID de esclavo {u} · {f} · {a} ({n})",
  tid: "transacción {t}",
  fmt: "Formato de valor",
  notation: "Direcciones",
  zero: "Base 0",
  plc: "Notación {a}",
  write: "OK — el equipo aceptó la escritura",
  exc: "Excepción {a}",
};

export const ES_MBAP: Es<MbapTextKey> = {
  tid: "ID de transacción",
  len: "Campo de longitud",
  lenBad: "el campo de longitud no coincide",
  unit: "Unit ID (ID de esclavo)",
  values: "Valores",
  head: "Modbus TCP",
};

export const ES_MB_BUILD: Partial<MbBuildText> = {
  slave: "El ID de esclavo es 1–247 (0 = difusión en funciones de escritura — sin respuesta).",
  slaveRead: "Las funciones de lectura no pueden usar el ID de esclavo 0 (difusión) — no llegaría respuesta. Use 1–247.",
  func: "Función no admitida.",
  addrEmpty: "Escriba una dirección.",
  addrNum: "La dirección debe ser un número (decimal; hex 0x se admite en base 0).",
  addrZero: "La dirección en base 0 es 0–65535.",
  addrPlcLen: "La notación PLC tiene 5 dígitos (p. ej. 40001) o 6 dígitos (p. ej. 400001).",
  addrPlcOff: "La notación PLC cuenta desde 1 (5 dígitos 0001–9999, 6 dígitos 00001–65536).",
  addrPrefix: "«{a}» está en notación {b}. Esta función usa {c}.",
  addrBadPrefix: "El dígito inicial {a} no es notación Modbus (0 bobina, 1 entrada discreta, 3 registro de entrada, 4 registro de retención).",
  addrPlcNote: "{a} → base 0 {b} (0x{c})",
  addrLooksPlc: "«{a}» parece notación {p}xxxx. Tal como está escrita es la dirección en base 0 {a} (0x{c}) — en notación {p}xxxx es la dirección {b}.",
  qty: "La cantidad es 1–{a} (límite del protocolo).",
  overflow: "La dirección final supera 65535 (inicio {a} + cantidad {b}).",
  valEmpty: "Escriba el valor o los valores a escribir.",
  valBad: "«{a}» no es un valor — use decimal o hex 0x.",
  valReg: "El valor de registro «{a}» debe estar en -32768–65535 (los negativos se envían en complemento a dos).",
  valCoil: "El valor de bobina «{a}» debe ser 1 (ON) o 0 (OFF).",
  valOne: "Esta función escribe un solo valor.",
  valCount: "{n} valores — esta función admite 1–{a}.",
  plcNames: { "0": "0xxxx (bobina)", "1": "1xxxx (entrada discreta, FC02)", "3": "3xxxx (registro de entrada, FC04)", "4": "4xxxx (registro de retención, FC03/06/10)" },
};
