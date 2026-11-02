// PortDock TCP — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock TCP: cliente, servidor y relé TCP para pruebas (gratis)",
    desc: "Herramienta gratis de pruebas TCP para Windows: cliente, servidor con varios pares y relé (monitor), eco, reconexión automática y entramado Modbus TCP.",
  },
  summary: "Conéctese a un equipo Ethernet (cliente) o deje que los equipos se conecten al PC (servidor). El servidor acepta varios pares y puede enviar a uno o a todos; el relé se sitúa entre dos equipos y registra ambos sentidos.",
  who: [
    "Desarrolladores de HMI, MES y software de supervisión",
    "Desarrolladores de firmware de equipos TCP",
  ],
  features: [
    {
      title: "Cliente y servidor",
      body: "El servidor acepta hasta 64 pares; envíe a uno o a todos y desconéctelos por separado.",
    },
    {
      title: "Relé (monitor)",
      body: "Se sitúa entre A (p. ej. un HMI) y B (p. ej. un PLC), deja pasar el tráfico y registra ambos sentidos.",
    },
    {
      title: "Reconexión automática",
      body: "El cliente se reconecta a intervalos fijos cuando se cae el enlace.",
    },
    {
      title: "Eco",
      body: "El servidor devuelve lo que llega; el eco se desactiva solo por encima de 200 por segundo para evitar bucles de eco.",
    },
    {
      title: "Entramado y checksums",
      body: "Divida el flujo TCP por pausa, terminador, longitud fija o Modbus TCP (longitud MBAP), y compruebe nueve tipos de checksum o un CRC personalizado.",
    },
    {
      title: "Dirección de escucha 127.0.0.1 en el primer arranque (desde 0.10.0)",
      body: "La «Dirección de escucha» del servidor y la «Dirección de este PC a la que se conecta A» del relé empiezan en 127.0.0.1 (solo este PC). Para que se conecte otro PC o un HMI, elija ahí 0.0.0.0 (todas las tarjetas de red) o la dirección de un adaptador. Se conservan los ajustes guardados por versiones anteriores.",
    },
  ],
  steps: [
    "Elija «Cliente» o «Servidor» e introduzca dirección y puerto",
    "«Conectar» o «Escuchar»",
    "Escriba y pulse «Enviar»",
  ],
  uses: [
    {
      title: "Hablar con un equipo",
      body: "Si el equipo espera conexiones, use «Cliente» con su IP y puerto, envíe comandos y lea las respuestas en HEX o ASCII. El cliente se reconecta a intervalos fijos si se cae el enlace.",
    },
    {
      title: "Cuando el equipo se conecta al PC",
      body: "Abra un puerto con «Servidor» y se pueden conectar hasta 64 equipos. Envíe a uno o a todos y desconéctelos uno a uno.",
    },
    {
      title: "Registrar el tráfico HMI ⇄ PLC",
      body: "Con «Relé» el PC se sitúa entre dos equipos; apunte el HMI a este PC y se registran ambos sentidos. Los bytes pasan sin cambios. Desde 0.8.0 el relé puede guardar un pcap y muestra pares petición-respuesta Modbus/MC y tiempos de respuesta.",
    },
    {
      title: "Leer una vez un equipo Modbus TCP",
      body: "Conéctese al puerto 502 y aparece una barra «Ver como Modbus TCP». Separa peticiones y respuestas una a una y las decodifica en el panel de detalle. Para un sondeo continuo es más cómodo Modbus Master.",
    },
  ],
  faq: [
    {
      q: "El cliente no consigue conectarse (CONNECT FAIL)",
      a: "Compruebe la alimentación y el cable del equipo, la IP y el puerto, y que el PC y el equipo estén en la misma subred (p. ej. 192.168.0.x).",
    },
    {
      q: "Inicié el servidor pero el equipo no se conecta",
      a: "Asegúrese de haberlo permitido en el aviso del Firewall de Windows y de que el equipo se conecta a la IP de este PC. Un error de «ya en uso» significa que otro programa tiene el puerto.",
    },
    {
      q: "Los datos aparecen unidos o partidos",
      a: "TCP no conserva los límites de los mensajes. Cambie el entramado en «Recepción» a terminador, longitud fija o Modbus TCP (longitud MBAP), o ajuste la pausa.",
    },
    {
      q: "¿El relé modifica el tráfico?",
      a: "No. Los bytes se reenvían tal como llegan; el entramado y la comprobación de checksums solo se usan para el registro, y la respuesta automática y el eco están desactivados. Solo llega a los equipos lo que usted mismo inyecte, así que tenga cuidado.",
    },
  ],
  similar: "Una herramienta parecida es Hercules SETUP utility (HW-group, freeware).",
};
