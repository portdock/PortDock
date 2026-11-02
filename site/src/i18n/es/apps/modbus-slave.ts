// PortDock Modbus Slave — 소개 쪽 글. 내장 장비 수가 들어가는 글은 함수.
export default {
  seo: {
    title: "PortDock Modbus Slave: simulador de esclavo Modbus gratis",
    desc: "Simulador gratis de esclavo Modbus RTU/TCP para Windows: pruebe un PLC, HMI o maestro sin el equipo, con tablas de registros, inyección de fallos y perfiles.",
  },
  summary: "Convierte el PC en un esclavo Modbus (RTU serie, o servidor Modbus TCP o RTU sobre TCP) para probar un maestro (PLC, HMI, software de supervisión) sin el equipo real, incluidos retardos y errores provocados a propósito.",
  who: [
    "Desarrolladores que escriben un maestro Modbus",
    "Equipos que preparan pantallas HMI antes de que llegue el equipo",
  ],
  features: [
    {
      title: "Tres medios de transporte",
      body: "Serie (RTU), servidor TCP (Modbus TCP) y servidor TCP (RTU sobre TCP: un equipo tras un servidor de dispositivos serie).",
    },
    {
      title: "Cuatro tablas",
      body: "Bobinas, entradas discretas, registros de mantenimiento y registros de entrada. Vea una tabla como U16, S16, HEX o BIN, fije por celda los tipos U32, S32, F32, F64 o cadena con su orden de bytes, y deje que los valores cambien solos (incremento, aleatorio, senoidal …).",
    },
    {
      title: "Varios ID de esclavo",
      body: "Ejecute varios ID de esclavo (1–247), cada uno con sus propios valores.",
    },
    {
      title: "Inyección de fallos",
      body: "Retardo, falta de respuesta, CRC dañado, longitud MBAP errónea o excepciones forzadas, dirigidos por ID de esclavo, función, dirección, cada N peticiones o probabilidad, para probar los timeouts y reintentos del maestro.",
    },
    {
      title: "Cada escritura a la vista",
      body: "Las celdas que escribe el maestro parpadean, con registro de tráfico y estadísticas.",
    },
    {
      title: "Perfiles de equipo, tablas guardadas",
      body: (c: { nDevices: number }) => `Cargue los nombres y tipos de registros de ${c.nDevices} equipos incluidos (variadores, controladores de temperatura, medidores de potencia …) con valores de ejemplo. Exporte e importe tablas como mapas de registros CSV (mismo formato que Modbus Master) o JSON.`,
    },
    {
      title: "Emular con un perfil de equipo: valores en vivo (desde 0.10.0)",
      body: "Pruebe SCADA, HMI o su propio programa sin un variador ni un medidor de potencia reales. Al escribir la orden de marcha, la frecuencia de salida sube hasta la consigna de frecuencia (y baja si es 0), con la corriente, la tensión y la potencia siguiéndola; los medidores de potencia hacen derivar un poco la tensión y la corriente y acumulan energía. Las «reglas de enlace» editables (seguir, proporcional, acumular) conectan celdas. Se respetan las celdas de solo lectura y de solo escritura del mapa del equipo (excepción 02 o 03, a su elección), las direcciones sin asignar devuelven la excepción 02, y todo funciona junto con la inyección de fallos. Los valores salen de las tablas del manual, así que el comportamiento real del equipo (tiempos de rampa, etc.) puede diferir.",
    },
    {
      title: "Dirección de escucha 127.0.0.1 en el primer arranque (desde 0.10.0)",
      body: "La «Dirección de escucha» del servidor TCP empieza en 127.0.0.1 (solo este PC). Para un maestro en otro PC, elija ahí 0.0.0.0 (todos los adaptadores) o la dirección de un adaptador. Se conservan los ajustes guardados por versiones anteriores.",
    },
  ],
  steps: [
    "Elija el transporte (serie o TCP) y el puerto y los baudios (o la dirección y el puerto); añada ID de esclavo si hace falta",
    "Elija una tabla, fije el inicio y la cantidad e introduzca valores",
    "«Conectar» («Iniciar» en TCP): las peticiones del maestro se responden desde la tabla",
  ],
  similar: "Herramientas parecidas son el Modbus Slave comercial (Witte Software) y el ModRSsim2 de código abierto. PortDock Modbus Slave es gratis (GPL-3.0) y sin límite de tiempo.",
};
