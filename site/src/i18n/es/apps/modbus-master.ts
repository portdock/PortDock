// PortDock Modbus Master — 소개 쪽 글. 내장 장비 수가 들어가는 글은 함수.
export default {
  seo: {
    title: "PortDock Modbus Master: herramienta Modbus RTU/TCP gratis",
    desc: "Maestro Modbus RTU/TCP gratis (sondeo) para Windows: varias tablas, F32/U32, orden de bytes, notación 40001, escrituras, escaneo de ID y registros CSV.",
  },
  summary: "Pida datos a equipos Modbus en lugar de un PLC o un HMI. Sondee varias tablas por ID de esclavo, función, dirección e intervalo, vea F32/U32/cadenas con orden de bytes y notación 40001, y haga doble clic en una celda para escribir. Incluye HEX decodificado de petición/respuesta, estadísticas y registro de valores en CSV.",
  who: [
    "Técnicos de campo que revisan el mapa Modbus de un variador o un medidor nuevo",
    "Desarrolladores que prueban el firmware de equipos esclavos",
  ],
  features: [
    {
      title: "Varias tablas de sondeo",
      body: "Cada tabla tiene su propio ID de esclavo, función (01–04), inicio, cantidad e intervalo, con un contador de errores en su pestaña. RTU serie, Modbus TCP y RTU sobre TCP.",
    },
    {
      title: "Valores con tipo y orden de bytes",
      body: "De U16 a F64 y cadenas en ABCD/CDAB/BADC/DCBA, HEX/BIN y notación 40001. Comparte con Modbus Slave el formato CSV del mapa de registros.",
    },
    {
      title: "Escrituras con vista previa",
      body: "Haga doble clic para escribir con 05/06/0F/10 y vea de antemano los bytes exactos. La opción «siempre FC15/16» envía incluso los valores sueltos con 0F/10.",
    },
    {
      title: "Perfiles de equipo",
      body: (c: { nDevices: number }) => `Elija uno de los ${c.nDevices} equipos incluidos (variadores, controladores de temperatura, medidores de potencia …) para añadir tablas de sondeo con nombres (unidad y escala), tipos, ID de esclavo y ajustes serie predeterminados.`,
    },
    {
      title: "Escaneo de ID de esclavo y de direcciones",
      body: "Descubra qué ID de esclavo (1–247) responden y qué rangos de direcciones se pueden leer, y conviértalos en tablas.",
    },
    {
      title: "Buscar los ajustes de línea (desde 0.10.0)",
      body: "Cuando no se conocen los baudios, la paridad y el ID de un equipo, envía una lectura corta por cada baudio elegido (1200–115200) × paridad/bits de parada × rango de ID y lista las combinaciones que responden. Una respuesta de excepción también significa «hay un equipo». Con estimación de tiempo, botón de parada y «Conectar con este ajuste»; nunca se usa el ID 0 (broadcast). No sirve para buses con otro maestro.",
    },
    {
      title: "«Sin respuesta»: causas posibles (desde 0.10.0)",
      body: "Ordena los resultados recientes de las peticiones en causas posibles y cómo comprobarlas: ningún byte (cableado, ID, polaridad A/B), solo la petición devuelta como eco (eco del adaptador de 2 hilos), errores de CRC (baudios, paridad, ruido, terminación), tramas truncadas (timeout, latencia USB), el significado de cada código de excepción, otro ID que responde. Enlaces a guías y al asistente de diagnóstico; copiable como texto.",
    },
    {
      title: "Copia de seguridad, comparación y restauración de ajustes del equipo (desde 0.10.0)",
      body: "Para sustituir y mantener equipos. Lee varios rangos a la vez (o los rellena desde un perfil de equipo) en JSON y CSV (los rangos de más de 125 se dividen y se listan los que fallan), y compara con el equipo en ese momento o con otra copia, mostrando solo las diferencias. La restauración escribe solo las celdas que usted elija: vista previa (ahora frente a lo que se escribirá), un segundo clic para escribir y después una lectura de comprobación. Los registros de entrada y los registros de solo lectura del perfil quedan bloqueados.",
    },
    {
      title: "Timeouts, reintentos, estadísticas",
      body: "Fije el timeout, los reintentos y la espera; cuente peticiones, correctas, timeouts, errores de CRC y excepciones, con tiempos de respuesta por tabla. Las excepciones se explican.",
    },
    {
      title: "Registro de valores y tendencias",
      body: "Registre valores en CSV en cada sondeo o al cambiar, y vea las celdas elegidas como pequeñas líneas de tendencia.",
    },
    {
      title: "Vigilancia de valores y alarmas (desde 0.10.0)",
      body: "Por celda: límites inferior/superior, sin cambios (bloqueado) durante N segundos y comunicación perdida durante N segundos, con un margen de retorno (histéresis). Una celda disparada se resalta, con una lista de alarmas (activada, restablecida, duración, reconocimiento), sonido opcional, parpadeo de la barra de tareas y un registro CSV de alarmas. Una ayuda de supervisión, no un dispositivo de seguridad.",
    },
  ],
  steps: [
    "Haga coincidir la conexión y el puerto (o la IP) con el equipo",
    "«Conectar» (F4) y fije ID de esclavo, función, inicio y cantidad según el manual",
    "Doble clic en una celda para escribir; clic derecho para nombre y tipo",
  ],
  similar: "Herramientas parecidas son el Modbus Poll comercial (Witte Software) y el QModMaster de código abierto. PortDock Modbus Master es gratis (GPL-3.0) y sin límite de tiempo.",
};
