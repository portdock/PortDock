// PortDock Plot — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Plot: graficador serie gratis en vivo y CSV",
    desc: "Graficador gratis en vivo de números por serie, TCP o UDP: nombre:valor al estilo Arduino, tramas binarias, hasta 32 canales, cursores y grabación en CSV.",
  },
  summary: "Vea como gráfica en vivo los números que envía un Arduino, un sensor o un equipo. Lee texto separado por comas, espacios, tabuladores o punto y coma, «nombre:valor» al estilo Arduino y tramas binarias, con color y eje por canal, pausa, zoom y diferencias entre dos puntos, y graba CSV mientras recibe.",
  who: [
    "Desarrolladores que ajustan firmware mientras miran los valores de un sensor o una placa",
    "Técnicos de campo que registran durante horas la salida de un equipo para encontrar anomalías",
  ],
  features: [
    {
      title: "Serie, TCP, UDP",
      body: "Puertos COM (baudios, bits de datos, paridad, bits de parada —8N1 por defecto— y DTR), un cliente TCP que se conecta al equipo y recepción UDP (también multicast). Se reconecta tras desenchufar y enchufar.",
    },
    {
      title: "Texto, nombre:valor, binario",
      body: "Coma, espacio, tabulador o punto y coma detectados automáticamente, valores con nombre como temp:23.1 hum:40, líneas de cabecera y tramas con bytes de inicio, u8–f64, endianness y checksum. Las líneas que fallan se muestran en rojo con el motivo.",
    },
    {
      title: "Ver y medir",
      body: "Hasta 32 canales en ejes izquierdo/derecho, últimos N puntos o segundos, Y automático/fijo, pausa (sigue recibiendo), lectura con cursor, Δt y Δvalor entre dos marcadores, zoom con la rueda y arrastre para desplazar.",
    },
    {
      title: "Vigilancia de canales y alarmas (desde 0.10.0)",
      body: "Fije por canal límites inferior/superior, bloqueo durante N segundos y pérdida de datos durante N segundos: las filas disparadas se resaltan, con una lista de alarmas, sonido opcional y un registro CSV de alarmas. Una ayuda de supervisión, no un dispositivo de seguridad.",
    },
    {
      title: "Sigue el ritmo",
      body: "El análisis se hace en Rust; el dibujo se hace una vez por fotograma en un canvas con mínimo/máximo por píxel: miles de filas por segundo sin perder los picos.",
    },
    {
      title: "Grabar y guardar",
      body: "Cada valor a CSV mientras se recibe (apto para Excel), el rango visible como CSV, la gráfica como PNG. Tabla del último valor más mínimo, máximo y media del rango visible.",
    },
  ],
  steps: [
    "Haga que el equipo imprima números por línea (p. ej. 23.1,40 o temp:23.1 hum:40)",
    "Elija el origen (puerto serie y baudios, TCP, UDP) y pulse «Iniciar» (F4)",
    "Haga clic en la gráfica para medir; «● Grabar CSV» para conservarla",
  ],
  similar: "Herramientas parecidas son el Serial Plotter del IDE de Arduino y el SerialPlot de código abierto. PortDock Plot admite además entrada TCP y UDP y tramas binarias, y graba CSV mientras recibe.",
};
