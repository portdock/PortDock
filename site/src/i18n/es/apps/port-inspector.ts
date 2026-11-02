// PortDock Port Inspector — 소개 쪽 글. Windows 화면 이름은 스페인어 Windows 표기.
export default {
  seo: {
    title: "PortDock Port Inspector: inspector de puertos COM gratis",
    desc: "Inspector gratis de puertos COM para Windows: controlador USB serie, código de problema del Administrador de dispositivos, latencia FTDI y COM fantasma.",
  },
  summary: "Elija un puerto COM y vea en un solo sitio lo que de otro modo habría que buscar en el Administrador de dispositivos, el Visor de eventos y el registro: el controlador, el código de problema y su significado, el chip USB, ajustes del dispositivo como el temporizador de latencia FTDI, el ahorro de energía USB, el historial reciente de conexiones y las reservas de números COM. Solo lee, sin permisos de administrador, y con TX unido a RX mide el viaje de ida y vuelta a cada velocidad en baudios. Otras pestañas leen del mismo modo los adaptadores de red de este PC, sus ajustes de Windows como PC de equipo, y el Wi-Fi y el Bluetooth.",
  who: [
    "Técnicos de campo cuyo adaptador USB serie no se detecta o se cae de vez en cuando",
    "Quien busque por qué las respuestas Modbus RTU parecen tardías (temporizador de latencia FTDI)",
    "Quien necesite adjuntar los datos del puerto del PC a una solicitud de soporte o a una incidencia",
  ],
  features: [
    {
      title: "Dispositivo, controlador, código de problema",
      body: "Nombre, número COM, ubicación, ID de instancia y fabricante; proveedor, versión y fecha del controlador, INF y servicio; estado y código de problema del Administrador de dispositivos con su significado y qué probar; última conexión y retirada.",
    },
    {
      title: "Chip USB y ajustes del dispositivo",
      body: "Nombre del chip a partir de una tabla de VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), los valores predeterminados de Windows para el puerto y los parámetros del dispositivo del controlador, con el temporizador de latencia FTDI (LatencyTimer) explicado.",
    },
    {
      title: "Ahorro de energía e historial",
      body: "Suspensión selectiva USB de las opciones de energía, «Permitir que el equipo apague este dispositivo para ahorrar energía» para el dispositivo y los dispositivos USB de los que cuelga, y eventos de conexión y de controlador de los registros de eventos (7, 30 o 90 días).",
    },
    {
      title: "Reservas de números COM",
      body: "Números que Windows mantiene reservados (ComDB), números ocupados por dispositivos no conectados ahora, números huérfanos y números ocupados por más de un dispositivo: por qué un adaptador nuevo acaba en COM15.",
    },
    {
      title: "Prueba de conexión",
      body: "Un loopback TX–RX por velocidad en baudios: bytes iguales, perdidos y cambiados, viaje de ida y vuelta de 1 byte en ms (mediana y máximo) e indicadores de error del controlador (ClearCommError). También indica si un adaptador RS-485 de 2 hilos devuelve eco.",
    },
    {
      title: "Prueba de dos puertos y patrones (desde 0.10.0)",
      body: "Con dos adaptadores conectados entre sí, envía en ambos sentidos a cada velocidad y compara lo que llega (para comprobar adaptadores RS-485). Patrones: bytes mezclados, 0x00–0xFF, 0x55/0xAA; longitud de 64 a 4096 bytes. Esquema de cableado en texto y un veredicto global «Sin problemas detectados (dentro de esta prueba) / Conviene revisar / Problema». Lo mismo en «Comprobar conexión…» de Serial.",
    },
    {
      title: "Adaptadores de red de este PC",
      body: "«Leer adaptadores» muestra, por adaptador, enlace, velocidad, dúplex, IPv4 y puerta de enlace, además de los valores de «Opciones avanzadas» del Administrador de dispositivos (tramas jumbo, búferes de recepción, moderación de interrupciones, EEE …), ahorro de energía, errores de recepción, perfil de red y si su firewall está activado. El uso «Cámara GigE» muestra los valores publicados por los fabricantes de cámaras con sus fuentes al lado.",
    },
    {
      title: "Este PC: ajustes de PC de equipo",
      body: "«Leer ajustes de este PC» lee el inicio rápido, la suspensión, la suspensión selectiva USB, la política de reinicio de las actualizaciones, el protector de pantalla, la sincronización de hora, y los últimos apagados inesperados y errores de hardware. Con el uso «PC de equipo», los valores que pueden provocar paradas o reinicios se marcan como «Conviene revisar».",
    },
    {
      title: "Este PC: pantallazos azules, salud del SSD, orígenes de reactivación (desde 0.10.0)",
      body: "La misma tarjeta «Este PC» lee los códigos de parada de pantallazo azul con sus nombres (p. ej. 0x50 PAGE_FAULT_IN_NONPAGED_AREA) y las horas de apagados bruscos, la temperatura del SSD NVMe, el porcentaje usado, el espacio de reserva, las horas de encendido y los errores de medio, qué reactivó el PC de la suspensión, y la capacidad frente al diseño y los ciclos de la batería de un portátil, sin permisos de administrador. Los archivos de volcado solo se listan; no se leen los números de serie de los discos.",
    },
    {
      title: "Comparar con la vez anterior: comprobaciones guardadas (desde 0.10.0)",
      body: "Guarde la comprobación actual (lista de puertos COM, nombre/versión/fecha del controlador, ubicación USB, ajustes de los adaptadores de red, ajustes de Este PC, registros de pantallazos azules) y en el siguiente mantenimiento vuelva a leer para ver solo lo que cambió: p. ej. COM3 → COM7, una nueva versión del controlador (¿Windows Update?), tramas jumbo desactivadas, un ajuste de energía cambiado, un nuevo pantallazo azul. No se guardan números de serie de dispositivos, nombre del PC ni carpeta de usuario. Conserve el resultado como texto o CSV.",
    },
    {
      title: "Inalámbrico: Wi-Fi y Bluetooth",
      body: "La pestaña «Inalámbrico» lee el adaptador Wi-Fi, el controlador, el ahorro de energía y los registros de desconexión que guarda Windows (contados por motivo), además del adaptador Bluetooth, el estado del servicio, los eventos de error y si el audio Bluetooth está en modo manos libres (llamadas), sin permisos de administrador ni de ubicación. No envía pings, y las exportaciones ocultan los nombres de dispositivo.",
    },
    {
      title: "Solo lectura, resultados claros",
      body: "Nunca cambia ajustes ni controladores (la ayuda explica las soluciones manuales). Cada tarjeta se marca «Sin problemas detectados (en lo leído) / Conviene revisar / Problema / No se pudo leer»; lo que el PC no puede ver (inversión A/B, terminación, polarización, tierra) siempre se lista; las exportaciones de texto y JSON ocultan las rutas de las carpetas de usuario.",
    },
  ],
  steps: [
    "Haga clic en un puerto de la lista «Puertos COM» de la izquierda",
    "Lea el resultado y el motivo de cada tarjeta; si hace falta, cambie lo necesario usted mismo en Windows como explica la ayuda",
    "Una TX con RX para la «Prueba de conexión»; use «Copiar texto» para adjuntar el resultado a una consulta",
  ],
  similar: "Herramientas parecidas son el Administrador de dispositivos de Windows, USBDeview de NirSoft (freeware), USB Device Tree Viewer de Uwe Sieber (freeware) y FT_PROG de FTDI para chips FTDI (gratis). PortDock Port Inspector reúne en un solo sitio el controlador, el código de problema, el ahorro de energía, el historial de conexiones y las reservas de números COM de un puerto COM, y añade una prueba de conexión con loopback.",
};
