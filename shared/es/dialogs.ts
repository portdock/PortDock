// 스페인어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Es<K extends string> = Partial<Record<K, string>>;

export const ES_DEVICE: Es<DeviceTextKey> = {
  masterTitle: "Cargar perfil de equipo",
  slaveTitle: "Cargar emulación de equipo",
  search: "Buscar (fabricante, modelo, tipo)",
  none: "Ningún equipo coincide",
  close: "Cerrar",
  cancel: "Cancelar",
  apply: "Cargar",
  regs: "{n} registros",
  comm: "Comunicación por defecto",
  commOpt: "Aplicar también los ajustes serie (baudios, datos, paridad, parada)",
  commNone: "No hay ajustes de comunicación por defecto confirmados en el manual",
  gapOpt: "Leer en una tabla registros con pequeños huecos (hasta {n} — desactívelo si el equipo rechaza direcciones sin uso)",
  masterPlan: "Añade {n} tablas de sondeo (ID de esclavo {u}): {a}",
  masterSkip: "{n} registros de solo escritura no se sondean",
  slavePlan: "Rellena nombres, tipos y valores de ejemplo en el ID de esclavo actual {u}. Los rangos de respuesta se amplían si hace falta.",
  slaveUnit: "El ID de esclavo por defecto de este equipo es {u}",
  sources: "Fuentes",
  caution: "Datos tomados del manual del fabricante (sin relación con el fabricante). Pueden variar según firmware o modelo — compruebe el manual del equipo antes de escribir.",
  thAddr: "Dirección (manual)",
  thName: "Nombre",
  thType: "Tipo",
  thUnit: "Unidad",
  thRw: "R/W",
  notes: "Notas",
  behaveOpt: "Añadir también generadores de valores y reglas de enlace — variación de tensión/corriente, acumulación de energía, orden de marcha → rampa de frecuencia de salida",
  guardOpt: "Respetar solo lectura y solo escritura",
  slaveNote: "Estos valores vienen de las tablas del manual — el comportamiento real del equipo (tiempos de rampa, etc.) puede diferir.",
};

export const ES_PORTCHECK: Es<PortCheckTextKey> = {
  title: "Comprobar conexión",
  close: "Cerrar (Esc)",
  reading: "Leyendo…",
  readFail: "No se pudo leer",
  device: "Dispositivo y controlador",
  settings: "Ajustes",
  power: "Ahorro de energía",
  test: "Prueba de conexión",
  cannot: "Lo que el PC no ve",
  guides: "Guías:",
  name: "Nombre",
  chip: "VID:PID · chip",
  driver: "Controlador",
  problem: "Código de problema",
  action: "Qué probar",
  latency: "Temporizador de latencia FTDI",
  suspend: "Suspensión selectiva de USB",
  canOff: "El PC puede apagarlo",
  on: "activado",
  off: "desactivado",
  connected: "Desconecte primero para hacer la prueba (abre el puerto por su cuenta).",
  copy: "Copiar texto",
  copied: "Copiado",
  more: "Para el historial de controladores, las reservas de números COM y los dispositivos ocultos, use PortDock Port Inspector.",
  readOnly: "Solo lectura, sin derechos de administrador.",
};

