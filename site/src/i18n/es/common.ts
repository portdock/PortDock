// 스페인어 — 여러 쪽에서 쓰는 이름·한 줄 소개(프로그램·웹 도구·도구 묶음·«무엇을 하려나요?»·파일 크기).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** 프로그램 한 줄 소개(tools.ts 의 tagline) */
  apps: {
    serial: "Terminal serie (COM) con líneas de control y reconexión automática",
    "modbus-slave": "Simulador de esclavo Modbus (RTU y TCP) con tablas de registros e inyección de fallos",
    tcp: "Cliente, servidor y relé TCP con varias conexiones, eco y reconexión automática",
    udp: "Envío y recepción UDP con broadcast, multicast y eco",
    simulator: "Equipo simulado que responde según reglas, por serie, TCP y UDP",
    netscan: "Búsqueda de equipos en redes industriales: puertos industriales y ping de larga duración",
    "modbus-master": "Maestro Modbus RTU/TCP (sondeo): valores con tipo, escrituras y búsqueda de esclavos",
    scpi: "Terminal para instrumentos SCPI: socket LAN y RS-232, sin VISA",
    plot: "Gráficas en tiempo real de valores recibidos por serie, TCP y UDP",
    "port-inspector": "Inspección de solo lectura de puertos COM, adaptadores de red, ajustes del PC e inalámbricos",
    "plc-simulator": "Simulador de servidor de protocolo MC (SLMP) para probar sin un PLC",
    "hw-tester": "Registro de cortes y latencia de Wi-Fi e Internet, y de conexiones Bluetooth y USB (desde 0.10.0)",
    mcp: "Servidor MCP para clientes de IA: lee puertos, Modbus, MC y SCPI; solo escribe en simuladores de este PC",
  } satisfies Record<Tool["id"], string>,

  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/4-20ma/": { name: "Calculadora de escalado 4–20 mA", blurb: "Corriente o tensión ↔ unidades de ingeniería ↔ % ↔ cuentas del PLC (0–27648…). Tabla de 4/8/12/16/20 mA." },
    "tools/modbus/": { name: "Generador de peticiones Modbus RTU", blurb: "Dirección de esclavo, función, dirección y cantidad → bytes de la petición con CRC. Admite la notación 40001." },
    "tools/modbus-decoder/": { name: "Decodificador de tramas Modbus", blurb: "Pegue bytes RTU o TCP y vea la dirección de esclavo, la función, los valores, el CRC, el MBAP y las excepciones." },
    "tools/modbus-float/": { name: "Conversor de flotantes Modbus", blurb: "2 o 4 registros ↔ float32/float64/int32. Los órdenes ABCD, CDAB, BADC y DCBA en una sola tabla." },
    "tools/mc-decoder/": { name: "Decodificador de tramas del protocolo MC (SLMP)", blurb: "Tramas 3E/4E binarias o ASCII → cabecera, comando, dispositivo, valores y código de fin. Empareja respuesta y petición; crea peticiones." },
    "tools/rs485/": { name: "Calculadora de terminación y polarización RS-485", blurb: "Pull-up/pull-down con terminación de 120/150 Ω → tensión diferencial en reposo frente al umbral de 200 mV, potencia de las resistencias y longitud según la velocidad." },
    "tools/serial-timing/": { name: "Calculadora de tiempos serie", blurb: "Velocidad y paridad → tiempo de carácter, t3.5/t1.5 de Modbus RTU, tiempo de petición y respuesta, ciclo de sondeo y tiempo de espera mínimo." },
    "tools/checksum/": { name: "Calculadora de CRC y checksum", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 y SUM16 de una vez." },
    "tools/subnet/": { name: "Calculadora de subredes IP", blurb: "Dirección y máscara (/24) → red, broadcast y rango. Comprueba con ambas máscaras si el PC y el PLC están en la misma subred." },
    "tools/pinouts/": { name: "Referencia de pines de conectores", blurb: "RS-232 DB9/DB25, RJ45 T568A/B y Ethernet, Modbus RJ45/DB9 (especificación), M12 codificación A/D/X, M8, USB-A/B/C, nombres de bornes RS-485: vistas frontales macho/hembra, colores, fuentes y SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** 웹 도구 묶음(webToolGroups.ts) */
  groups: {
    comm: "Serie y Modbus",
    net: "Redes",
    draw: "Cableado y esquemas",
    diag: "Diagnóstico y revisiones",
    field: "Herramientas de campo",
    signal: "Señales y sensores",
    elec: "Electricidad y motores",
    mech: "Mecánica y neumática",
    units: "Conversión de unidades",
    hw: "Pruebas de hardware del PC",
    etc: "Otras herramientas",
  } satisfies Record<GroupId, string>,

  /** «무엇을 하려나요?»(components/PickApp.astro) — 갈래 id 로 찾는다 */
  pick: {
    title: "¿Qué necesita hacer?",
    q: {
      serial: "Comunicarse con un equipo serie (COM) o RS-485",
      modbus: "Leer y escribir equipos Modbus, o simular uno",
      net: "Encontrar equipos en la red; comunicación TCP y UDP",
      sim: "Probar un HMI o un software de supervisión sin el PLC ni el equipo",
      scpi: "Controlar un instrumento (SCPI) y registrar mediciones",
      pc: "Problemas de conexión del PC: puerto COM, adaptador de red, Wi-Fi, Bluetooth",
      mcp: "Leer equipos desde un cliente de IA (MCP)",
    },
    hwTitle: "Probar micrófono, teclado, ratón, cámara web o monitor",
    hwName: "Pruebas de hardware del PC",
    hwNote: (n: number) => `No es un programa de Windows: funciona en el navegador, sin instalar (${n} pruebas)`,
  },

  /** 파일 크기(release.ts 의 SIZE) */
  size: { setup: "unos 4 MB", offline: "unos 220 MB", portable: "unos 3 MB" },
};
