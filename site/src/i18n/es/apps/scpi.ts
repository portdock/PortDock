// PortDock SCPI — 소개 쪽 글. *IDN? 등 명령 이름은 그대로.
export default {
  seo: {
    title: "PortDock SCPI: terminal SCPI gratis (socket LAN, RS-232, sin VISA)",
    desc: "Terminal gratis de instrumentos SCPI por socket LAN (5025) o RS-232 sin VISA: *IDN?, cola de errores, esperas con *OPC? y medidas repetidas a CSV.",
  },
  summary: "Envíe comandos a instrumentos SCPI como fuentes de alimentación, multímetros y osciloscopios y lea las respuestas. Se conecta por socket LAN (TCP 5025) o RS-232 sin instalar VISA, identifica el instrumento con *IDN?, vacía la cola de errores y registra en CSV lecturas numéricas repetidas.",
  who: [
    "Desarrolladores que comprueban comandos a mano antes de escribir la automatización de pruebas",
    "Técnicos de campo que necesitan ver rápido un instrumento desde un PC sin VISA",
  ],
  features: [
    {
      title: "Sin VISA",
      body: "Socket LAN (normalmente 5025) y RS-232 (baudios, paridad, control de flujo) con fin de línea LF, CR LF o CR. Por ahora no admite VXI-11, HiSLIP ni USBTMC.",
    },
    {
      title: "Consulta, escritura, lectura",
      body: "Los comandos que terminan en ? se consultan y los demás se escriben. Se muestran los tiempos de respuesta, los timeouts y las respuestas sin fin de línea. Historial de comandos, lista de comandos y autocompletado de los comandos habituales.",
    },
    {
      title: "ID, cola de errores, *OPC?",
      body: "*IDN? separado en fabricante, modelo, número de serie y firmware; SYST:ERR? se repite hasta 0 para listar todos los errores en cola. Botones para *RST, *CLS y para esperar con *OPC?.",
    },
    {
      title: "Medida repetida",
      body: "Repita una consulta como MEAS:VOLT:DC? a intervalos y un número de veces, con tabla de valores, tendencia y estadísticas (mín., máx., media, desv. típica), guardado como CSV.",
    },
    {
      title: "Datos en bloque",
      body: "Los bloques IEEE 488.2 (#NXXXX…) se leen por su cabecera de longitud, así que los bytes LF dentro de datos binarios no los cortan. Vista previa HEX y guardado en archivo (p. ej. capturas de pantalla PNG).",
    },
  ],
  steps: [
    "LAN: IP del instrumento y puerto 5025; serie: puerto y baudios como en el instrumento",
    "«Conectar» (F4): *IDN? muestra el nombre del instrumento",
    "Escriba un comando y pulse Intro; compruebe los errores con «Vaciar cola de errores»",
  ],
  uses: [
    {
      title: "Comprobar comandos antes de escribir la automatización",
      body: "Escriba los comandos a mano y vea la respuesta y el tiempo de respuesta. Los comandos que terminan en ? son consultas y los demás son escrituras. Compruebe al instante los errores con «Vaciar cola de errores».",
    },
    {
      title: "Llegar a un instrumento desde un PC sin VISA",
      body: "Conéctese directamente por socket LAN (normalmente el puerto 5025) o RS-232. *IDN? se separa en fabricante, modelo, número de serie y firmware.",
    },
    {
      title: "Registrar lecturas repetidas en CSV",
      body: "En «Medida repetida», lance una consulta como MEAS:VOLT:DC? a intervalos y un número de veces, vea la tabla, la tendencia y las estadísticas (mín., máx., media, desv. típica) y guárdelo como CSV.",
    },
    {
      title: "Obtener datos en bloque, como capturas de pantalla",
      body: "Los bloques IEEE 488.2 (#N…) se leen por su cabecera de longitud, así que los bytes LF dentro de datos binarios no los cortan. Vista previa en HEX y guardado en archivo (PNG y similares).",
    },
  ],
  faq: [
    {
      q: "Me sale «connection refused»",
      a: "El puerto es distinto (revise el «puerto de socket» del manual: no todos los instrumentos usan el 5025) o la interfaz de socket está desactivada. Algunos instrumentos rechazan una conexión nueva mientras otro programa (una sesión VISA) está conectado.",
    },
    {
      q: "Me sale «no response (timeout)»",
      a: "Se envió como consulta algo que no lo es, el comando está mal escrito (revise la cola de errores) o el instrumento está ocupado midiendo. Aumente la espera de respuesta o use *OPC?. «Reply not finished» significa que el fin de línea (LF, CR LF, CR) difiere del del instrumento.",
    },
    {
      q: "¿Qué es -410 Query INTERRUPTED?",
      a: "Se envió el siguiente comando antes de leer la respuesta. Si envió una consulta con «Escribir», recoja primero la respuesta con «Leer».",
    },
    {
      q: "¿Admite USBTMC, GPIB, VXI-11 o HiSLIP?",
      a: "Ahora no. VXI-11 no se admite por el momento; HiSLIP, USBTMC y GPIB necesitan VISA o controladores y quedan fuera. La mayoría de los instrumentos LAN también ofrecen un socket (5025), y los instrumentos solo USB con un ajuste de «COM virtual USB» funcionan por serie.",
    },
    {
      q: "¿Puedo probarlo sin instrumento?",
      a: "Ejecute PortDock Simulator como servidor TCP en el 5025 con entramado LF y el ejemplo [SCPI *IDN? reply], y conéctese a 127.0.0.1:5025.",
    },
  ],
  similar: "Las herramientas de fabricante basadas en VISA (NI MAX, Keysight Connection Expert …) también pueden enviar comandos. PortDock SCPI se conecta por socket LAN o RS-232 en PC sin VISA.",
};
