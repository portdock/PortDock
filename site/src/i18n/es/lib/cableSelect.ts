// lib/cableSelect.ts — guía de selección de cables (frase en inglés → español)
// Términos: sección, intensidad admisible (IZ), caída de tensión, par trenzado apantallado, cable de extensión/compensación, cadena portacables, radio mínimo de curvatura
export default {
  "Over 1200 m — split the line with a repeater.":
    "Más de 1200 m: divida la línea con un repetidor.",
  "Beyond the rough limit for this baud rate ({} m) — lower the baud rate or split the line.":
    "Por encima del límite aproximado para esta velocidad ({0} m): baje la velocidad o divida la línea.",
  "Within the rough limit of {} m.":
    "Dentro del límite aproximado de {0} m.",
  "Beyond the Modbus spec's 1000 m at 9600 bps (AWG 26 or thicker) — use thicker cable or a lower rate.":
    "Por encima de los 1000 m a 9600 bps de la especificación Modbus (AWG 26 o más grueso): use un cable más grueso o una velocidad menor.",
  "Line capacitance about {} pF — over 2500 pF. Use low-capacitance cable, a lower baud rate, or RS-485/422.":
    "Capacidad de la línea de unos {0} pF: más de 2500 pF. Use cable de baja capacidad, una velocidad menor o RS-485/422.",
  "About {} pF, within the limit, but over 15 m — allowing for device capacitance and noise, test at a lower baud rate.":
    "Unos {0} pF, dentro del límite, pero más de 15 m: teniendo en cuenta la capacidad de los equipos y el ruido, pruebe a una velocidad menor.",
  "Line capacitance about {} pF — within 2500 pF.":
    "Capacidad de la línea de unos {0} pF: dentro de 2500 pF.",
  "Over the 100 m copper channel — add a switch or use fibre.":
    "Más del canal de cobre de 100 m: añada un switch o use fibra.",
  "Over 90 m of fixed cabling — check the channel including patch cords stays within 100 m.":
    "Más de 90 m de cableado fijo: compruebe que el canal, incluidos los latiguillos, no supera 100 m.",
  "Within the 100 m channel.":
    "Dentro del canal de 100 m.",
  "AC power (single- or three-phase)":
    "Alimentación de CA (monofásica o trifásica)",
  "Single-phase: L, N, PE (3 cores). Three-phase: L1, L2, L3 (and N) plus PE in the same cable.":
    "Monofásica: L, N, PE (3 conductores). Trifásica: L1, L2, L3 (y N) más PE en el mismo cable.",
  "The size must satisfy both: (1) current-carrying capacity (installation method, ambient temperature, grouping) and (2) voltage drop. This tool calculates (2) only.":
    "La sección debe cumplir las dos cosas: (1) intensidad admisible (método de instalación, temperatura ambiente, agrupamiento) y (2) caída de tensión. Esta herramienta solo calcula la (2).",
  "For drive (VFD) outputs, follow the maker's recommended shielded motor cable and grounding.":
    "En las salidas de variadores (VFD), siga el cable de motor apantallado y la puesta a tierra que recomienda el fabricante.",
  "Take IZ from Annex B of IEC 60364-5-52 (KEC 232.5.2 in Korea) and coordinate with protection so that IB ≤ In ≤ IZ.":
    "Tome IZ del anexo B de IEC 60364-5-52 (KEC 232.5.2 en Corea) y coordínela con la protección para que IB ≤ In ≤ IZ.",
  "Maximum conductor temperature: PVC 70 °C, XLPE/EPR 90 °C — the same size carries different current.":
    "Temperatura máxima del conductor: PVC 70 °C, XLPE/EPR 90 °C; la misma sección admite corrientes distintas.",
  "Keep apart from communication and analog cables; cross at right angles.":
    "Sepárelos de los cables de comunicación y analógicos; crúcelos en ángulo recto.",
  "KEC 212.4.1, 232.5 / IEC 60364-5-52 Annex B (ampacity — values from the original)":
    "KEC 212.4.1, 232.5 / IEC 60364-5-52 anexo B (intensidad admisible: valores del original)",
  "Voltage drop: IEC 60028 copper resistivity 1/58 Ω·mm²/m":
    "Caída de tensión: resistividad del cobre de IEC 60028, 1/58 Ω·mm²/m",
  "24 V DC power and control":
    "Alimentación y control a 24 V CC",
  "Run +24 V and 0 V in the same size — the drop happens in both conductors.":
    "Lleve +24 V y 0 V con la misma sección: la caída se produce en los dos conductores.",
  "For remote sensors, valves and devices, voltage drop usually decides the size. Compare the voltage at the load with the device's minimum input voltage.":
    "En sensores, válvulas y equipos alejados, la sección suele decidirla la caída de tensión. Compare la tensión en la carga con la tensión mínima de entrada del equipo.",
  "Control signals (contacts, NPN/PNP): multi-core control cable, shielded where noise is high.":
    "Señales de control (contactos, NPN/PNP): manguera de control multiconductor, apantallada donde haya mucho ruido.",
  "Loads with high inrush (solenoids, motor brakes) drop more at switch-on.":
    "Las cargas con corriente de arranque alta (solenoides, frenos de motor) caen más al activarse.",
  "Raising the supply output to cover the drop only works within the devices' maximum input voltage.":
    "Subir la salida de la fuente para compensar la caída solo vale dentro de la tensión máxima de entrada de los equipos.",
  "Voltage drop: IEC 60028 resistivity, IEC 60228 nominal sizes":
    "Caída de tensión: resistividad de IEC 60028, secciones nominales de IEC 60228",
  "RS-485 / RS-422 communication":
    "Comunicación RS-485 / RS-422",
  "Twisted pair with an overall shield. 2-wire RS-485: one pair (A, B) plus a signal ground (SG) wire; 4-wire and RS-422: two pairs plus SG.":
    "Par trenzado con pantalla general. RS-485 a 2 hilos: un par (A, B) más un hilo de tierra de señal (SG); a 4 hilos y RS-422: dos pares más SG.",
  "Use a cable rated for RS-485 with a stated characteristic impedance (commonly 120 Ω) and match the end terminations to it.":
    "Use un cable para RS-485 con impedancia característica declarada (normalmente 120 Ω) y adapte a ella las terminaciones de los extremos.",
  "Modbus serial spec: AWG 26 or thicker, up to 1000 m at 9600 bps, stubs 20 m or less.":
    "Especificación Modbus serie: AWG 26 o más grueso, hasta 1000 m a 9600 bps, derivaciones de 20 m o menos.",
  "Daisy chain — avoid star wiring and long stubs.":
    "Conexión en cadena: evite el cableado en estrella y las derivaciones largas.",
  "Distance and speed trade off: roughly bps × m ≤ 10⁸, at most about 1200 m.":
    "Distancia y velocidad se compensan: aproximadamente bps × m ≤ 10⁸, como máximo unos 1200 m.",
  "Ground the shield (one end or both) as the device or bus installation guide says.":
    "Conecte la pantalla a tierra (en un extremo o en ambos) según indique la guía de instalación del equipo o del bus.",
  "MODBUS over serial line V1.02 §3.4":
    "MODBUS over serial line V1.02 §3.4",
  "TI SLLA070D — 1200 m, bps × m ≤ 10⁸":
    "TI SLLA070D: 1200 m, bps × m ≤ 10⁸",
  "RS-232 communication":
    "Comunicación RS-232",
  "Keep it short — the spec limits line capacitance (under 2500 pF), not length. About 15 to 20 m with ordinary cable.":
    "Manténgalo corto: la especificación limita la capacidad de la línea (menos de 2500 pF), no la longitud. Unos 15 a 20 m con cable normal.",
  "At least TX, RX and SG (GND); more (RTS, CTS, …) with hardware flow control. Shielded multi-core cable.":
    "Como mínimo TX, RX y SG (GND); más (RTS, CTS…) con control de flujo por hardware. Manguera multiconductor apantallada.",
  "If both ends are DTE, use a crossover (null-modem) cable.":
    "Si los dos extremos son DTE, use un cable cruzado (null modem).",
  "For longer runs: low-capacitance cable, lower baud rate, or an RS-485/422 converter.":
    "Para tramos más largos: cable de baja capacidad, menor velocidad o un convertidor a RS-485/422.",
  "From the datasheet pF/m: rough length = 2500 pF ÷ pF/m (an upper value; device input capacitance not subtracted).":
    "A partir de los pF/m de la hoja de datos: longitud aproximada = 2500 pF ÷ pF/m (valor máximo; no resta la capacidad de entrada de los equipos).",
  "TI SLLA067C §2.13 — TIA-232 2500 pF, about 20 m":
    "TI SLLA067C §2.13: TIA-232 2500 pF, unos 20 m",
  "4–20 mA and 0–10 V analog":
    "Analógica 4–20 mA y 0–10 V",
  "Shielded twisted pair — each signal pair twisted, overall or individual shields.":
    "Par trenzado apantallado: cada par de señal trenzado, con pantalla general o individual.",
  "In a 4–20 mA loop the cable resistance eats supply voltage. For long runs, check the transmitter terminal voltage with a loop load calculation.":
    "En un lazo de 4–20 mA la resistencia del cable consume tensión de la fuente. En tramos largos, compruebe la tensión en bornes del transmisor con un cálculo de carga del lazo.",
  "0–10 V voltage signals are more sensitive to resistance and noise; keep them short.":
    "Las señales de tensión de 0–10 V son más sensibles a la resistencia y al ruido; manténgalas cortas.",
  "The shield is usually grounded at one end (the receiving end) — follow the device guide if it says otherwise.":
    "La pantalla suele conectarse a tierra en un extremo (el receptor): siga la guía del equipo si dice otra cosa.",
  "Do not share a duct with power or drive output cables.":
    "No compartan canaleta con cables de potencia ni con salidas de variadores.",
  "General practice — the loop calculation is Ohm's law":
    "Práctica general: el cálculo del lazo es la ley de Ohm",
  "Thermocouples and RTDs (Pt100)":
    "Termopares y RTD (Pt100)",
  "Thermocouple: extension (X) or compensating (C) cable of the same type — e.g. KX or KCA/KCB for type K. Copper wire in between creates new junctions and error.":
    "Termopar: cable de extensión (X) o de compensación (C) del mismo tipo, p. ej. KX o KCA/KCB para el tipo K. Un hilo de cobre intermedio crea nuevas uniones y error.",
  "IEC 60584-3 colours: + core in the type colour (K green, J black, T brown, E violet, N pink, R/S orange), − core white. Older and other national codes differ.":
    "Colores IEC 60584-3: conductor + del color del tipo (K verde, J negro, T marrón, E violeta, N rosa, R/S naranja), conductor − blanco. Los códigos antiguos y de otros países son distintos.",
  "RTD (Pt100): for 3-wire use the same length and size on all three wires (so lead resistance cancels); 4-wire for precision. Shielded cable.":
    "RTD (Pt100): a 3 hilos use la misma longitud y sección en los tres (para que se anule la resistencia de los hilos); a 4 hilos para precisión. Cable apantallado.",
  "Reversed polarity reads down as it heats (including the compensating cable).":
    "Con la polaridad invertida la lectura baja al calentarse (también en el cable de compensación).",
  "Compensating cables have a limited temperature range — use extension cable and heat-resistant insulation in hot zones.":
    "Los cables de compensación tienen un rango de temperatura limitado: en zonas calientes use cable de extensión y aislamiento resistente al calor.",
  "IEC 60584-3 extension and compensating cables, colours":
    "IEC 60584-3: cables de extensión y compensación, colores",
  "Ethernet (Modbus TCP, cameras, …)":
    "Ethernet (Modbus TCP, cámaras…)",
  "100 Mbps and 1 Gbps: Cat5e or better; 10 Gbps: Cat6A (Cat6 only for short runs).":
    "100 Mbps y 1 Gbps: Cat5e o superior; 10 Gbps: Cat6A (Cat6 solo en tramos cortos).",
  "One copper channel is 100 m — 90 m fixed cabling plus 10 m of patch cords.":
    "Un canal de cobre es de 100 m: 90 m de cableado fijo más 10 m de latiguillos.",
  "Factory floor (noise, oil, movement): shielded (S/FTP, SF/UTP) industrial cable, M12 D-coded (100 Mbps) or X-coded (1/10 Gbps) connectors.":
    "En planta (ruido, aceite, movimiento): cable industrial apantallado (S/FTP, SF/UTP), conectores M12 codificación D (100 Mbps) o X (1/10 Gbps).",
  "Beyond 100 m add a switch or go to fibre.":
    "Más allá de 100 m, añada un switch o pase a fibra.",
  "Use one wiring scheme (T568A or B) for the whole site.":
    "Use un solo esquema de conexión (T568A o B) en toda la instalación.",
  "Industrial Ethernet fieldbuses (PROFINET, …) have their own cable guidelines.":
    "Los buses de campo Ethernet industriales (PROFINET…) tienen sus propias guías de cableado.",
  "ANSI/TIA-568 channel 100 m (90 + 10)":
    "ANSI/TIA-568: canal de 100 m (90 + 10)",
  "IEEE 802.3 — 1000BASE-T (Cat5e), 10GBASE-T (Cat6A 100 m)":
    "IEEE 802.3: 1000BASE-T (Cat5e), 10GBASE-T (Cat6A 100 m)",
  "Encoders and servo motors":
    "Encoders y servomotores",
  "Use the maker's dedicated servo power and encoder cables (or cables to the maker's spec) — shielding, pairing and maximum length are matched to the drive.":
    "Use los cables de potencia y de encoder propios del fabricante del servo (o cables según su especificación): pantalla, pares y longitud máxima están adaptados al accionamiento.",
  "Incremental encoders (line driver A/A̅, B/B̅, Z/Z̅): individually twisted pairs plus shield. Open-collector outputs: keep short.":
    "Encoders incrementales (line driver A/A̅, B/B̅, Z/Z̅): pares trenzados individualmente más pantalla. Salidas en colector abierto: manténgalas cortas.",
  "Maximum length and encoder supply drop: from the drive manual.":
    "Longitud máxima y caída de la alimentación del encoder: según el manual del accionamiento.",
  "Run power and encoder cables apart; terminate the shield as the manual shows.":
    "Lleve separados los cables de potencia y de encoder; conecte la pantalla como indica el manual.",
  "General practice — lengths and specs from the drive and motor manuals":
    "Práctica general: longitudes y especificaciones según los manuales del accionamiento y del motor",
  "Moving parts (cable chains, robots)":
    "Partes móviles (cadenas portacables, robots)",
  "For continuous flexing use cables rated for cable chains (high-flex) — fine stranding, lay and jacket designed for bending.":
    "Para flexión continua use cables aptos para cadenas portacables (alta flexibilidad): hilos finos, cableado y cubierta diseñados para doblarse.",
  "The minimum bending radius is given in the maker's catalogue as a multiple of the outer diameter — make sure the chain radius is at least that.":
    "El radio mínimo de curvatura figura en el catálogo del fabricante como múltiplo del diámetro exterior: asegúrese de que el radio de la cadena sea al menos ese.",
  "For torsion (robot axes) use cables with a torsion rating.":
    "Para torsión (ejes de robot) use cables aptos para torsión.",
  "Use separators and clearance so cables do not twist together; spread heavy cables evenly to the outside.":
    "Use separadores y holgura para que los cables no se enreden entre sí; reparta los cables pesados de forma uniforme hacia el exterior.",
  "Flex life, acceleration and travel: from the maker's data.":
    "Vida útil a flexión, aceleración y recorrido: según los datos del fabricante.",
  "General practice — bending radius and life from cable and chain makers":
    "Práctica general: radio de curvatura y vida útil según los fabricantes de cables y cadenas",
};
