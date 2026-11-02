// PortDock Serial — 소개 쪽 글(en 원문과 같은 열쇠·순서). 이름·명령·버전은 그대로.
export default {
  seo: {
    title: "PortDock Serial: terminal serie gratis para Windows (RS-232/485)",
    desc: "Terminal serie gratis para Windows con RS-232, RS-485 y puertos COM USB: HEX/ASCII, reconexión automática, nueve checksums, Modbus RTU y registros con hora.",
  },
  summary: "Intercambie datos con equipos RS-232, RS-485 y serie USB y guarde un registro de pruebas con marca de tiempo. Si desenchufa y vuelve a enchufar un adaptador USB, se reconecta al mismo equipo.",
  who: [
    "Técnicos de campo que ponen en marcha un equipo nuevo",
    "Desarrolladores de firmware que prueban un protocolo UART",
    "Quien necesite leer el tráfico Modbus RTU",
  ],
  features: [
    {
      title: "Puertos que se reconocen",
      body: "Muestra junto a cada puerto el nombre del equipo, el VID:PID USB y el número de serie, y se actualiza al conectar o desconectar.",
    },
    {
      title: "Aguanta las desconexiones",
      body: "Vuelve a abrir el mismo equipo tras reenchufarlo aunque el número COM haya cambiado, y registra cada corte y cada reconexión.",
    },
    {
      title: "Cuatro modos de entramado",
      body: "Pausa entre bytes, terminador, longitud fija o Modbus RTU, de modo que un mensaje sea una línea.",
    },
    {
      title: "Nueve checksums y CRC personalizado",
      body: "Añada al enviar CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 o un CRC personalizado, y compruébelos al recibir.",
    },
    {
      title: "Decodificación Modbus RTU",
      body: "Decodifica peticiones, respuestas y excepciones en dirección, función y valores.",
    },
    {
      title: "Líneas de señal",
      body: "Active o desactive DTR/RTS y vea CTS/DSR/RI/CD en los indicadores y en el registro.",
    },
    {
      title: "Registros de pruebas",
      body: "Marcas de tiempo en milisegundos, lista de comandos, envío repetido y registro continuo en archivo.",
    },
    {
      title: "Comprobar conexión…",
      body: "Lee, sin permisos de administrador, el equipo, el controlador, el código de problema, el temporizador de latencia FTDI y el ahorro de energía USB del puerto elegido, y hace una prueba de loopback o de eco RS-485 a 2 hilos. Desde 0.10.0 también una prueba de dos puertos (dos adaptadores conectados entre sí), patrones (0x00–0xFF, 0x55/0xAA) y un esquema de cableado. No se cambia nada.",
    },
    {
      title: "Compartir puerto: COM ↔ TCP (desde 0.10.0)",
      body: "Expone el puerto COM abierto como servidor TCP para que otros programas, WSL2, Docker u otro PC usen el mismo puerto. Sin procesar o RFC 2217 (cambios remotos de baudios/paridad); los datos recibidos van a todos los clientes y el cliente que envía queda marcado en el registro. Por defecto solo este PC (127.0.0.1); otros PC solo si lo permite. Sin controlador de COM virtual ni permisos de administrador.",
    },
    {
      title: "Pasarela Modbus TCP ↔ RTU (desde 0.10.0)",
      body: "Convierte el PC en una pasarela: SCADA, un HMI o un programa del PC se conecta por Modbus TCP (puerto 502 por defecto) y las peticiones llegan a los equipos RS-485 como tramas RTU, con las respuestas de vuelta como MBAP. Una petición a la vez; sin respuesta, excepción 0B; sin ruta, 0A; estadísticas de peticiones, respuestas y timeouts, y líneas de registro como «TCP #1 → RTU esclavo 3 FC03».",
    },
    {
      title: "Escucha pasiva Modbus RTU (desde 0.10.0)",
      body: "Escucha el tráfico maestro–esclavo con un adaptador en el bus RS-485 sin enviar nada. Las tramas se separan por CRC (y se resincroniza cuando las pausas se difuminan), con pares petición/respuesta, tiempos de respuesta, faltas de respuesta, excepciones y estadísticas. En RS-232, dos puertos con un cable en Y se reúnen en una sola línea de tiempo. Se guarda en archivo, también en CSV.",
    },
  ],
  steps: [
    "Elija el puerto, los baudios y la paridad, y pulse «Conectar»",
    "Escriba HEX o ASCII; añada un checksum o un fin de línea si hace falta",
    "«Enviar»: las líneas recibidas aparecen como RX ◀ y las enviadas como TX ▶",
  ],
  similar: "Herramientas parecidas son Tera Term y PuTTY (terminales de código abierto). PortDock Serial reúne en una pantalla funciones de prueba de equipos: reconexión USB, entramado, comprobación de checksums y decodificación Modbus RTU.",
};
