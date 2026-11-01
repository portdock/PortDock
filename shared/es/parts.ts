// 스페인어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Es<K extends string> = Partial<Record<K, string>>;

export const ES_SETTINGS: Es<SettingsTextKey> = {
  title: "Ajustes",
  lang: "Idioma",
  theme: "Tema",
  system: "Seguir a Windows",
  light: "Claro",
  dark: "Oscuro",
  fontSize: "Tamaño de letra (px)",
  timeFormat: "Hora del registro",
  local: "hh:mm:ss.ms",
  localDate: "Fecha + hora",
  utc: "UTC",
  elapsed: "Tiempo desde el inicio (Borrar lo reinicia)",
  maxLines: "Líneas en pantalla",
  maxLinesHint: "Las líneas antiguas solo se quitan de la pantalla (los registros en archivo lo guardan todo).",
  autoScroll: "Autodesplazar con líneas nuevas (se pausa al subir)",
  alwaysOnTop: "Siempre visible — mantener esta ventana sobre las demás (📌 en la cabecera)",
  expandAll: "Expandir todo (vista experta) — mostrar siempre abiertos los grupos plegados (conexión avanzada, recepción, inyección de fallos, estadísticas …)",
  autoLog: "Guardar en archivo al conectar",
  logFolder: "Carpeta del registro automático",
  choose: "Elegir",
  noFolder: "Elija una carpeta",
  confirmExit: "Preguntar antes de cerrar si está conectado o guardando",
  lostAlert: "Hacer parpadear la barra de tareas si se corta la conexión (con la ventana en segundo plano)",
  keepAwake: "Mantener el PC despierto mientras está conectado o guardando (la pantalla sí puede apagarse)",
  autoConnect: "Reabrir la última conexión al iniciar",
  autoReport: "Informes de error automáticos",
  arAsk: "Preguntar tras un cierre inesperado",
  arOn: "Enviar automáticamente",
  arOff: "No enviar nunca",
  autoReportHint: "Solo envía la causa de los errores del programa (excepciones, cierres inesperados) y la versión del programa/Windows. Nunca se envían el tráfico, los comandos, las reglas ni los ajustes de IP. Sin internet, se reintenta la próxima vez.",
  backup: "Copia de seguridad",
  exportAll: "Exportar ajustes",
  importAll: "Importar ajustes",
  reset: "Restablecer valores",
  resetAsk: "¿Restablecer los ajustes de pantalla? (se conservan los comandos y las reglas)",
  importAsk: "Importar sustituye todos los ajustes, comandos y reglas actuales. ¿Continuar?",
  importBusy: "Detenga la conexión y el guardado antes de importar.",
  noFolderWarn: "El registro automático no empezará hasta que elija una carpeta.",
  close: "Cerrar",
  about: "Acerca de",
  gpl: "Este programa es software libre, distribuido bajo la GNU GPL v3. Se ofrece SIN NINGUNA GARANTÍA.",
  license: "Texto de la licencia",
  source: "Código fuente",
  site: "Sitio web",
  notices: "Avisos de terceros",
  sponsor: "Apoyar",
  checkUpdate: "Buscar actualizaciones",
  checkUpdateHint: "Abre en el navegador la página de la última versión.",
  updateCheck: "Buscar versiones nuevas (una vez al día)",
  updateCheckHint: "Si está activo, pregunta a GitHub (api.github.com) una vez al día solo por la última versión y muestra un aviso abajo en la ventana si hay una más nueva. No se envían datos; no se descarga ni instala nada.",
};

export const ES_HELP_UI: Es<HelpUiKey> = {
  title: "Ayuda",
  search: "Buscar…",
  close: "Cerrar",
  none: "Sin coincidencias",
  enOnly: "La ayuda solo está en inglés (la interfaz está en español).",
};

export const ES_REPORT: Es<ReportTextKey> = {
  button: "Informar de un problema — enviar errores y fallos al desarrollador",
  title: "Informar de un problema",
  intro: "El informe se crea en este PC y se muestra abajo. No se envía nada automáticamente. Revíselo y elija cómo enviarlo.",
  what: "¿Qué pasó? (qué hacía, qué pulsó, resultado esperado frente al real)",
  whatPh: "p. ej. La ventana se congeló cuando un tercer par se conectó al servidor TCP.",
  env: "Versión del programa y de Windows (siempre incluida)",
  errors: "{n} error(es) en esta sesión",
  crashes: "{n} registro(s) de cierre inesperado",
  dumps: "Archivo de volcado incluido ({n} KB)",
  dumpsSend: " — se sube con «Enviar ahora»",
  dumpManual: "Adjunte usted mismo el archivo de volcado al enviar por correo o GitHub (se conserva hasta enviarlo o descartarlo): {a}",
  config: "Ajustes de conexión y pantalla (IP, puerto, baudios … — no incluye comandos ni reglas)",
  log: "Últimas {n} líneas de tráfico",
  logWarn: "El tráfico puede contener datos de la empresa o del equipo. Inclúyalo solo si está permitido.",
  preview: "Vista previa del informe",
  copy: "Copiar",
  copied: "Copiado",
  saveFile: "Guardar en archivo",
  saved: "Guardado: {a}",
  email: "Enviar por correo",
  emailHint: "Se abre su programa de correo. Los informes largos se cortan, así que adjunte el archivo de «Guardar en archivo».",
  issue: "Abrir un issue en GitHub",
  issueHint: "Se publica en GitHub de forma pública (requiere cuenta). Asegúrese de que no contenga datos de la empresa.",
  offline: "En un PC sin internet, use «Guardar en archivo», páselo por USB y envíelo desde otro PC.",
  close: "Cerrar",
  crashTitle: "El programa se cerró de forma inesperada la última vez",
  crashBody: "{a} se cerró de forma inesperada la última vez y dejó un registro. Enviarlo al desarrollador ayuda mucho.",
  crashOpen: "Ver informe",
  crashLater: "Más tarde",
  crashDiscard: "Descartar sin enviar",
  noTarget: "Aún no hay destino configurado. Use «Guardar en archivo».",
  sendNow: "Enviar ahora",
  sendNowHint: "Envía directamente al desarrollador la vista previa de arriba (requiere internet, no requiere cuenta).",
  sending: "Enviando…",
  sentOk: "Enviado. ¡Gracias!",
  sendFail: "No se pudo enviar (revise la conexión a internet). Use «Guardar en archivo» y envíelo más tarde.",
  crashSend: "Enviar ahora",
  crashAlways: "En adelante, enviar automáticamente sin preguntar",
};

