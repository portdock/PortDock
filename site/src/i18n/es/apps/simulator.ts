// PortDock Simulator — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Simulator: simulador de equipos serie, TCP y UDP (gratis)",
    desc: "Simulador gratis de equipos por reglas: «cuando llega esto, responde aquello» por serie, TCP y UDP. Desarrolle sin hardware y pruebe retardos y pérdidas.",
  },
  summary: "Imite cualquier equipo con reglas «cuando llega esto → responde aquello». Desarrolle software de supervisión sin hardware y pruebe la gestión de errores con retardos, respuestas descartadas (cada N o al azar) y respuestas rotativas.",
  who: [
    "Desarrolladores de software de supervisión que aún no tienen el hardware",
    "Equipos que montan bancos de pruebas automáticos",
  ],
  features: [
    {
      title: "Reglas con comodines",
      body: "En HEX, ?? (cualquier byte) y ** (cero o más). El ASCII coincide literalmente por defecto; active «Comodines» en una regla para usar ? y *. Coincidencia exacta o contiene.",
    },
    {
      title: "Respuestas a medida",
      body: "Checksum y fin de línea automáticos, retardo de respuesta y contador de aciertos por regla.",
    },
    {
      title: "Mensajes iniciados por el equipo",
      body: "Envíe latidos o informes de estado a intervalos fijos.",
    },
    {
      title: "Cuatro medios de transporte",
      body: "Serie, servidor TCP, cliente TCP y UDP. Guarde y cargue las reglas junto con los ajustes de conexión y entramado en un solo archivo JSON.",
    },
    {
      title: "Dirección 127.0.0.1 en el primer arranque (desde 0.10.0)",
      body: "El «Host» del servidor TCP y de UDP empieza en 127.0.0.1 (solo este PC). Para un software de supervisión en otro PC, elija 0.0.0.0 (todos los adaptadores) o la dirección de un adaptador. Se conservan los ajustes guardados por versiones anteriores.",
    },
  ],
  steps: [
    "Elija un transporte e introduzca el puerto o la dirección",
    "«+ Añadir regla»: Cuando / Responder",
    "«Iniciar»: envíe una petición desde su software de supervisión",
  ],
  uses: [
    {
      title: "Desarrollar software antes de que llegue el hardware",
      body: "Convierta los pares petición/respuesta del manual del equipo en reglas «cuando → responde» y conecte su HMI o programa de pruebas sin el equipo real.",
    },
    {
      title: "Probar timeouts y gestión de errores",
      body: "Los retardos de respuesta (con fluctuación), la falta de respuesta cada N veces o al azar y las respuestas rotativas muestran cómo se las arregla su software con respuestas tardías o ausentes.",
    },
    {
      title: "Practicar SCPI sin instrumento",
      body: "Ejecute un servidor TCP en el 5025 con el ejemplo [SCPI *IDN? reply] y conecte PortDock SCPI a 127.0.0.1. Respuestas como «+1.2{rand 0..9}E+00» cambian en cada petición.",
    },
    {
      title: "Imitar latidos e informes de estado",
      body: "Los «Mensajes iniciados por el equipo» se envían sin petición a intervalos fijos. Los marcadores {counter}, {rand} y {time} se rellenan en cada envío.",
    },
  ],
  faq: [
    {
      q: "Llegan peticiones pero no sale ninguna respuesta",
      a: "Compruebe que la regla esté activada, que coincidan el tipo de patrón (HEX/ASCII) y «exacto/contiene», y que ninguna regla «**» esté por encima. Con «Registrar peticiones sin coincidencia» activado aparece una línea «NO MATCH»; haga clic derecho en ella para crear una regla a partir de ella.",
    },
    {
      q: "Las peticiones llegan partidas o unidas",
      a: "Las reglas comparan tramas completas. Ajuste el «Entramado» (pausa o terminador) y la pausa en ms. UDP no necesita entramado: un datagrama es una trama.",
    },
    {
      q: "¿Cómo conecto un programa del mismo PC?",
      a: "Con TCP, inicie un servidor y haga que el programa se conecte a 127.0.0.1. Con serie, use un par de COM virtuales (com0com o similar).",
    },
    {
      q: "Mi regla «*IDN?» responde a peticiones que no tienen que ver",
      a: "Con «Comodines» activado, ? y * en una regla ASCII coinciden con cualquier carácter. Deje los comodines desactivados en las reglas SCPI (es lo predeterminado en las reglas nuevas).",
    },
    {
      q: "¿Puedo llevar las reglas a otro PC?",
      a: "«Guardar reglas» almacena las reglas junto con el transporte, el puerto, la dirección, el entramado y los mensajes iniciados por el equipo en un solo archivo JSON; guarde uno por equipo o por prueba.",
    },
  ],
};
