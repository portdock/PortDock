// lib/wiring.ts — textos del diagrama de cableado, lista de comprobación y avisos (frase en inglés → español). Los usa el script de la página
// Términos: resistencia de terminación, polarización (fail-safe), dirección de esclavo, conexión en cadena (daisy chain), derivación, cable null modem, diodo de rueda libre
export default {
  "{} m — the Modbus spec allows at most 1000 m at 9600 bps with AWG26 or thicker (shorter than the general TIA-485 1200 m). Use thicker cable or split with a repeater.":
    "{0} m: la especificación Modbus admite como máximo 1000 m a 9600 bps con cable AWG26 o más grueso (menos que los 1200 m generales de TIA-485). Use un cable más grueso o divida la línea con un repetidor.",
  "Device 1":
    "Equipo 1",
  "Device {}":
    "Equipo {0}",
  "Inverter {}":
    "Variador {0}",
  "Master":
    "Maestro",
  "Slave ID {}":
    "Dirección {0}",
  "Bias on (one place)":
    "Polarización activada (en un solo punto)",
  "Bias":
    "Polarización",
  "Daisy chain — total length about {} m · {} bps 8{}1":
    "Conexión en cadena: longitud total de unos {0} m · {1} bps 8{2}1",
  "D1 (B, +) — one wire of the twisted pair":
    "D1 (B, +): un hilo del par trenzado",
  "D0 (A, −) — the other wire of the pair":
    "D0 (A, −): el otro hilo del par",
  "Common (SG, signal ground)":
    "Común (SG, tierra de señal)",
  "Bias pull-up (+5 V)":
    "Pull-up de polarización (+5 V)",
  "{} m — one RS-485 segment is generally limited to about 1200 m. Split it with a repeater.":
    "{0} m: un segmento RS-485 suele limitarse a unos 1200 m. Divídalo con un repetidor.",
  "At {} bps the rough limit is about {} m (rule of thumb bps × m ≤ 10⁸). Lower the baud rate or shorten the line.":
    "A {0} bps el límite aproximado es de unos {1} m (regla práctica bps × m ≤ 10⁸). Baje la velocidad o acorte la línea.",
  "Slave ID {} is used twice — every ID on one bus must be different.":
    "La dirección de esclavo {0} está repetida: todas las direcciones de un bus deben ser distintas.",
  "«{}» ID {} — Modbus slave IDs are 1–247.":
    "«{0}» dirección {1}: las direcciones de esclavo Modbus van de 1 a 247.",
  "«{}» supports only {} bps per the device map.":
    "Según el mapa de equipos, «{0}» solo admite {1} bps.",
  "«{}» defaults to parity {} — the whole bus needs one setting (check whether the device can change it).":
    "La paridad por defecto de «{0}» es {1}: todo el bus necesita la misma configuración (compruebe si el equipo permite cambiarla).",
  "«{}» accepts IDs {}–{}.":
    "«{0}» acepta direcciones de {1} a {2}.",
  "The adapter ({}/{}) and devices ({}/{}) use different names — connect the same signal (D1 to D1, D0 to D0), not the same letter.":
    "El convertidor ({0}/{1}) y los equipos ({2}/{3}) usan nombres distintos: conecte la misma señal (D1 con D1, D0 con D0), no la misma letra.",
  "Only {} devices are drawn.":
    "Solo se dibujan {0} equipos.",
  "Terminate only at the two ends of the line (here the adapter and «{}»). With biasing the Modbus spec recommends 150 Ω (0.5 W) or 1 nF + 120 Ω in series (0.25 W, RC termination — it draws less bias current at idle); a plain 120 Ω is also common practice. If a device has a termination switch, use it instead of adding an external resistor.":
    "Termine solo en los dos extremos de la línea (aquí el convertidor y «{0}»). Con polarización, la especificación Modbus recomienda 150 Ω (0.5 W) o 1 nF + 120 Ω en serie (0.25 W, terminación RC: consume menos corriente de polarización en reposo); una resistencia simple de 120 Ω también es práctica habitual. Si un equipo tiene interruptor de terminación, úselo en lugar de añadir una resistencia externa.",
  "120 Ω termination only at the two ends of the line (here the adapter and «{}»). If a device has a termination switch, use it instead of adding an external resistor.":
    "Terminación de 120 Ω solo en los dos extremos de la línea (aquí el convertidor y «{0}»). Si un equipo tiene interruptor de terminación, úselo en lugar de añadir una resistencia externa.",
  "Bias (failsafe) at one place for the whole bus — usually the master (adapter) side switch or jumper. With biasing the Modbus spec lowers the maximum number of devices by 4 (32 → 28).":
    "Polarización (fail-safe) en un solo punto de todo el bus, normalmente con el interruptor o puente del lado del maestro (convertidor). Con polarización, la especificación Modbus reduce en 4 el número máximo de equipos (32 → 28).",
  "Chain the devices one after another (daisy chain). Do not wire a star from one point; keep stubs under 20 m.":
    "Conecte los equipos uno tras otro (en cadena). No haga una estrella desde un punto; mantenga las derivaciones por debajo de 20 m.",
  "Run Common (SG) as a third wire — ground potential differences between devices can break communication or damage devices.":
    "Lleve el común (SG) como tercer hilo: las diferencias de potencial de tierra entre equipos pueden cortar la comunicación o dañar los equipos.",
  "A/B naming is reversed by some vendors — if nothing answers, swap the two wires (reversed polarity does not damage devices).":
    "Algunos fabricantes invierten los nombres A/B: si nadie responde, intercambie los dos hilos (la polaridad invertida no daña los equipos).",
  "Terminal names here are generic. Check the terminal numbers in each device manual.":
    "Los nombres de bornes aquí son genéricos. Compruebe los números de borne en el manual de cada equipo.",
  "Baud, data bits, parity and stop bits must match on every device; slave IDs (1–247) must be unique.":
    "Velocidad, bits de datos, paridad y bits de parada deben coincidir en todos los equipos; las direcciones de esclavo (1–247) no deben repetirse.",
  "Generally up to 32 unit loads per segment without a repeater with standard transceivers.":
    "Con transceptores estándar, en general hasta 32 cargas unitarias por segmento sin repetidor.",
  "Upper pair: master → devices · lower pair: devices → master — about {} m · {} bps":
    "Par superior: maestro → equipos · par inferior: equipos → maestro, unos {0} m · {1} bps",
  "{} → {} (master transmit +)":
    "{0} → {1} (transmisión + del maestro)",
  "{} → {} (master transmit −)":
    "{0} → {1} (transmisión − del maestro)",
  "device {} → master {}":
    "equipo {0} → maestro {1}",
  "{} m — one segment is generally limited to about 1200 m.":
    "{0} m: un segmento suele limitarse a unos 1200 m.",
  "At {} bps the rough limit is about {} m.":
    "A {0} bps el límite aproximado es de unos {1} m.",
  "Slave ID {} is used twice.":
    "La dirección de esclavo {0} está repetida.",
  "«{}»: {} differs from the device map.":
    "«{0}»: {1} distinta de la del mapa de equipos.",
  "baud rate":
    "velocidad",
  "parity":
    "paridad",
  "ID range":
    "rango de direcciones",
  "Cross the pairs — master TX± to device RX±, device TX± to master RX±.":
    "Cruce los pares: TX± del maestro a RX± de los equipos, TX± de los equipos a RX± del maestro.",
  "Keep + and − of each signal on the same twisted pair; use two separate pairs.":
    "Mantenga el + y el − de cada señal en el mismo par trenzado; use dos pares separados.",
  "In 4-wire Modbus each pair is terminated at both ends of the bus (as drawn). A point-to-point RS-422 link with a single driver is sometimes terminated only at the far (receiving) end of that pair — follow the device manual.":
    "En Modbus a 4 hilos cada par se termina en los dos extremos del bus (como en el dibujo). Un enlace RS-422 punto a punto con un solo transmisor a veces se termina solo en el extremo lejano (receptor) de ese par: siga el manual del equipo.",
  "Bias the pair several devices drive (lower pair) at one place on the master side.":
    "Polarice el par que excitan varios equipos (par inferior) en un solo punto del lado del maestro.",
  "Set the adapter to 4-wire (full duplex) mode — many have a 2-wire/4-wire switch or jumper.":
    "Ponga el convertidor en modo de 4 hilos (dúplex completo): muchos tienen un interruptor o puente de 2/4 hilos.",
  "+/− naming and whether TX/RX are named from the device's own side vary by vendor — check the manual's terminal numbers.":
    "Los nombres +/− y si TX/RX se nombran desde el lado del propio equipo varían según el fabricante: compruebe los números de borne del manual.",
  "Connect Common (SG) as well.":
    "Conecte también el común (SG).",
  "Device (DCE)":
    "Equipo (DCE)",
  "Device (DTE)":
    "Equipo (DTE)",
  "male connector":
    "conector macho",
  "check the manual's pin table":
    "consulte la tabla de pines del manual",
  "Straight (DTE ↔ DCE)":
    "Directo (DTE ↔ DCE)",
  "Null modem, 3 wires (no handshake)":
    "Null modem de 3 hilos (sin handshake)",
  "Null modem (with RTS/CTS, DTR/DSR)":
    "Null modem (con RTS/CTS, DTR/DSR)",
  "Data TxD → RxD":
    "Datos TxD → RxD",
  "Signal ground 5":
    "Tierra de señal 5",
  "Flow control RTS/CTS":
    "Control de flujo RTS/CTS",
  "Modem control DTR/DSR/DCD":
    "Control de módem DTR/DSR/DCD",
  "Data":
    "Datos",
  "Signal ground":
    "Tierra de señal",
  "Hardware flow control":
    "Control de flujo por hardware",
  "Modem control":
    "Control de módem",
  "Wiring table":
    "Tabla de conexiones",
  "PC pin":
    "Pin del PC",
  "Device pin":
    "Pin del equipo",
  "DB9 pinout (DTE side, TIA-574)":
    "Pines DB9 (lado DTE, TIA-574)",
  "Signal":
    "Señal",
  "At the PC (DTE)":
    "En el PC (DTE)",
  "Output":
    "Salida",
  "Input":
    "Entrada",
  "In the device manual's pin table, see whether pin 2 transmits or receives. If pin 3 transmits it is a DTE like the PC (use a null modem); if pin 2 transmits, use a straight cable.":
    "En la tabla de pines del manual del equipo, mire si el pin 2 transmite o recibe. Si transmite por el pin 3, es un DTE como el PC (use un cable null modem); si transmite por el pin 2, use un cable directo.",
  "Always connect pin 5 (GND) — without it bytes are garbled or nothing arrives.":
    "Conecte siempre el pin 5 (GND): sin él los bytes llegan corruptos o no llega nada.",
  "Without flow control (\"None\" in the terminal program) three wires — TxD, RxD, GND — are enough.":
    "Sin control de flujo («Ninguno» en el programa de terminal) bastan tres hilos: TxD, RxD y GND.",
  "With hardware flow control (RTS/CTS), cross pins 7 and 8 too. Enabled without a CTS wire, transmission stalls.":
    "Con control de flujo por hardware (RTS/CTS), cruce también los pines 7 y 8. Si está activado y falta el hilo CTS, la transmisión se detiene.",
  "Loopback test: tie pins 2 and 3 at the PC connector; if bytes come back, the port and adapter work.":
    "Prueba de lazo (loopback): puentee los pines 2 y 3 en el conector del PC; si los bytes vuelven, el puerto y el adaptador funcionan.",
  "Commercial cables are not all wired alike — check the cable diagram and the device manual's pin numbers.":
    "No todos los cables comerciales están cableados igual: compruebe el esquema del cable y los números de pin del manual del equipo.",
  "24 V DC supply":
    "Fuente de 24 V CC",
  "2-wire (loop powered)":
    "2 hilos (alimentado por el lazo)",
  "3-wire":
    "3 hilos",
  "4-wire (separately powered)":
    "4 hilos (alimentación separada)",
  "Transmitter":
    "Transmisor",
  "PLC analog input":
    "Entrada analógica del PLC",
  "current input channel":
    "canal de entrada de corriente",
  "Power: per transmitter manual (separate)":
    "Alimentación: según el manual del transmisor (separada)",
  "(not needed for 4-wire)":
    "(no hace falta a 4 hilos)",
  "+ supply":
    "+ alimentación",
  "Loop current (signal)":
    "Corriente del lazo (señal)",
  "Voltage left for the transmitter at 20 mA ≈ {} − 0.02 × {} = {} V (cable excluded). It must exceed the minimum supply in the transmitter datasheet.":
    "Tensión que queda para el transmisor a 20 mA ≈ {0} − 0.02 × {1} = {2} V (sin contar el cable). Debe superar la alimentación mínima de la hoja de datos del transmisor.",
  "The receiver resistor must be above 0.":
    "La resistencia de carga debe ser mayor que 0.",
  "With {} Ω, 4–20 mA is {}–{} V (V = I × R). 250 Ω gives 1–5 V.":
    "Con {0} Ω, 4–20 mA dan {1}–{2} V (V = I × R). Con 250 Ω se obtienen 1–5 V.",
  "Check that the PLC channel is set to current, and whether it is an active input (supplies loop power) or passive. A 2-wire transmitter on a passive input needs an external 24 V supply.":
    "Compruebe que el canal del PLC está configurado en corriente y si es una entrada activa (alimenta el lazo) o pasiva. Un transmisor a 2 hilos en una entrada pasiva necesita una fuente externa de 24 V.",
  "2-wire shares one pair for power and signal; 3-wire shares 0 V between power and signal; 4-wire keeps them separate.":
    "A 2 hilos, alimentación y señal comparten un par; a 3 hilos comparten los 0 V; a 4 hilos van separadas.",
  "Reversed polarity stops the current, reading as 0 mA (like an open wire).":
    "Con la polaridad invertida no circula corriente y se lee 0 mA (como un hilo cortado).",
  "Ground the cable shield at one end only (usually the panel side) — follow site rules and the manual.":
    "Conecte la pantalla del cable a tierra en un solo extremo (normalmente el lado del cuadro): siga las normas de la instalación y el manual.",
  "Terminal names (AI+, I+, V+, COM) and numbers vary — check the PLC and transmitter manuals.":
    "Los nombres (AI+, I+, V+, COM) y números de borne varían: compruebe los manuales del PLC y del transmisor.",
  "Voltage across {} Ω":
    "Tensión en {0} Ω",
  "PLC digital input":
    "Entrada digital del PLC",
  "Sensor {}":
    "Sensor {0}",
  "BK out":
    "Salida BK",
  "NPN: when on, the black wire is pulled to 0 V; current flows COM (+24 V) → input → sensor":
    "NPN: al activarse, el hilo negro se lleva a 0 V; la corriente va de COM (+24 V) → entrada → sensor",
  "PNP: when on, the black wire outputs +24 V; current flows sensor → input → COM (0 V)":
    "PNP: al activarse, el hilo negro da +24 V; la corriente va del sensor → entrada → COM (0 V)",
  "Brown — +24 V":
    "Marrón: +24 V",
  "Blue — 0 V":
    "Azul: 0 V",
  "Black — output → input":
    "Negro: salida → entrada",
  "NPN sensors: input COM to +24 V. PNP sensors: COM to 0 V. Keep one sensor type per COM group.":
    "Sensores NPN: COM de entradas a +24 V. Sensores PNP: COM a 0 V. Un solo tipo de sensor por grupo de COM.",
  "«Sink/source input» names are used in opposite ways by different vendors — some call the NPN-compatible input «sink», others call the PNP-compatible input «sinking». Go by where COM connects, not the name.":
    "Los fabricantes usan los nombres «entrada sink/source» al revés: unos llaman «sink» a la entrada para NPN y otros llaman «sinking» a la entrada para PNP. Guíese por dónde se conecta el COM, no por el nombre.",
  "Wire colours follow the IEC 60947-5-2 convention (brown +, blue 0 V, black output, white second output on 4-wire) — check the sensor datasheet.":
    "Los colores siguen la convención IEC 60947-5-2 (marrón +, azul 0 V, negro salida, blanco segunda salida en sensores de 4 hilos): compruebe la hoja de datos del sensor.",
  "2-wire proximity sensors are wired differently (in series with the load, leakage current) — do not wire them like 3-wire sensors.":
    "Los sensores de proximidad de 2 hilos se conectan de otra forma (en serie con la carga, corriente de fuga): no los conecte como los de 3 hilos.",
  "The sensor supply and PLC input supply must share 0 V (tie the 0 V lines if there are two supplies).":
    "La fuente de los sensores y la de las entradas del PLC deben compartir los 0 V (una las líneas de 0 V si hay dos fuentes).",
  "Input names (X0, I0.0, %IX0 …) and COM groups vary — check the PLC manual's terminal numbers.":
    "Los nombres de entrada (X0, I0.0, %IX0 …) y los grupos de COM varían: compruebe los números de borne del manual del PLC.",
  "AC supply L":
    "Alimentación CA L",
  "Relay output":
    "Salida de relé",
  "Transistor NPN (sinking)":
    "Transistor NPN (sink)",
  "Transistor PNP (sourcing)":
    "Transistor PNP (source)",
  "PLC output":
    "Salida del PLC",
  "Load":
    "Carga",
  "AC coil":
    "Bobina de CA",
  "DC coil":
    "Bobina de CC",
  "solenoid / relay":
    "solenoide / relé",
  "Diode (band to +)":
    "Diodo (banda hacia +)",
  "RC snubber":
    "Supresor RC",
  "Output → load":
    "Salida → carga",
  "Flyback diode":
    "Diodo de rueda libre",
  "Transistor outputs drive DC loads only — use relay or SSR (triac) outputs for AC loads. Drawn as DC.":
    "Las salidas de transistor solo manejan cargas de CC: para cargas de CA use salidas de relé o SSR (triac). Se dibuja como CC.",
  "On DC coils, fit a flyback diode across the coil with the cathode (band) to the + side. Reversed, it shorts the output when switched on.":
    "En bobinas de CC, ponga un diodo de rueda libre en paralelo con la bobina, con el cátodo (banda) hacia el +. Al revés, cortocircuita la salida al activarse.",
  "A diode absorbs the turn-off spike but slows coil release — use diode + Zener etc. when fast release matters.":
    "El diodo absorbe el pico de apagado pero retrasa la liberación de la bobina: use diodo + Zener u otra solución cuando importe una liberación rápida.",
  "For AC loads use an RC snubber or varistor across the coil, not a diode.":
    "Para cargas de CA use un supresor RC o un varistor en paralelo con la bobina, no un diodo.",
  "With NPN (sinking) transistor outputs the load goes between + and the output; with PNP (sourcing), between the output and 0 V. COM connects differently.":
    "Con salidas de transistor NPN (sink) la carga va entre + y la salida; con PNP (source), entre la salida y 0 V. El COM se conecta de forma distinta.",
  "Check the PLC manual for maximum current per point and per COM group, and relay contact ratings (voltage, current, life).":
    "Compruebe en el manual del PLC la corriente máxima por punto y por grupo de COM, y los valores nominales de los contactos de relé (tensión, corriente, vida útil).",
  "Output names (Y0, Q0.0, %QX0 …) vary — check the PLC manual's terminal numbers.":
    "Los nombres de salida (Y0, Q0.0, %QX0 …) varían: compruebe los números de borne del manual del PLC.",
  "RS-485 2-wire multidrop":
    "RS-485 a 2 hilos multipunto",
  "RS-485 4-wire / RS-422":
    "RS-485 a 4 hilos / RS-422",
  "4-20 mA transmitter → PLC analog input":
    "Transmisor 4-20 mA → entrada analógica del PLC",
  "NPN/PNP 3-wire sensor → PLC input":
    "Sensor NPN/PNP de 3 hilos → entrada del PLC",
  "Relay / transistor output → load":
    "Salida de relé / transistor → carga",
};