export const ES_AI_UI: Es<AiUiKey> = {
  button: "Preguntar a la IA — solo copia, no se envía nada: la situación actual como texto para un chat de IA, en el portapapeles",
  title: "Copiar para preguntar a la IA",
  introLog: "Crea un texto para un chat de IA (con plantilla de pregunta): programa, ajustes de conexión, errores de esta sesión y tráfico reciente.",
  introChecks: "Crea un texto para un chat de IA (con plantilla de pregunta): programa, errores de esta sesión y resultados de las comprobaciones.",
  local: "PortDock no envía nada a ningún sitio — solo va al portapapeles.",
  warn: "Lo que pegue va a ese servicio de IA. Revise los datos del equipo y de la empresa antes de pegar.",
  hideIp: "Ocultar también las IP privadas (las públicas siempre se ocultan)",
  incLog: "Incluir tráfico reciente",
  incChecks: "Incluir resultados",
  incFound: "Incluir equipos encontrados",
  introFound: "Crea un texto para un chat de IA (con plantilla de pregunta): programa, errores de esta sesión y los equipos encontrados.",
  preview: "Texto a pegar (vista previa)",
  size: "{n} / {max} caracteres",
  cut: " · quitadas {n} líneas antiguas",
  cutText: " · texto largo cortado",
  copy: "Copiar",
  copied: "Copiado — péguelo en el chat de IA (Ctrl+V) y complete «Situación».",
  copyFail: "No se pudo copiar — puede que otro programa tenga el portapapeles",
  close: "Cerrar",
};

export const ES_FIRST: Es<FirstTextKey> = {
  hide: "No volver a mostrar",
  help: "Ayuda:",
  narrow: "La ventana es estrecha, así que el panel izquierdo está plegado — «izquierda» abajo se refiere al panel que abre el botón «⚙ {b}» arriba a la izquierda.",
  open: "Abrir el panel izquierdo",
};

export const ES_UPDATE: Es<UpdateTextKey> = {
  msg: "Hay disponible la versión {a} (tiene la {b}).",
  open: "Página de la versión",
  later: "No avisar de esta versión",
  close: "Cerrar (se muestra de nuevo al iniciar)",
};

export const ES_FILTER: Es<FilterTextKey> = {
  find: "Buscar (Ctrl+F) — 01 03 o texto",
  auto: "Auto",
  hex: "HEX",
  text: "Texto",
  prev: "Anterior (Mayús+Enter)",
  next: "Siguiente (Enter)",
  hitsOnly: "Solo coincidencias",
  failOnly: "Solo FALLO",
  all: "Todo",
  off: "Quitar filtro (Esc)",
  badHex: "no es HEX",
  none: "ninguna",
  shown: "{a}/{b} líneas",
};

export const ES_BOUNDARY: Es<BoundaryTextKey> = {
  title: "La pantalla falló",
  body: "Enviar esto al desarrollador ayuda a corregirlo. Volver a abrir el programa suele recuperarlo.",
  report: "Informar de un problema",
  reload: "Recargar",
  resetTip: "Si al recargar vuelve a fallar — borra los ajustes de pantalla guardados (incluidas las listas de comandos y las reglas)",
  resetArm: "Restablecer de verdad — pulse otra vez",
  reset: "Restablecer ajustes",
};

export const ES_USAGE: Partial<UsageText> = {
  title: "¿Enviar estadísticas de uso?",
  why: "Saber qué funciones se usan ayuda a decidir qué mejorar después. Si lo activa, los elementos de abajo se envían de forma anónima, una vez, al cerrar la ventana.",
  sendsTitle: "Se envía",
  sends: ["Nombre y versión del programa, versión de Windows (10/11), idioma de la interfaz", "Minutos que el programa estuvo abierto", "Cuántas veces se usó cada función (conectar, enviar, leer … — solo cantidades)", "Edición instalada o portátil"],
  neverTitle: "Nunca se envía",
  never: ["Contenido del tráfico", "Direcciones IP, puertos, nombres COM", "Rutas de archivos", "Nombres de PC, usuario y equipos", "Ningún ID que identifique la instalación o el PC"],
  where: "Receptor: Aptabase (UE). Sin conexión o si falla el envío, los datos se descartan. Su respuesta también será el valor inicial de las demás apps de PortDock en este PC (no volverán a preguntar), y cada app puede cambiarlo en cualquier momento en Ajustes (⚙).",
  yes: "Enviar",
  no: "No enviar",
  setting: "Enviar estadísticas de uso (anónimas, al cerrar)",
  hint: "Solo envía las veces que se usa cada función, los minutos abierto, la versión del programa/Windows, el idioma de la interfaz y si es edición instalada/portátil. Nunca se envían el tráfico, las direcciones IP, los puertos, los nombres COM, las rutas de archivos ni los nombres de PC/usuario/equipos. Receptor: Aptabase (UE).",
};
