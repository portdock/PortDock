// PortDock Net Scan — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Net Scan: escáner de IP gratis para redes industriales",
    desc: "Escáner de IP gratis para redes industriales: barrido ping y ARP, fabricante por MAC, puertos industriales (Modbus 502, MC, XGT, S7 …), monitor de ping.",
  },
  summary: "Barra la subred de una tarjeta de red para encontrar equipos e identifíquelos por el fabricante de la MAC y los puertos industriales abiertos (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Los equipos que bloquean el ping se encuentran igualmente por ARP en la misma subred.",
  who: [
    "Técnicos de campo que no saben la IP de un equipo nuevo",
    "Quien deba vigilar durante la noche la red de un equipo",
  ],
  features: [
    {
      title: "Barrido ping + ARP",
      body: "ARP en la misma subred encuentra los equipos que bloquean el ping; muestra tiempo de respuesta, nombre, este PC y la puerta de enlace. No requiere permisos de administrador.",
    },
    {
      title: "Comprobación de puertos industriales",
      body: "Comprueba solo una lista de puertos (por defecto 502, 2004, 5000–5010, 102, 44818, 4840 …; editable, hasta 32), sin escaneo general de puertos, y pregunta a los equipos Modbus por fabricante y modelo (FC 2B/0E).",
    },
    {
      title: "Avisos de exposición (desde 0.10.0)",
      body: "Si entre los puertos ya comprobados está Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 o HTTP 80, añade un aviso como «Protocolo industrial abierto: cualquiera en la misma red puede leer y escribir (sin autenticación); compruebe la separación de redes». No escanea puertos adicionales ni cambia ajustes de ningún equipo.",
    },
    {
      title: "Descubrimiento por broadcast: EtherNet/IP, BACnet",
      body: "Solo al pulsarlo, envía EtherNet/IP ListIdentity (UDP 44818) y BACnet Who-Is (UDP 47808) a la dirección de broadcast del adaptador elegido e incorpora a la tabla el fabricante, el tipo de equipo, el nombre del producto y la revisión (y la instancia de equipo y el ID de fabricante BACnet) de los equipos cuya IP no conoce. Son peticiones de solo lectura; no se muestran números de serie.",
    },
    {
      title: "Fabricante por MAC",
      body: "La lista IEEE incluida muestra el fabricante sin acceso a internet.",
    },
    {
      title: "Monitor de ping a largo plazo",
      body: "Registra en CSV las pérdidas, la latencia y las caídas de varios equipos y hace parpadear la barra de tareas ante una caída.",
    },
    {
      title: "Nuevos / ausentes",
      body: "Compara con el escaneo anterior para marcar los equipos nuevos y los ausentes. Exporta a CSV.",
    },
    {
      title: "Referencias: comparar con la vez anterior (desde 0.10.0)",
      body: "Guarde la lista de equipos como referencias con nombre (varias, también como archivos JSON) y compare con una el siguiente escaneo: nuevos (¿añadidos?), ausentes (¿retirados o apagados?), MAC cambiada (¿otro equipo con la misma IP, sustituido?), IP cambiada (¿el mismo equipo con otra IP, DHCP?) y puertos abiertos cambiados, con código de colores. CSV de comparación y copia para «AI» (últimos 3 bytes de la MAC ocultos). Los archivos de referencia contienen direcciones MAC: tenga cuidado al compartirlos.",
    },
    {
      title: "Wake-on-LAN, abrir la web",
      body: "Por equipo: abrir su página web, copiar IP/MAC y enviar un paquete mágico.",
    },
  ],
  steps: [
    "Elija un adaptador de red: su subred pasa a ser el rango (el /24 en que está, si es más amplia)",
    "«Escanear» (F4)",
    "Revise las columnas de servicios y fabricante; haga clic en un equipo para abrir su página web, copiar su IP, despertarlo o «Añadir al monitor de ping»",
  ],
  similar: "Herramientas parecidas son Angry IP Scanner (código abierto) y Advanced IP Scanner (freeware). PortDock Net Scan añade la comprobación de puertos industriales (Modbus 502, MC, XGT, S7 …) y el monitor de ping a largo plazo.",
};
