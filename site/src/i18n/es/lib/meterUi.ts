// lib/meterFig.ts · views/MultimeterCheckPage.astro — figuras de medida, explicación y campos (solo se dibujan en el servidor)
export default {
  "RS-485 device terminals":
    "Bornes RS-485 del equipo",
  "All devices powered off · wiring left in place":
    "Todos los equipos sin alimentación · cableado sin tocar",
  "Power on · polling stopped":
    "Con alimentación · sondeo detenido",
  "Power on · ① A–SG, ② B–SG":
    "Con alimentación · ① A–SG, ② B–SG",
  "Terminals at the far device":
    "Bornes en el equipo más lejano",
  "Load switched on · at the device end":
    "Carga activada · en el extremo del equipo",
  "Sensor wires (3-wire)":
    "Hilos del sensor (3 hilos)",
  "Brown +V":
    "Marrón +V",
  "Black out":
    "Negro salida",
  "Blue 0V":
    "Azul 0V",
  "Connected to the PLC input · ON and OFF":
    "Conectado a la entrada del PLC · ON y OFF",
  "PC-side DB9 (DTE)":
    "DB9 del lado del PC (DTE)",
  "Not transmitting · device may be unplugged":
    "Sin transmitir · el equipo puede estar desconectado",
  "USB shell":
    "Carcasa USB",
  "Equipment":
    "Equipo",
  "Both powered · DC and AC":
    "Ambos alimentados · CC y CA",
  "Break the loop at one point, meter in series (mA jack)":
    "Abra el lazo en un punto, multímetro en serie (borne mA)",
  "Supply":
    "Fuente",
  "Trans-":
    "Trans-",
  "mitter":
    "misor",
  "PLC input 250Ω":
    "Entrada PLC 250Ω",
  "Power off every device, leave the wiring as it is, and measure resistance (Ω) across A–B at any device. Enter the device count and bias resistors to compare with expected values.":
    "Quite la alimentación de todos los equipos, deje el cableado como está y mida la resistencia (Ω) entre A y B en cualquier equipo. Introduzca el número de equipos y las resistencias de polarización para compararla con los valores esperados.",
  "Two 120 Ω terminations in parallel make 60 Ω. A receiver is typically 12 kΩ (one unit load); bias resistors can appear in series through a powered-off supply. Modbus spec: termination at both ends only (150 Ω, or 1 nF + 120 Ω in series). RC termination (1 nF in series) blocks DC, so a multimeter cannot see it.":
    "Dos terminaciones de 120 Ω en paralelo dan 60 Ω. Un receptor suele ser de 12 kΩ (una carga unitaria); las resistencias de polarización pueden aparecer en serie a través de una fuente apagada. Especificación Modbus: terminación solo en ambos extremos (150 Ω, o 1 nF + 120 Ω en serie). La terminación RC (1 nF en serie) bloquea la CC, así que el multímetro no la ve.",
  "Reading (Ω, OL allowed)":
    "Lectura (Ω, se admite OL)",
  "Transceivers (incl. adapter)":
    "Transceptores (incl. el convertidor)",
  "Terminator":
    "Terminación",
  "Bias resistor (each)":
    "Resistencia de polarización (cada una)",
  "None / unknown":
    "Ninguna / desconocida",
  "With power on and polling stopped (nobody transmitting), put red on B (D1·+) and black on A (D0·−) and measure DC volts.":
    "Con alimentación y el sondeo detenido (nadie transmite), ponga la roja en B (D1·+) y la negra en A (D0·−) y mida tensión continua.",
  "TIA/EIA-485: receivers have a defined state beyond ±200 mV differential. Positive while idle means «1» (mark).":
    "TIA/EIA-485: los receptores tienen un estado definido más allá de ±200 mV diferenciales. Positivo en reposo significa «1» (marca).",
  "Unit":
    "Unidad",
  "Power on, then measure DC volts ① from A to SG (common · 0 V) and ② from B to SG. Entering only one is fine.":
    "Con alimentación, mida tensión continua ① de A a SG (común · 0 V) y ② de B a SG. Basta con introducir una de las dos.",
  "TIA/EIA-485: receiver common-mode range −7 to +12 V; usually between 0 and 5 V.":
    "TIA/EIA-485: rango de modo común del receptor de −7 a +12 V; normalmente entre 0 y 5 V.",
  "Break the loop at one point and insert the meter in series on its mA jack — or divide the voltage across the receiver resistor (e.g. 250 Ω) by its value.":
    "Abra el lazo en un punto e intercale el multímetro en serie en su borne de mA, o divida la tensión en la resistencia de carga (p. ej., 250 Ω) entre su valor.",
  "NAMUR NE 43: measurement 3.8–20.5 mA, failure signal ≤ 3.6 mA or ≥ 21 mA. 4 mA = 0 %, 20 mA = 100 %.":
    "NAMUR NE 43: medida 3.8–20.5 mA, señal de fallo ≤ 3.6 mA o ≥ 21 mA. 4 mA = 0 %, 20 mA = 100 %.",
  "Current (mA)":
    "Corriente (mA)",
  "With loads such as valves and relays switched on, measure +24V–0V at the far device, not at the supply.":
    "Con cargas como válvulas y relés activadas, mida +24V–0V en el equipo más lejano, no en la fuente.",
  "IEC 61131-2: 24 V DC supplies are generally allowed −15 % to +20 % (20.4–28.8 V). A drop of 5 % or less leaves margin.":
    "IEC 61131-2: en general se admite de −15 % a +20 % en fuentes de 24 V CC (20.4–28.8 V). Una caída del 5 % o menos deja margen.",
  "Nominal (V)":
    "Nominal (V)",
  "Measured (V)":
    "Medida (V)",
  "With the sensor connected to the PLC input, measure DC volts between the output (usually black) and 0 V (blue), once with the sensor ON and once OFF.":
    "Con el sensor conectado a la entrada del PLC, mida tensión continua entre la salida (normalmente negro) y 0 V (azul), una vez con el sensor en ON y otra en OFF.",
  "IEC 61131-2 24 V DC inputs: ON ≥ 15 V (type 1) or ≥ 11 V (types 2/3), OFF ≤ 5 V. For NPN, input voltage = supply − output.":
    "Entradas de 24 V CC según IEC 61131-2: ON ≥ 15 V (tipo 1) o ≥ 11 V (tipos 2/3), OFF ≤ 5 V. En NPN, tensión de entrada = alimentación − salida.",
  "Sensor type":
    "Tipo de sensor",
  "Sensor state (LED)":
    "Estado del sensor (LED)",
  "ON":
    "ON",
  "OFF":
    "OFF",
  "Output–0V (V)":
    "Salida–0V (V)",
  "Sensor supply (V)":
    "Alimentación del sensor (V)",
  "While nothing is sent, measure DC volts between pin 3 (TXD) and pin 5 (GND) of the PC-side DB9. Some adapters only drive TX once the port is open.":
    "Mientras no se envía nada, mida tensión continua entre el pin 3 (TXD) y el pin 5 (GND) del DB9 del lado del PC. Algunos adaptadores solo excitan TX con el puerto abierto.",
  "TIA-232: idle (mark) output −5 to −15 V, receiver threshold ±3 V, max ±25 V. +3.3/+5 V indicates a TTL UART.":
    "TIA-232: salida en reposo (marca) de −5 a −15 V, umbral del receptor ±3 V, máximo ±25 V. +3.3/+5 V indica una UART TTL.",
  "Measure between the PC's USB shell (or PC ground) and the device SG/PE, in both DC (V⎓) and AC (V~). Enter the larger.":
    "Mida entre la carcasa USB del PC (o la tierra del PC) y el SG/PE del equipo, en CC (V⎓) y en CA (V~). Introduzca el mayor.",
  "Rule of thumb: under 1 V is comfortable; a few volts shrinks the RS-485 common-mode margin and drives current through non-isolated USB and RS-232.":
    "Regla práctica: por debajo de 1 V no hay problema; unos pocos voltios reducen el margen de modo común de RS-485 y hacen circular corriente por el USB no aislado y por RS-232.",
  "Difference (V)":
    "Diferencia (V)",
  "Programmable controllers: equipment requirements (24 V DC supply, digital input types)":
    "Autómatas programables: requisitos de los equipos (alimentación de 24 V CC, tipos de entradas digitales)",
  "Interface for serial binary data interchange (signal levels)":
    "Interfaz para el intercambio de datos binarios en serie (niveles de señal)",
};