export const ES_LOOP: Es<LoopTextKey> = {
  mode: "Prueba",
  loop: "Bucle — TX unido a RX",
  loopHint: "En un DB9 una el pin 2 (RX) con el pin 3 (TX); en un adaptador TTL una TX con RX. Comprueba en cada velocidad que los bytes vuelvan sin cambios y mide el ida y vuelta de 1 byte.",
  two: "Dos puertos — dos adaptadores conectados entre sí",
  twoHint: "Con dos adaptadores/cables conectados entre sí, envía en cada velocidad de este puerto → al otro y del otro → a este y compara lo que llega. Útil para comprobar adaptadores RS-485.",
  peer: "Otro puerto",
  peerNone: "No hay otro puerto",
  pattern: "Patrón",
  patRandom: "Bytes mezclados",
  patRamp: "0x00–0xFF en orden",
  patAlt: "0x55/0xAA alternos",
  length: "Longitud (bytes)",
  wiring: "Cómo cablear",
  overall: "Total",
  colDir: "Sentido",
  echo: "Eco RS-485 de 2 hilos",
  echoHint: "Sin equipos en el bus, comprueba si el adaptador recibe los bytes que envía.",
  bauds: "Velocidades",
  more: "Más",
  start: "Iniciar prueba",
  cancel: "Parar",
  sure: "¿Está el equipo desconectado de la línea/bus? Los bytes de prueba podrían llegar a un equipo como órdenes.",
  sureYes: "Desconectado — iniciar",
  sureNo: "Cancelar",
  running: "Probando",
  noPort: "Elija primero un puerto.",
  colBaud: "Velocidad",
  colResult: "Resultado",
  colBytes: "Enviados · iguales · perdidos · cambiados",
  colRtt: "Ida y vuelta 1 byte ms (mediana · máx.)",
  colFlags: "Indicadores de error",
  flagsNone: "ninguno",
  flagsUnread: "no leído",
  flagFrame: "trama",
  flagParity: "paridad",
  flagOverrun: "desbordamiento",
  flagRxOver: "desbordamiento de búfer",
  flagsNote: "Los indicadores de error solo aparecen cuando el controlador los activa — «ninguno» no garantiza que no hubiera errores. El ida y vuelta incluye la latencia USB, el controlador y el programa.",
  echoBack: "Bytes de vuelta",
  firstMs: "Primer byte tras",
};

/** Cómo cablear (dibujo en texto) */
export const ES_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, macho o hembra)", "  pin 2 (RX) ──┐", "  pin 3 (TX) ──┘   una el pin 2 con el pin 3", "", "Adaptador TTL", "  TX ──┐", "  RX ──┘   una TX con RX", "", "RS-485 no admite bucle en un puerto — elija «Dos puertos»."].join("\n"),
  two: ["RS-232 (cruzado, null modem)", "  puerto A      puerto B", "  pin 2 RX ──── pin 3 TX", "  pin 3 TX ──── pin 2 RX", "  pin 5 GND ─── pin 5 GND", "", "RS-485 (2 hilos)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Un adaptador RS-485 — con el equipo fuera del bus", "  A(D+)  B(D−)  nada conectado"].join("\n"),
};

export const ES_IFACE: Es<IfaceTextKey> = {
  title: "Este PC",
  all: "todos los adaptadores",
  local: "solo este PC",
  down: "sin conexión",
  none: "No se pudieron leer las direcciones de los adaptadores",
  refresh: "Recargar",
  use: "Usar esta dirección",
  gw: "puerta de enlace",
  notHere: "«{a}» no es una dirección de este PC — al iniciar fallará con «dirección no disponible». Elija una de la lista de abajo.",
  downHere: "El adaptador de «{a}» ({b}) no está conectado (revise el cable / Wi-Fi).",
};

export const ES_OPEN_APP: Es<OpenAppTextKey> = {
  opened: "Se abrió {a} — {b}. Pulse conectar en esa ventana.",
  missing: "No se encontró {a} en este PC, así que se copió «{b}» — péguelo allí.",
  get: "Página de descarga",
};

/** Confirmar cierre (exitGuard.ts) */
export const ES_EXIT = "Hay una conexión o un registro en archivo activo. Al cerrar se desconectará y se detendrá el registro. ¿Cerrar de todos modos?";

/** Comandos de ejemplo (examples.ts) — inicio del nombre y nombre inglés → nombre español */
export const ES_EXAMPLE_PREFIX = "p. ej. ";
export const ES_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (comprobar respuesta)",
  "ATI (device info)": "ATI (info del dispositivo)",
  "AT+GMR (firmware version)": "AT+GMR (versión de firmware)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus ID de esclavo 1 leer 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus ID de esclavo 1 leer 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (identificación del instrumento SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP ID de esclavo 1 leer 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP ID de esclavo 1 leer 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "Petición HTTP de la página principal (puerto 80)",
  "text hello": "texto hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (identificación del instrumento)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (tensión continua)",
  "SYST:ERR? (one error)": "SYST:ERR? (un error)",
};
