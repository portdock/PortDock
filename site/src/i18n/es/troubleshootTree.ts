// Textos del árbol de preguntas del asistente de diagnóstico (español). La forma del árbol (id, nodo siguiente, enlaces) es la de data/troubleshoot.ts, común a todos los idiomas; aquí solo los textos por id de nodo.
// Pregunta: q · hint (solo si el árbol tiene pista) · opts (solo respuestas que no son sí/no). Resultado: title · causes · checks (mismo número y orden que el árbol). Son «causas posibles», nunca una causa confirmada.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Sí",
  no: "No",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: sin respuesta o con bytes corruptos",
    rs232: "RS-232 no comunica",
    tcp: "Un equipo Modbus TCP / Ethernet no conecta",
    usb: "El adaptador USB-serie no se detecta o se desconecta",
    ma: "La lectura de 4–20 mA parece incorrecta",
    sensor: "No entra la señal de un sensor NPN/PNP",
    mc: "El protocolo MC (Mitsubishi) no conecta",
    pcusb: "Un dispositivo USB del PC se desconecta una y otra vez",
  },
  nodes: {
    "rs485-any": { q: "¿No llega ninguna respuesta?", hint: "«No» = las respuestas llegan a veces, o llegan con bytes corruptos" },
    "rs485-txled": { q: "¿Parpadea el LED TX del adaptador al enviar una petición?", hint: "¿Sin LED? Compruebe en su lugar que los bytes enviados aparecen en el registro de PortDock Serial" },
    "rs485-settings": { q: "¿Ha comparado uno por uno la velocidad, la paridad, los bits de parada y la dirección de esclavo con la pantalla de configuración del propio equipo (o su manual)?" },
    "rs485-swap": { q: "Si intercambia los hilos A y B (D+/D−), ¿llega una respuesta?", hint: "Intercambiarlos no daña los equipos" },
    "rs485-single": { q: "Con un solo equipo conectado directamente al adaptador con un cable corto, ¿responde?" },
    "rs485-garbled": { q: "¿Los bytes recibidos parecen corruptos (errores de CRC, caracteres raros)?", hint: "«No» = los bytes parecen correctos, pero a veces faltan respuestas (tiempos de espera agotados)" },
    "rs485-slower": { q: "Al bajar la velocidad o acortar el cable, ¿se reduce la corrupción?" },
    "rs485-timeout": { q: "Con un tiempo de espera de respuesta más largo (p. ej., 1000 ms), ¿faltan menos respuestas?" },
    "r-rs485-port": {
      title: "La petición no sale del PC: lado del puerto o del driver",
      causes: [
        "Está abierto un número de COM equivocado (cambia al pasar el adaptador a otro puerto USB)",
        "Otro programa (SCADA, un terminal usado antes) sigue ocupando el puerto",
        "Problema de driver (signo de advertencia o código de problema en el Administrador de dispositivos)",
        "El adaptador no cambia de sentido automáticamente para RS-485 a 2 hilos",
      ],
      checks: [
        "Busque el número de COM del adaptador en «Puertos (COM y LPT)» del Administrador de dispositivos y hágalo coincidir con el programa",
        "Lea el driver y el código de problema del puerto en Port Inspector, y ejecute la prueba de eco de RS-485 a 2 hilos para ver si se transmite algo",
        "Con el multímetro (V⎓) entre A y B, al enviar peticiones repetidamente la lectura debe saltar; si no se mueve, no se transmite nada",
      ],
    },
    "r-rs485-settings": {
      title: "Es probable que la configuración de comunicación no coincida",
      causes: [
        "La velocidad o la paridad no coinciden (p. ej., equipo 8E1, programa 8N1)",
        "La dirección de esclavo no coincide, o se usa la 0 (difusión): las difusiones no tienen respuesta",
        "El protocolo del equipo no es Modbus RTU (protocolo propio o ASCII), o se cambió la configuración sin guardarla y reiniciar",
      ],
      checks: [
        "Anote los parámetros de comunicación de la pantalla del equipo y compárelos línea a línea con el programa",
        "En variadores, revise también los parámetros de «origen de la orden de marcha» y «selección de protocolo»",
        "Si no conoce la velocidad, haga un barrido con Modbus Master: escaneo de direcciones de esclavo, y velocidad/paridad con «búsqueda de parámetros de línea» (desde 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "Los rótulos A/B (+/−) estaban invertidos",
      causes: [
        "Los fabricantes no coinciden en cuál de A/B es + (la especificación Modbus dice D1 = B = +, D0 = A = −)",
        "Puede que solo algunos equipos estén invertidos: si otros dejan de responder tras el cambio, revise sus rótulos",
      ],
      checks: [
        "Con alimentación y el sondeo detenido: roja en B (D1·+), negra en A (D0·−); con polarización debe leer +200 mV o más",
        "Anote el cambio en el diagrama de cableado para que nadie lo vuelva a invertir",
      ],
    },
    "r-rs485-bus": {
      title: "Un equipo solo funciona, pero no en el bus: cableado o topología del bus",
      causes: [
        "Tres o más terminaciones (el interruptor de un equipo intermedio activado), o ninguna",
        "Dos equipos comparten dirección de esclavo y responden a la vez, corrompiéndose entre sí",
        "Derivaciones largas o cableado en estrella, o un corte en un borne intermedio",
        "Falta el hilo SG (común) y los equipos alejados quedan fuera del rango de modo común",
      ],
      checks: [
        "Todo sin alimentación, resistencia A–B: unos 60 Ω (ambos extremos), unos 120 Ω (un extremo), de cientos de Ω a varios kΩ o más (ninguna; muchos equipos o resistencias de polarización visibles la bajan a cerca de 1 kΩ), 40 Ω o menos (demasiadas). La terminación RC (1 nF + 120 Ω) no se ve en CC y se lee como «ninguna»",
        "Con alimentación: A–SG y B–SG entre −7 y +12 V",
        "Vuelva a conectar los equipos uno a uno para ver dónde falla; haga una lista de todas las direcciones de esclavo",
      ],
    },
    "r-rs485-device": {
      title: "Falla incluso con un solo equipo: configuración del equipo, puerto de comunicación o adaptador",
      causes: [
        "La configuración del equipo no se guardó, o solo se aplica tras reiniciar",
        "La comunicación está en una tarjeta opcional o en otros bornes, o hay un ajuste de modo 2/4 hilos",
        "Adaptador averiado, o conectado a los bornes de RS-422/RS-232 en lugar de RS-485",
      ],
      checks: [
        "Pruebe el adaptador solo con la prueba de eco de RS-485 a 2 hilos de Port Inspector",
        "Pruebe el mismo equipo con otro adaptador u otro PC",
        "Busque en el manual del equipo los números de los bornes de comunicación y cuándo se aplica la nueva configuración",
      ],
    },
    "r-rs485-signal": {
      title: "Calidad de la señal: reflexiones, ruido, longitud",
      causes: [
        "Sin terminación o solo en un extremo: reflexiones en líneas largas y rápidas",
        "Cable demasiado largo para la velocidad (aproximadamente baudios × metros ≤ 10^8)",
        "No es par trenzado, va junto a cables de potencia o la pantalla no está a tierra",
      ],
      checks: [
        "Sin alimentación: A–B unos 60 Ω",
        "Modo común A–SG y B–SG entre −7 y +12 V, también con los motores en marcha",
        "Compruebe el límite de longitud para esta velocidad en la calculadora RS-485",
      ],
    },
    "r-rs485-framing": {
      title: "Tramas desalineadas: configuración, eco o división",
      causes: [
        "Velocidad o paridad ligeramente distintas (algunos bytes pueden parecer correctos)",
        "Un adaptador a 2 hilos devuelve el eco de la petición, que aparece delante de la respuesta",
        "La latencia del USB parte una respuesta en dos y el receptor las analiza por separado",
      ],
      checks: [
        "Pegue los bytes recibidos en el decodificador de tramas Modbus y revise la dirección, la función y el CRC",
        "Revise el eco del adaptador y el temporizador de latencia de FTDI en Port Inspector",
      ],
    },
    "r-rs485-timing": {
      title: "Tiempos demasiado ajustados: tiempo de espera, intervalo de sondeo, latencia USB",
      causes: [
        "Tiempo de espera menor que el tiempo de respuesta del equipo (variadores y medidores pueden tardar de decenas a cientos de ms)",
        "La siguiente petición se envía demasiado pronto y se solapa con la respuesta anterior",
        "El temporizador de latencia del adaptador USB (16 ms por defecto en FTDI) se suma a cada trama corta",
      ],
      checks: [
        "Calcule el tiempo de petición/respuesta y el tiempo de espera mínimo con la calculadora de tiempos serie",
        "Lea el valor del temporizador de latencia con Port Inspector",
      ],
    },
    "r-rs485-idle": {
      title: "La línea flota en reposo o las respuestas chocan: polarización o direcciones",
      causes: [
        "Sin resistencias de polarización (fail-safe), el ruido en reposo se lee como bytes",
        "Dos equipos con la misma dirección chocan de vez en cuando",
        "Ruido solo con motores o variadores en marcha (pantalla, tierra)",
      ],
      checks: [
        "Con alimentación y el sondeo detenido: diferencial B–A de +200 mV o más",
        "Ponga todos los equipos y direcciones en un diagrama de sistema para detectar repeticiones",
        "Compare cuándo faltan respuestas con cuándo funcionan los motores",
      ],
    },
    "rs232-seen": { q: "¿Aparece el puerto COM en el Administrador de dispositivos del PC?", hint: "Con un adaptador USB-RS232, «No» continúa por la rama de detección del adaptador" },
    "rs232-loop": { q: "Con los pines 2 (RXD) y 3 (TXD) del DB9 del lado del PC puenteados (loopback), ¿vuelven los caracteres enviados?" },
    "rs232-cross": { q: "¿Está el TX del equipo conectado al RX del PC (pin 2) y el TX del PC (pin 3) al RX del equipo, es decir, cruzados?", hint: "¿No está seguro? Elija «No» para ver cómo comprobarlo" },
    "rs232-flow": { q: "¿Está el control de flujo en «Ninguno» tanto en el programa como en el equipo?" },
    "r-rs232-pc": {
      title: "Bloqueado en el puerto del PC o en el adaptador",
      causes: [
        "Otro programa ocupa el puerto, o está abierto un número de COM equivocado",
        "Adaptador o puerto averiado, problema de driver",
        "Pines equivocados puenteados (el loopback es entre los pines 2 y 3)",
      ],
      checks: [
        "En reposo, pin 3 (TXD) a pin 5 (GND) lee de −5 a −15 V (de −3 a −5 V es débil: conviene revisarlo)",
        "Ejecute la prueba de loopback de Port Inspector y compruebe que los bytes vuelven a cada velocidad",
      ],
    },
    "r-rs232-cross": {
      title: "Puede que TX esté conectado con TX: cable cruzado o directo",
      causes: [
        "El PC y el equipo son ambos DTE, pero se usa un cable directo (TX–TX): hace falta un cable null modem (cruzado)",
        "O el equipo es DCE y se usa un cable cruzado",
      ],
      checks: [
        "En cada conector, el pin que muestra de −5 a −15 V en reposo (de −3 a −5 V si es débil) es el TX de ese lado; si los dos TX comparten un hilo, están chocando",
        "Use el modo de continuidad a lo largo del cable para ver si 2↔3 están cruzados",
      ],
    },
    "r-rs232-flow": {
      title: "El control de flujo no coincide",
      causes: [
        "El control de flujo por hardware (RTS/CTS) está activado, pero CTS no está cableado, así que el PC espera indefinidamente",
        "El equipo necesita DTR/DSR activos, pero se usa un cable de solo 3 hilos",
      ],
      checks: [
        "Ponga el control de flujo en «Ninguno» en el programa y vuelva a probar",
        "Si el equipo exige handshake, puentee RTS–CTS (7–8) y DTR–DSR–DCD (4–6–1) dentro del conector, o use un cable con handshake completo",
      ],
    },
    "r-rs232-settings": {
      title: "El cableado parece correcto: configuración, formato de comando o nivel de señal",
      causes: [
        "La velocidad, los bits de datos, la paridad o los bits de parada no coinciden",
        "El fin de línea (CR, LF, CR LF) o la suma de comprobación no son los que espera el equipo",
        "El puerto del equipo es una UART TTL (3.3/5 V), no RS-232",
      ],
      checks: [
        "Si el TX del equipo está en reposo a +3.3 o +5 V, es TTL: no lo conecte directamente a un puerto RS-232",
        "Envíe y reciba en HEX y compare los fines de línea y las sumas de comprobación byte a byte",
      ],
    },
    "tcp-ping": { q: "¿Responde el equipo al ping desde el PC?" },
    "tcp-subnet": { q: "¿Están las IP del PC y del equipo en la misma subred? (p. ej., 192.168.0.10/24 y 192.168.0.50)" },
    "tcp-link": { q: "¿Están encendidos los LED de enlace en los puertos LAN del PC y del equipo (o del switch)?" },
    "tcp-502": { q: "¿Puede abrir una conexión TCP al puerto 502 (o al puerto del manual)?", hint: "Pruebe a conectar con PortDock TCP, o con PowerShell Test-NetConnection <IP> -Port 502" },
    "tcp-reply": { q: "Una vez conectado, ¿recibe respuesta una petición?" },
    "tcp-exception": { q: "¿La respuesta es una excepción (código de función + 0x80, p. ej., 83 02)?", hint: "«No» = llegan respuestas, pero los valores parecen incorrectos" },
    "r-tcp-subnet": {
      title: "Subredes IP distintas",
      causes: [
        "Las partes de red no coinciden, así que no se alcanzan sin una puerta de enlace",
        "No se conoce la IP del equipo (la de fábrica o DHCP)",
      ],
      checks: [
        "Introduzca las dos IP y máscaras en la calculadora de subredes para ver si comparten subred",
        "Añada al adaptador del PC una segunda IP en la subred del equipo (p. ej., 192.168.0.200/24)",
        "Si no conoce la IP, búsquela con Net Scan",
      ],
    },
    "r-tcp-link": {
      title: "Sin enlace físico: cable, puerto o switch",
      causes: [
        "Cable o conector roto, o conectado a otro puerto",
        "Switch sin alimentación o con el puerto desactivado, o el puerto LAN del equipo desactivado",
      ],
      checks: [
        "Cambie el cable y el puerto del switch",
        "Lea el enlace, la velocidad y el dúplex con «Leer adaptadores» de Port Inspector",
      ],
    },
    "r-tcp-noping": {
      title: "Hay enlace, pero no responde al ping",
      causes: [
        "El equipo está configurado para no responder al ping (ICMP): pruebe directamente la conexión al 502",
        "Dos equipos comparten la misma IP (conflicto de direcciones)",
        "Otro adaptador del PC (p. ej., Wi-Fi) está en la misma subred y el tráfico sale por él; cortafuegos",
      ],
      checks: [
        "Desconecte el equipo y haga ping: si hay respuesta, otro equipo tiene esa IP",
        "Recorra la subred con Net Scan para ver IP y MAC; busque IP repetidas en un diagrama de sistema",
        "Desactive temporalmente los demás adaptadores y vuelva a probar",
      ],
    },
    "r-tcp-port": {
      title: "El ping funciona, pero el puerto 502 rechaza la conexión",
      causes: [
        "Modbus TCP está desactivado en el equipo o es una opción (tarjeta o licencia aparte)",
        "El puerto no es el 502",
        "Se ha alcanzado el límite de conexiones (ya hay un SCADA o HMI conectado)",
      ],
      checks: [
        "Compruebe en el manual la configuración de Modbus TCP, el puerto y el máximo de conexiones",
        "Desconecte un momento los demás clientes y vuelva a conectar",
      ],
    },
    "r-tcp-unitid": {
      title: "Conectado, pero sin respuesta: identificador de unidad o pasarela",
      causes: [
        "Identificador de unidad incorrecto: detrás de una pasarela debe ser la dirección de esclavo RTU; en equipos directos, use el valor del manual (1 o 255 son habituales)",
        "Falla el lado RTU de la pasarela (velocidad, cableado): descarta la petición o devuelve la excepción 0B",
        "Un código de función que el equipo no admite",
      ],
      checks: [
        "Decodifique los bytes intercambiados en el decodificador de tramas Modbus para ver el MBAP y el identificador de unidad",
      ],
    },
    "r-tcp-exception": {
      title: "El equipo responde con una excepción: dirección, función o cantidad",
      causes: [
        "Excepción 02: no existe la dirección; la notación 40001 no se ha pasado a dirección desde 0 (desfase de uno)",
        "Excepción 01: función no admitida (p. ej., leer registros de entrada con la 03)",
        "Excepción 03: cantidad mayor de 125 o del límite del equipo",
      ],
      checks: [
        "Pegue la respuesta en el decodificador de tramas Modbus para ver el significado de la excepción",
        "Compruebe si el mapa de registros usa direcciones desde 0 o desde 1",
      ],
    },
    "r-tcp-values": {
      title: "La comunicación funciona, pero los valores parecen incorrectos: formato, orden o escala",
      causes: [
        "El orden de palabras de los valores de 32 bits (float, int32) no coincide (ABCD, CDAB…)",
        "No se ha aplicado la escala (×0.1, ×0.01), el signo (int16/uint16) o la relación del TC",
        "Dirección desplazada en uno (desde 0 o desde 1)",
      ],
      checks: [
        "Ponga los dos registros en el conversor de flotantes Modbus y compare los cuatro órdenes",
        "Compare con signo y sin signo en el conversor de enteros",
      ],
    },
    "usb-sound": { q: "Al conectar el adaptador, ¿suena el aviso de conexión de Windows o cambia el Administrador de dispositivos?" },
    "usb-com": { q: "¿Aparece en «Puertos (COM y LPT)» con un número de COM?", hint: "«No» = aparece en «Otros dispositivos», con un signo de advertencia o como desconocido" },
    "usb-drops": { q: "¿Se desconecta durante el uso (el puerto desaparece y vuelve)?" },
    "usb-motor": { q: "¿Se desconecta cuando arrancan o funcionan cargas grandes como motores, variadores o soldadoras?" },
    "usb-comnum": { q: "¿Cambia el número de COM cada vez que lo conecta, o salta a números altos como COM15?", hint: "«No» = se detecta y conecta, pero la comunicación es lenta o las respuestas llegan partidas" },
    "r-usb-none": {
      title: "No se ve en absoluto como dispositivo USB: cable, puerto o adaptador",
      causes: [
        "Un cable USB solo de carga (sin hilos de datos)",
        "Problema de conexión o de alimentación del puerto frontal o del hub",
        "Adaptador averiado",
      ],
      checks: [
        "Conéctelo directamente a un puerto trasero sin hub, con otro cable",
        "Mire si en otro PC ocurre lo mismo",
        "Compruebe si la conexión queda registrada en el registro de conexión/desconexión USB de Hardware Tester (desde 0.10.0)",
      ],
    },
    "r-usb-driver": {
      title: "Falta el driver o el dispositivo no puede iniciarse",
      causes: [
        "No hay driver instalado para el chip (FTDI, CH34x, CP210x, PL2303)",
        "El driver rechaza el chip (código 10, etc.): habitual con PL2303 antiguos",
      ],
      checks: [
        "Lea VID:PID, el nombre del chip y el código de problema con su significado en Port Inspector",
        "Use el driver de la web del fabricante del chip (pida ayuda a informática si hacen falta permisos de administrador)",
      ],
    },
    "r-usb-emi": {
      title: "Ruido o diferencia de tierra que entra en el USB",
      causes: [
        "Con un adaptador no aislado, la diferencia de potencial entre la tierra del equipo y la del PC reinicia el USB",
        "El cable de comunicación o USB va junto a cables de potencia",
      ],
      checks: [
        "Tensión entre la carcasa USB del PC y el SG/PE del equipo (V⎓ y V~): menos de 1 V es lo habitual; 7 V o más es un problema",
        "Pruebe un adaptador aislado, un cable USB más corto o ferritas",
        "Compare las horas de desconexión USB de Hardware Tester con las horas de marcha de los motores (desde 0.10.0)",
      ],
    },
    "r-usb-power": {
      title: "Ahorro de energía, alimentación o contacto",
      causes: [
        "Suspensión selectiva de USB, o «Permitir que el equipo apague este dispositivo para ahorrar energía»",
        "Un hub alimentado por el bus que se queda corto de alimentación, o un conector flojo",
      ],
      checks: [
        "Lea la configuración de ahorro de energía y el historial reciente de conexiones con Port Inspector (solo lectura: cámbielos usted en Windows)",
        "Mire si al mover el cable se produce una desconexión",
      ],
    },
    "r-usb-comnum": {
      title: "El número de COM cambia: ubicación del puerto, número de serie, reservas",
      causes: [
        "Los chips sin número de serie (CH34x, etc.) reciben un número nuevo en cada puerto USB",
        "Los dispositivos conectados antes mantienen números reservados (ComDB)",
      ],
      checks: [
        "Use siempre el mismo puerto USB",
        "Consulte las reservas de números de COM en Port Inspector",
        "PortDock Serial vuelve a abrir el mismo dispositivo aunque cambie su número",
      ],
    },
    "r-usb-latency": {
      title: "Conectado, pero lento o con respuestas partidas: latencia USB",
      causes: [
        "El temporizador de latencia de FTDI (16 ms por defecto) añade retardo a cada trama corta",
        "El programa trata cada fragmento como una respuesta distinta",
        "Si no hay ninguna comunicación, siga por la rama de RS-485 o RS-232",
      ],
      checks: [
        "Revise el temporizador de latencia y el tiempo de ida y vuelta del loopback en Port Inspector",
        "Compárelo con el tiempo de respuesta esperado de la calculadora de tiempos serie",
      ],
    },
    "ma-kind": { q: "¿Cómo se ve mal el valor?", opts: ["Fijo en 0 (o en el mínimo)", "Fijo en el máximo", "Fluctúa o salta", "Se mueve, pero no coincide con la realidad"] },
    "ma-flow": { q: "Con un multímetro (mA) en serie en el lazo, ¿circulan más de 3.6 mA?" },
    "ma-volt": { q: "¿Hay tensión (normalmente 10 V o más) entre los bornes + y − del transmisor?" },
    "ma-high": { q: "¿La corriente medida es de 21 mA o más?" },
    "ma-motor": { q: "¿Aumenta la fluctuación con motores o variadores en marcha?" },
    "ma-loopv": { q: "Cerca de 20 mA, ¿sigue la tensión en bornes del transmisor por encima de la tensión mínima de funcionamiento de su manual?" },
    "r-ma-open": {
      title: "Ni corriente ni tensión en el lazo: circuito abierto o alimentación",
      causes: [
        "Hilo cortado, borne flojo o fusible",
        "Fuente del lazo (24 V) apagada o conectada a otro sitio",
        "Un transmisor a 4 hilos (alimentación separada) conectado como uno a 2 hilos, así que no recibe alimentación",
      ],
      checks: [
        "Mida los 24 V en la fuente y después en el transmisor para ver dónde desaparecen",
        "Compare el cableado real con los esquemas de 2/3/4 hilos",
      ],
    },
    "r-ma-tx": {
      title: "Hay tensión, pero no corriente: transmisor o polaridad",
      causes: [
        "Polaridad invertida a 2 hilos (+ y − intercambiados)",
        "La entrada receptora está en modo tensión, lo que en la práctica abre el lazo",
        "Transmisor averiado",
      ],
      checks: [
        "Vuelva a comprobar el + y el − del transmisor con el esquema del manual",
        "Compruebe la configuración o el puente del tipo de canal (corriente/tensión) de la tarjeta de entradas",
      ],
    },
    "r-ma-input": {
      title: "Circula corriente, pero el valor es 0: configuración del lado receptor o escala",
      causes: [
        "Rango de entrada configurado de otra forma (0–20 mA, 1–5 V, 0–10 V)",
        "Se está mirando otro canal, o el escalado está a 0",
        "Con 3.6 mA o menos el transmisor señala un fallo NE 43 (3.6–3.8 mA es bajo rango, no señal de fallo)",
      ],
      checks: [
        "Introduzca los mA medidos en el comprobador del multímetro para ver el % y la zona NE 43",
        "Compare con las cuentas esperadas (p. ej., 0–27648) en la calculadora de 4–20 mA",
      ],
    },
    "r-ma-fault-high": {
      title: "21 mA o más: señal de fallo o cortocircuito",
      causes: [
        "El transmisor da la señal de fallo alta de NE 43 (p. ej., sensor roto)",
        "Muy por encima de 25 mA: la fuente puentea el transmisor (cortocircuito)",
      ],
      checks: [
        "Revise la pantalla o el diagnóstico del transmisor",
        "Mida la resistencia del sensor (p. ej., Pt100) para ver si está abierto",
      ],
    },
    "r-ma-over": {
      title: "Fijo en el máximo: configuración del rango o valor real",
      causes: [
        "El rango de escalado del PLC es más estrecho que el del transmisor",
        "El valor de proceso supera el rango del transmisor (p. ej., 0–10 bar)",
        "Confusión de unidades (bar, psi, kPa)",
      ],
      checks: [
        "Calcule el % a partir de los mA medidos y compárelo con el valor del PLC",
        "Compruebe el rango en la placa de características o la configuración del transmisor",
      ],
    },
    "r-ma-noise": {
      title: "Ruido: pantalla, tierra o recorrido del cable",
      causes: [
        "El cable de señal comparte canaleta con cables de potencia",
        "Pantalla a tierra en ambos extremos, formando un lazo de tierra (normalmente solo en un extremo)",
        "Diferencia de potencial de tierra entre el transmisor y el PLC",
      ],
      checks: [
        "Mida la tensión entre las dos tierras (menos de 1 V es lo habitual)",
        "Anote la oscilación en mA; valore un aislador de señal",
        "Reduzca la fluctuación con una constante de tiempo de filtro de entrada (filtro RC)",
      ],
    },
    "r-ma-loadv": {
      title: "Tensión del lazo demasiado baja: resistencia de carga o caída de la fuente",
      causes: [
        "Demasiados receptores, indicadores o barreras en el lazo",
        "Cableado largo o fino, caída de la fuente de 24 V",
      ],
      checks: [
        "Use la calculadora de carga del lazo para ver la tensión del transmisor a 20 mA (o 21 mA)",
        "Mida la fuente de 24 V con carga (una caída del 5 % o menos deja margen)",
      ],
    },
    "r-ma-process": {
      title: "Cableado y tensión parecen correctos: variación real del proceso o amortiguación",
      causes: [
        "El valor de proceso fluctúa de verdad (pulsación de bomba, etc.)",
        "Amortiguación del transmisor o filtro de entrada del PLC demasiado cortos",
      ],
      checks: [
        "Registre el valor en un gráfico temporal y busque patrones periódicos",
        "Revise la configuración de amortiguación del transmisor",
      ],
    },
    "r-ma-scale": {
      title: "El valor no coincide con la realidad: escalado, unidades o cuentas",
      causes: [
        "El rango de ingeniería (mínimo/máximo) no coincide con la configuración del transmisor",
        "Rango de cuentas del PLC equivocado (0–27648, 0–4000, 0–32000)",
        "Confusión de unidades (bar/psi, relativa/absoluta)",
      ],
      checks: [
        "Introduzca los mA medidos en la calculadora de 4–20 mA y compárelos con el valor y las cuentas esperados",
        "Compruebe que el valor del PLC es proporcional a 4, 12 y 20 mA",
      ],
    },
    "sn-kind": { q: "¿Cuál es el síntoma?", opts: ["La entrada nunca se activa", "La entrada nunca se desactiva (siempre activa)"] },
    "sn-led": { q: "¿Se enciende el LED indicador del propio sensor cuando hay un objeto delante?" },
    "sn-power": { q: "¿Está la tensión entre el marrón (+) y el azul (0 V) del sensor cerca de la de la fuente (normalmente 24 V)?" },
    "sn-type": { q: "¿Coinciden el tipo de sensor y el COM de entradas del PLC: COM a +24 V para NPN, a 0 V para PNP?", hint: "¿No está seguro? Elija «No»" },
    "sn-vin": { q: "Con el sensor activado, ¿hay 15 V o más entre el borne de entrada del PLC y el COM de entradas?" },
    "sn-plcled": { q: "¿Se enciende en ese momento el LED de la entrada del PLC?" },
    "r-sn-power": {
      title: "No llega alimentación al sensor",
      causes: [
        "Hilo de alimentación cortado, contacto del conector o fusible",
        "Los colores de los hilos no siguen la convención (marrón +, azul 0 V, negro salida)",
        "Caída de tensión hasta un sensor alejado",
      ],
      checks: [
        "Mida la tensión de alimentación en el sensor con las cargas activadas: una caída de más del 15 % es un problema",
        "Compruebe los colores de los hilos y el rango de alimentación en la hoja de datos del sensor",
      ],
    },
    "r-sn-sense": {
      title: "Tiene alimentación, pero no detecta: ajuste del sensor u objeto",
      causes: [
        "Distancia de detección o sensibilidad, material del objeto (el alcance de los inductivos depende del tipo de metal)",
        "Sensor fotoeléctrico desalineado o con la lente sucia",
        "Sensor averiado",
      ],
      checks: [
        "Acerque el objeto para ver a qué distancia se enciende el LED",
        "Cámbielo por un sensor del mismo tipo",
      ],
    },
    "r-sn-mismatch": {
      title: "Puede que no coincidan NPN/PNP y la polaridad del COM de entradas",
      causes: [
        "Sensor NPN con el COM de entradas a 0 V (o PNP con +24 V): la corriente no tiene camino",
        "Los fabricantes usan «sink/source» en sentidos opuestos",
      ],
      checks: [
        "Con el sensor activado, negro–azul lee cerca de 0 V en NPN y cerca de la alimentación en PNP",
        "Compruebe en el esquema de conexión de entradas del manual del PLC a dónde va el COM",
      ],
    },
    "r-sn-wire": {
      title: "El sensor se activa, pero no llega tensión a la entrada: cableado",
      causes: [
        "Hilo de salida conectado a otra entrada, o cortado en una regleta intermedia",
        "Falta el hilo del COM de entradas",
        "Tensión residual del sensor alta, o corriente de salida demasiado baja para la entrada",
      ],
      checks: [
        "Mida negro–azul con el sensor activado y desactivado e introduzca ambos valores en el comprobador",
        "Entrada del PLC a COM: ON 15 V o más (tipo 1), OFF 5 V o menos",
      ],
    },
    "r-sn-input": {
      title: "Llega tensión, pero el PLC no lee ON: tarjeta de entradas",
      causes: [
        "Alimentación o avería de la tarjeta de entradas, o se está mirando otra ranura",
        "Tensión de entrada cerca del umbral (11–15 V): una entrada de tipo 1 puede quedarse en OFF",
      ],
      checks: [
        "Pase el sensor a un canal vecino",
        "Compruebe la tensión y la corriente de ON en el manual de la tarjeta de entradas",
      ],
    },
    "r-sn-program": {
      title: "La entrada sí se activa: dirección, filtro o duración del pulso",
      causes: [
        "El programa lee otra dirección de entrada (numeración X en octal o en hexadecimal)",
        "Señal más corta que el tiempo de filtro de entrada (objeto que pasa rápido)",
        "Si se lee por comunicación, el cálculo de la dirección de bit está mal",
      ],
      checks: [
        "Vigile directamente ese bit de entrada en el monitor del PLC",
        "Con protocolo MC, compruebe la notación del número de dispositivo",
      ],
    },
    "r-sn-stuck": {
      title: "La entrada nunca se desactiva: fuga, cortocircuito o modo de salida",
      causes: [
        "La fuga en OFF de un sensor de 2 hilos mantiene la entrada activada",
        "Hilo de salida en cortocircuito con +24 V (PNP) o 0 V (NPN)",
        "Modo de salida del sensor (NA/NC, light-on/dark-on) invertido",
      ],
      checks: [
        "Con el sensor desactivado, la entrada del PLC a COM debe ser de 5 V o menos",
        "Mire si la entrada se desactiva al desconectar el hilo de salida",
      ],
    },
    "mc-ping": { q: "¿Responde el PLC al ping desde el PC?", hint: "«No» continúa por la rama de Ethernet (subred IP)" },
    "mc-port": { q: "¿Hay una conexión de protocolo MC (SLMP) abierta en la configuración Ethernet del PLC, con número de puerto, TCP/UDP y binario/ASCII iguales a los del programa?" },
    "mc-endcode": { q: "¿El código de fin de la respuesta es distinto de cero (p. ej., C059)?" },
    "mc-noreply": { q: "¿Está abierta la conexión, pero nunca llega respuesta (tiempo de espera agotado)?", hint: "«No» = llegan respuestas, pero los valores parecen incorrectos" },
    "r-mc-port": {
      title: "Configuración de la conexión de protocolo MC en el PLC",
      causes: [
        "No hay ninguna conexión de protocolo MC (SLMP) configurada, o la configuración no se escribió en el PLC y no se reinició",
        "El número de puerto, TCP/UDP o el código (binario/ASCII) no coinciden con el programa",
        "Otro programa ya usa la misma conexión TCP",
      ],
      checks: [
        "Pruebe primero el lado del programa contra PortDock PLC Simulator en 127.0.0.1, sin PLC",
        "Escriba la configuración Ethernet de la herramienta de ingeniería junto a los valores del programa y compárelas",
      ],
    },
    "r-mc-endcode": {
      title: "El PLC rechaza la petición con un código de fin",
      causes: [
        "Comando o subcomando no admitido por el modelo de PLC",
        "Código o número de dispositivo fuera de rango, o demasiados puntos",
        "Ajustes del lado del PLC, como la protección contra escritura en RUN",
      ],
      checks: [
        "Pegue la respuesta en el decodificador del protocolo MC para ver el significado del código de fin",
        "Siga el orden de comprobación de la guía de códigos de fin",
      ],
    },
    "r-mc-frame": {
      title: "El formato de trama no coincide, así que el PLC no responde",
      causes: [
        "La trama 3E/4E o binario/ASCII no coinciden con la configuración del PLC",
        "Valores de cabecera (n.º de red, n.º de PC, módulo de destino) o longitud de datos incorrectos",
        "Se usa UDP cuando el PLC espera TCP (o al revés)",
      ],
      checks: [
        "Decodifique campo a campo los bytes enviados en el decodificador del protocolo MC",
      ],
    },
    "r-mc-values": {
      title: "Llegan respuestas, pero los valores parecen incorrectos: números de dispositivo o unidades",
      causes: [
        "X e Y son hexadecimales, pero se introdujeron en decimal",
        "Confusión entre lectura en unidades de bit y en unidades de palabra",
        "Orden de palabras o signo de los valores de 32 bits",
      ],
      checks: [
        "Compare con la tabla de notación de la guía de números de dispositivo",
        "Compare signo y hex en el conversor de enteros",
      ],
    },
    "pu-know": { q: "¿Sabe qué dispositivo se desconecta?", hint: "Si solo oye repetirse el sonido de conexión/desconexión, elija «No»" },
    "pu-port": { q: "¿Se sigue desconectando en otro puerto USB (panel trasero, sin hub)?" },
    "pu-cable": { q: "¿Se sigue desconectando con otro cable?" },
    "pu-suspend": { q: "Al desactivar el ahorro de energía USB (suspensión selectiva, «permitir apagar»), ¿ocurre menos?", hint: "PortDock solo los lee: cámbielos usted en la configuración de Windows" },
    "r-pu-find": {
      title: "Primero averigüe qué dispositivo se desconecta",
      causes: [
        "Aún se desconoce: puede ser un ratón, un teclado, un receptor inalámbrico, una cámara, un adaptador USB-serie o un hub",
      ],
      checks: [
        "Use el registro de conexión/desconexión USB de Hardware Tester (desde 0.10.0) para ver horas, nombre del dispositivo y VID:PID",
        "Un dispositivo que se desconecta 3 o más veces en 10 minutos se marca como «posibles desconexiones repetidas»; después siga de nuevo esta rama para él",
      ],
    },
    "r-pu-port": {
      title: "El puerto o hub original",
      causes: [
        "Cableado interno o contacto del puerto frontal",
        "Hub alimentado por el bus que se queda corto de alimentación",
      ],
      checks: [
        "Use un puerto trasero o un hub con alimentación propia",
        "Confirme con el registro de conexión/desconexión USB de Hardware Tester que las desconexiones cesaron al cambiar de puerto (desde 0.10.0)",
      ],
    },
    "r-pu-cable": {
      title: "Cable o conector",
      causes: [
        "Corte interno en el cable (se desconecta al moverlo), conector flojo",
        "Cable USB o alargador demasiado largo",
      ],
      checks: [
        "Use un cable corto y de buena calidad",
      ],
    },
    "r-pu-suspend": {
      title: "El ahorro de energía USB apaga el dispositivo",
      causes: [
        "Suspensión selectiva de USB, o «permitir que el equipo apague» en el dispositivo o el hub",
      ],
      checks: [
        "Lea la suspensión selectiva de USB con «Leer la configuración de este PC» de Port Inspector",
        "En un PC de máquina, revise también la suspensión del plan de energía",
      ],
    },
    "r-pu-device": {
      title: "Dispositivo, driver o entorno",
      causes: [
        "El propio dispositivo o su driver",
        "Un dispositivo USB 3 funcionando a velocidad USB 2.0 (señal de problemas de cable o puerto)",
        "En receptores inalámbricos, interferencias de 2.4 GHz cerca de puertos USB 3.0",
        "Diferencia de tierra o ruido de los equipos (instalaciones industriales)",
      ],
      checks: [
        "Mire si se desconecta en otro PC",
        "Busque las marcas «Conviene revisarlo» de velocidad USB de Hardware Tester (desde 0.10.0)",
        "Mida la tensión entre la tierra del PC y la de los equipos",
      ],
    },
  },
} satisfies TreeText;
