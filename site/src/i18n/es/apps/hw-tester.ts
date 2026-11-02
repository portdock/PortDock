// PortDock Hardware Tester — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Hardware Tester: registro de cortes Wi-Fi y ping (gratis)",
    desc: "Herramienta gratis para Windows que registra cortes de Wi-Fi: ping al router y a internet a la vez, tiempo DNS, motivos de desconexión de Windows y Bluetooth.",
  },
  summary: "Convierte «mi Wi-Fi se corta» en un registro. Mientras graba, hace ping a su puerta de enlace (router) y a una dirección de internet a la vez, dibuja la latencia y la pérdida en una gráfica con los motivos de desconexión Wi-Fi que registra Windows en la misma línea de tiempo, y le dice si debe mirar del lado del router o más allá. También registra cuándo se conectan y desconectan los dispositivos Bluetooth. Solo lectura, sin permisos de administrador; no cambia ningún ajuste.",
  who: [
    "Quien sufra cortes de Wi-Fi y quiera saber si es el router o internet",
    "Quien quiera un registro de cuándo se desconectan unos auriculares o un teclado Bluetooth",
    "Técnicos de campo que documentan el enlace inalámbrico del PC de un equipo antes de una llamada de soporte",
  ],
  features: [
    {
      title: "Puerta de enlace frente a internet",
      body: "Hace ping al router y a una dirección de internet (1.1.1.1, 8.8.8.8 o la suya) al mismo ritmo y muestra lado a lado la pérdida, la media, el percentil 95 y la fluctuación. Nunca más de una vez por segundo; una grabación se detiene a las 24 horas.",
    },
    {
      title: "Motivos de desconexión de Windows en la misma gráfica",
      body: "Lee el registro WLAN-AutoConfig (8001 conexión, 8003 desconexión) y lo muestra como líneas en la gráfica y con la redacción del motivo de Windows en la lista de eventos. No se lee el nombre de la red Wi-Fi.",
    },
    {
      title: "Tiempo de respuesta DNS",
      body: "Cada 5 s se consulta un nombre (por defecto example.com) en el servidor DNS sin usar la caché, midiendo las respuestas y los fallos.",
    },
    {
      title: "Resumen de dónde mirar y CSV",
      body: "Indica «lado del router» cuando la pérdida llega a la puerta de enlace y «más allá del router» cuando solo pierde respuestas el destino de internet: dónde mirar, no la causa. Las grabaciones se guardan como CSV.",
    },
    {
      title: "Registro de conexiones Bluetooth",
      body: "Lee cada 2 s el estado «Conectado» de los dispositivos emparejados y registra conexiones y cortes. Los nombres solo se muestran en pantalla; el texto guardado y copiado usa «Dispositivo N».",
    },
    {
      title: "Registro de conexión/desconexión USB (desde 0.10.0)",
      body: "Descubre qué dispositivo USB está detrás de un sonido repetido de conexión/desconexión. Registra las horas de conexión y retirada con el nombre del dispositivo, VID:PID, puerto del hub y velocidad, marca como «posibles cortes repetidos» un dispositivo que se corta 3 o más veces en 10 minutos y como «Conviene revisar» un dispositivo USB 3 que funciona a velocidad USB 2.0. También lee las últimas horas de llegada y retirada anteriores al arranque de la app.",
    },
    {
      title: "Modo de audio Bluetooth y tonos izquierdo/derecho",
      body: "Muestra si la salida predeterminada es estéreo (A2DP) o manos libres para llamadas, y reproduce tonos de prueba por la izquierda, por la derecha y por ambos lados.",
    },
    {
      title: "Señal y canal Wi-Fi (a petición)",
      body: "Solo mientras «Ver señal» está activado: intensidad de señal, velocidad del enlace, banda, canal y cuántas redes cercanas comparten cada canal (sin nombres). Desde Windows 11 24H2 requiere permiso de ubicación (el resto funciona sin él).",
    },
  ],
  steps: [
    "Elija el destino de internet y el intervalo, y pulse «Iniciar registro»",
    "Déjelo hasta que ocurran los cortes: latencia del router y de internet y motivos de Windows en una sola gráfica",
    "Lea dónde mirar en «Resumen» y después «Guardar CSV…» o «Copiar resumen»",
  ],
  faq: [
    {
      q: "¿Mide la velocidad de internet?",
      a: "No. Registra cortes, latencia y pérdida, no la velocidad de descarga ni de subida. Para eso use una web de test de velocidad.",
    },
    {
      q: "¿Soluciona el problema?",
      a: "No. Solo lee y no cambia ningún ajuste. Indica dónde mirar (lado del router, más allá del router, DNS, motivos de desconexión de Windows).",
    },
    {
      q: "¿Qué envía a la red?",
      a: "Solo los pings a la puerta de enlace y a la dirección de internet elegida y una consulta DNS, mientras graba. Los destinos se muestran siempre, y tras detenerlo no se envía nada.",
    },
  ],
  similar: "Herramientas parecidas son PingPlotter (comercial, con edición gratuita) y WifiHistoryView (gratis, historial de conexiones y desconexiones). PortDock Hardware Tester es gratis (GPL-3.0) y reúne en una gráfica los pings a la puerta de enlace y a internet y los motivos de desconexión de Windows, junto con un registro de conexiones Bluetooth.",
};
