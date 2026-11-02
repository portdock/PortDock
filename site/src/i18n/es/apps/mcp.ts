// PortDock MCP — 소개 쪽 글. (hidden)·~·xx-… 는 결과에 실제로 나오는 글이라 그대로.
export default {
  seo: {
    title: "PortDock MCP: lea puertos COM y Modbus desde clientes de IA",
    desc: "Servidor MCP gratis para que Claude Desktop y otras IA lean informes de puertos COM y valores Modbus, MC y SCPI. Solo escribe en simuladores 127.0.0.1.",
  },
  summary: "Un servidor MCP sin ventana que arrancan los clientes de IA (Claude Desktop, VS Code, Cursor …). La IA lee los puertos COM y los adaptadores de red de este PC y lee valores Modbus, del protocolo MC y SCPI de los equipos que usted indique. Las herramientas de escritura solo aceptan la dirección de este PC (127.0.0.1) y están pensadas para simuladores. Desde 0.10.0 las escrituras Modbus solo van a un destino que se identifica como PortDock. Las escrituras MC se comprueban solo por dirección, así que si un programa de este PC reenvía a otro equipo (un relé TCP, una pasarela o un túnel), una escritura puede llegar a un equipo real.",
  who: [
    "Quien quiera que un asistente de IA le ayude a revisar problemas de puertos COM y adaptadores USB",
    "Desarrolladores que quieran leer valores Modbus, MC o SCPI dentro de una conversación con una IA",
    "Quien practique el uso de herramientas por una IA con simuladores en vez de equipos reales",
  ],
  features: [
    {
      title: "Nueve herramientas de lectura",
      body: "Lista de puertos COM, informe de Port Inspector, escucha serie (no envía nada), lecturas Modbus (FC 01–04), lectura por lotes MC 3E, consultas SCPI, ping, adaptadores de red y mapas de registros de equipos.",
    },
    {
      title: "Escrituras solo en simuladores 127.0.0.1",
      body: "Practique «escribir y volver a leer» con Modbus Slave o PLC Simulator en este PC. Cualquier otra dirección se rechaza antes de conectar. Desde 0.10.0 las escrituras Modbus exigen además que el destino se identifique como «PortDock» (FC 2B/0E); las escrituras MC se comprueban solo por dirección, así que no las use con un programa de relé en marcha.",
    },
    {
      title: "Solo consultas SCPI",
      body: "Envía una consulta que termina en «?»; las que pueden cambiar el estado, como *TST?, *CAL? y *RST, se rechazan. READ? y MEAS…?, que inician una medida nueva, se rechazan por defecto y solo se envían si lo permite con allow_measure (desde 0.8.0). Use FETC? para leer solo el último valor.",
    },
    {
      title: "Registro de sesión y límites de frecuencia",
      body: "Cada llamada se guarda en este PC como líneas JSON y nunca se envía fuera. Al mismo destino, como máximo una vez cada 100 ms y 120 llamadas por minuto.",
    },
    {
      title: "Datos personales ocultos",
      body: "Las rutas de carpetas de usuario en los resultados pasan a «~», las direcciones MAC a «xx-…» y los nombres de red a «(hidden)».",
    },
    {
      title: "Un solo archivo para instalar",
      body: "Sin Python, Node ni Docker: un .mcpb (se abre en Claude Desktop) o un único exe en un zip.",
    },
  ],
  steps: [
    "Abra PortDock-MCP.mcpb en Claude Desktop (otros clientes: ponga en sus ajustes la ruta del exe del zip)",
    "Pida a la IA algo como «muéstrame mis puertos COM»; el cliente le pregunta antes de cada llamada a una herramienta",
    "Indique la dirección, el puerto y el ID de esclavo para leer un equipo. Practique con Modbus Slave o PLC Simulator en 127.0.0.1",
  ],
  faq: [
    {
      q: "¿Puede la IA cambiar los ajustes de un equipo?",
      a: "Las dos herramientas de escritura solo funcionan cuando el destino es 127.0.0.1 o localhost (este PC); cualquier otra dirección se rechaza antes de conectar. Desde 0.10.0 modbus_write_sim solo escribe cuando el destino responde a la identificación del equipo (FC 2B/0E) con un nombre de fabricante que empieza por «PortDock», así que no escribe en equipos reales situados tras la pasarela Modbus TCP ↔ RTU de PortDock Serial (127.0.0.1:502 por defecto). mc_write_sim se comprueba solo por dirección, así que si un programa de este PC reenvía a otro equipo (un relé TCP, una pasarela de fabricante, un túnel SSH …), una escritura puede llegar a un equipo real: no use las herramientas de escritura mientras ese programa esté en marcha.",
    },
    {
      q: "¿Qué envía a la red?",
      a: "PortDock MCP solo habla con las direcciones y puertos de equipos que usted indique, y el registro de sesión se queda en este PC. Los resultados de las herramientas van al cliente de IA que use, así que desde ahí se aplica la política de ese cliente.",
    },
  ],
};
