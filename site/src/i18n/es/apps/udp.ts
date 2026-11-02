// PortDock UDP — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock UDP: emisor/receptor UDP gratis (broadcast, multicast)",
    desc: "Herramienta gratis de pruebas UDP para Windows: reciba y envíe datagramas, broadcast y multicast, responda al último remitente, eco y registros con hora.",
  },
  summary: "Reciba datagramas en un puerto y responda a un destino fijo o al último remitente. Pensado para equipos que usan broadcast y multicast.",
  who: [
    "Quien trabaje con equipos que difunden su estado por UDP",
    "Equipos que verifican la recepción multicast",
  ],
  features: [
    {
      title: "Lista de remitentes",
      body: "Reúne las direcciones de los remitentes; haga clic en una para usarla como destino.",
    },
    {
      title: "Broadcast y multicast",
      body: "Permita broadcast, únase a un grupo multicast o vuelva a unirse, y elija la tarjeta de red.",
    },
    {
      title: "Eco",
      body: "Devuelve los datos al remitente, con protección automática contra bucles.",
    },
  ],
  steps: [
    "Introduzca el puerto de escucha y el destino",
    "«Iniciar»",
    "Escriba y pulse «Enviar»",
  ],
  uses: [
    {
      title: "Recibir difusiones de estado",
      body: "Introduzca el puerto de escucha y pulse «Iniciar». Cada datagrama es una línea del registro, y los remitentes se reúnen en la lista «Remitentes» (hasta 256).",
    },
    {
      title: "Cuando no conoce la dirección del equipo",
      body: "Empiece a escuchar en el puerto al que envía el equipo y observe «Remitentes». Haga clic en «Usar como destino» junto a una dirección para responder allí.",
    },
    {
      title: "Enviar un broadcast",
      body: "Active «Permitir broadcast» antes de iniciar y envíe a 255.255.255.255 o a una dirección como 192.168.0.255. Si está desactivado, se le avisa.",
    },
    {
      title: "Comprobar la recepción multicast",
      body: "Introduzca un grupo (224–239.x.x.x) y se une al iniciar. Con varias tarjetas de red (red de oficina y de máquinas), elija la «Tarjeta de red multicast» del lado de la máquina. El TTL predeterminado de 1 se queda en la red local.",
    },
  ],
  faq: [
    {
      q: "No llega nada",
      a: "Compruebe la IP y el puerto a los que envía el equipo, el permiso del Firewall de Windows y que ambos estén en la misma subred. En multicast, compruebe el grupo y la tarjeta de red y pruebe «Reunirse».",
    },
    {
      q: "Al iniciar falla con «dirección en uso»",
      a: "Otro programa tiene el puerto; la línea de eventos indica ese programa y su PID. Use otro puerto o ciérrelo.",
    },
    {
      q: "¿Qué significa «ICMP port unreachable»?",
      a: "El sistema operativo informa de que nada escucha en ese puerto en el destino. Compruebe el número de puerto y la alimentación del equipo.",
    },
    {
      q: "¿Cuánto puedo enviar de una vez?",
      a: "Un envío es un datagrama. Por encima de unos 64 KB el sistema operativo lo rechaza.",
    },
  ],
};
