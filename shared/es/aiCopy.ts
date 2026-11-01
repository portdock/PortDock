// 스페인어 — «AI 복사» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const ES_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Abajo hay un registro de ${app}. Indique las causas probables del problema y el orden en que revisarlas.`,
  ask2: "Diga si conviene mirar primero los ajustes del equipo, el cableado o el PC, y señale las líneas del registro que lo respaldan. Si no está claro, dígame qué más debo comprobar.",
  situation: "## Situación (complétela después de pegar)",
  situationLines: ["- Qué intentaba hacer:", "- Resultado esperado / real:", "- Equipo (fabricante, modelo) y conexión:"],
  kinds: {
    pc: {
      ask: (app: string) => `Abajo están los resultados de la comprobación del PC de ${app}. Indique las causas probables del problema y el orden en que revisarlas.`,
      ask2: "Diga si conviene mirar primero los ajustes del PC, los controladores, el entorno inalámbrico (Wi-Fi, Bluetooth) o el router, y señale las líneas que lo respaldan. Si no está claro, dígame qué más debo comprobar.",
      situationLines: ["- Qué intentaba hacer:", "- Resultado esperado / real:", "- PC e instalación inalámbrica (portátil/sobremesa, cable/inalámbrico, modelo de router o equipo):"],
    },
    scan: {
      ask: (app: string) => `Abajo está la lista de equipos de red encontrados por ${app}. Ayúdeme a encontrar el equipo que busco, o por qué no aparece.`,
      ask2: "Diga si conviene mirar primero el rango de direcciones (subred), los ajustes IP del equipo, el adaptador de red o el switch, y señale las líneas que lo respaldan. Si no está claro, dígame qué más debo comprobar.",
      situationLines: ["- Equipo que buscaba (fabricante, modelo, IP conocida):", "- Resultado esperado / real:", "- Cómo están conectados el PC y el equipo (directo, switch, red de planta):"],
    },
    port: {
      ask: (app: string) => `Abajo están los resultados de la comprobación de puertos de ${app}. Indique las causas probables del problema y el orden en que revisarlas.`,
      ask2: "Diga si conviene mirar primero el número de puerto, el controlador, el adaptador USB o los ajustes de ahorro de energía, y señale las líneas que lo respaldan. Si no está claro, dígame qué más debo comprobar.",
      situationLines: ["- Qué intentaba hacer:", "- Resultado esperado / real:", "- Adaptador o equipo (fabricante, modelo) y puerto USB usado:"],
    },
  },
  found: "## Equipos encontrados",
  program: "## Programa",
  state: "Estado actual",
  settings: "## Ajustes de conexión",
  errors: (n: number) => `## Errores en esta sesión (${n})`,
  checks: "## Resultados de la comprobación",
  log: (n: number) => `## Tráfico reciente (${n} líneas)`,
  logFormat: "Formato: hora sentido [par] HEX | texto | nota añadida por el programa",
  logEmpty: "(sin tráfico)",
  cutLines: (n: number, max: number) => `(se quitaron ${n} líneas antiguas para caber en ${max.toLocaleString("en-US")} caracteres)`,
  cutText: "…(cortado — demasiado largo)",
  masked: (ip: HideIp) => `_Ocultado por PortDock: carpeta de usuario, nombre del PC (DESKTOP-…, etc.), últimos 3 bytes de las direcciones MAC, ${ip === "all" ? "todas las direcciones IP" : "direcciones IP públicas"} («[IP-n]»)._`,
};
