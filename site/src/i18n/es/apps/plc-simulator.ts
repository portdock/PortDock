// PortDock PLC Simulator — 소개 쪽 글. MC 명령 이름은 스페인어 용어(lectura/escritura por lotes …).
export default {
  seo: {
    title: "PortDock PLC Simulator: simulador del protocolo MC (SLMP) gratis",
    desc: "Herramienta gratis para Windows que prueba enlaces del protocolo MC (3E/4E, binario/ASCII) sin PLC: tablas de dispositivos (D, M, X, Y …) y fallos.",
  },
  summary: "El PC responde a peticiones del protocolo MC (SLMP) como el puerto Ethernet de un PLC. Ponga valores en las tablas de dispositivos y un HMI, un software de recogida de datos o de supervisión podrá leerlos y escribirlos; los retardos y los códigos de fin de error provocados prueban su gestión de errores. Sigue los formatos de mensaje de los manuales públicos de Mitsubishi Electric (SLMP/MC); no está vinculado a la empresa y el comportamiento puede diferir del de un PLC real.",
  who: [
    "Equipos que preparan pantallas HMI y comunicaciones antes de que llegue el PLC",
    "Desarrolladores de software de recogida de datos o de supervisión que leen PLC con el protocolo MC",
  ],
  features: [
    {
      title: "3E/4E, binario/ASCII, TCP/UDP",
      body: "Escucha como servidor TCP (varios clientes) o por UDP. Las respuestas 4E llevan el número de serie de la petición. Por defecto solo puede conectarse este PC (127.0.0.1); permitir otros PC es decisión suya.",
    },
    {
      title: "Comandos implementados",
      body: "0401 lectura y 1401 escritura (palabras y bits, subcomandos 0000–0003), 0403 lectura aleatoria, 1402 escritura aleatoria y 0619 prueba de loopback. Desde 0.6.0 también 0406/1406 lectura/escritura de bloques, 0801/0802 monitor, 1001–1006 RUN/STOP/PAUSE/borrado de latch/reinicio remotos (solo estado simulado) y 0101 lectura del nombre de modelo (valores simulados). Los demás comandos reciben el código de fin C059.",
    },
    {
      title: "Protocolo dedicado LS XGT (desde 0.10.0)",
      body: "Cambie «Protocolo» a «XGT dedicado» y responde al protocolo dedicado FEnet de los PLC XGT de LS ELECTRIC (cabecera «LSIS-XGT», por defecto TCP 2004 · UDP 2005): lectura h0054 y escritura h0058, individuales (%MX, %MB, %MW, %MD, %ML, hasta 16 bloques) y continuas (%MB bytes, hasta 1.400 bytes), dispositivos P, M, K, F, T, C, D, L, N, y respuestas con código de error (1–6, h75–h78). Creado a partir de los manuales de usuario públicos de LS ELECTRIC; sin vinculación con la empresa.",
    },
    {
      title: "Reglas de condición (desde 0.6.0)",
      body: "Imite acuerdos de intercambio como «cuando el bit de petición se activa, activa el bit de hecho 300 ms después»: condición (bit ON/OFF/flanco, comparación de palabras, periódica) → retardo (fijo o aleatorio) → acciones (escrituras de bits y palabras). No es un programa de escalera.",
    },
    {
      title: "18 dispositivos",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC y CN. X, Y, B, W y ZR usan números hexadecimales; cada dispositivo tiene un tamaño y las peticiones que lo superan reciben C056. Los dispositivos de bit pueden verse como palabras de 16 puntos; las celdas pueden ser de 32 bits, float, cadena o con nombre.",
    },
    {
      title: "Inyección de fallos",
      body: "Retardo de respuesta (con rango), falta de respuesta o un código de fin elegido, dirigidos por comando, dispositivo, cada N peticiones o probabilidad.",
    },
    {
      title: "Tráfico decodificado",
      body: "Cada petición muestra el nombre del comando, el dispositivo y los puntos; cada respuesta, el código de fin y su significado. Las celdas cambiadas por un cliente parpadean, con estadísticas.",
    },
    {
      title: "Simulación y estados guardados",
      body: "Los valores pueden cambiar solos (incremento, aleatorio, senoidal, rampa, alternancia), y los valores de los dispositivos y los ajustes de celda se guardan en un archivo JSON y se cargan desde él.",
    },
  ],
  steps: [
    "Haga coincidir con el cliente la trama (3E/4E), el código de datos (binario/ASCII) y el puerto",
    "Elija un dispositivo (D, M, X …) e introduzca valores",
    "«Iniciar»: las lecturas y escrituras del cliente se responden desde las tablas",
  ],
  faq: [
    {
      q: "¿Se comporta exactamente como un PLC real?",
      a: "No. Sigue los formatos de mensaje de los manuales públicos y no se ha comparado con hardware real. No se ejecuta ningún programa de escalera, y los códigos de error, los tiempos, los límites de conexión y los rangos de dispositivos de cada modelo pueden diferir.",
    },
    {
      q: "¿Cómo conecto un HMI desde otro PC?",
      a: "Active «Permitir que otros PC se conecten (0.0.0.0)» y permita el programa en el Firewall de Windows. No lo ejecute en una red de planta con la misma IP y puerto que un PLC real.",
    },
  ],
  similar: "Herramientas parecidas son DummyPLC (gratis, código cerrado) y HslCommunication (comercial). PortDock PLC Simulator es gratis (GPL-3.0) y añade inyección de fallos, tráfico decodificado y simulación de valores.",
};
