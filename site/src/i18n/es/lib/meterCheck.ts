// lib/meterCheck.ts — evaluación de lecturas del multímetro (frase en inglés → español)
// Términos: resistencia de terminación, polarización (fail-safe), modo común, señal de fallo (NE 43), tensión residual, fuga
export default {
  "RS-485 A–B resistance (power off)":
    "Resistencia A–B de RS-485 (sin alimentación)",
  "RS-485 idle A–B voltage (bias)":
    "Tensión A–B de RS-485 en reposo (polarización)",
  "RS-485 A/B to SG voltage (common mode)":
    "Tensión A/B–SG de RS-485 (modo común)",
  "4–20 mA loop current":
    "Corriente del lazo 4–20 mA",
  "24 V supply — voltage at the device under load":
    "Fuente de 24 V: tensión en el equipo con carga",
  "NPN/PNP sensor output voltage":
    "Tensión de salida de sensor NPN/PNP",
  "RS-232 TX idle voltage":
    "Tensión TX de RS-232 en reposo",
  "Ground-to-ground voltage":
    "Tensión entre tierras",
  "Enter a number.":
    "Escriba un número.",
  "RC termination (1 nF + 120 Ω in series — the form the Modbus spec recommends with biasing) blocks DC with its capacitor, so a multimeter's resistance (DC) range cannot see it. Such a bus reads like «no termination» even when terminated — choose RC in the «Terminator» field, or look at the end devices' termination switches and parts.":
    "La terminación RC (1 nF + 120 Ω en serie, la forma que recomienda la especificación Modbus con polarización) bloquea la CC con su condensador, así que el rango de resistencia (CC) del multímetro no la ve. Ese bus se lee como «sin terminación» aunque esté terminado: elija RC en el campo «Terminación» o revise los interruptores y componentes de terminación de los equipos de los extremos.",
  "Expected with both ends terminated (2)":
    "Esperado con ambos extremos terminados (2)",
  "One end only (1)":
    "Solo un extremo (1)",
  "No termination":
    "Sin terminación",
  "Expected values assume {} transceivers at one unit load (12 kΩ) each and the bias resistors appearing in series through the powered-off supply. With many 1/8-unit-load devices the real value is a little higher.":
    "Los valores esperados suponen {0} transceptores de una carga unitaria (12 kΩ) cada uno y las resistencias de polarización en serie a través de la fuente apagada. Con muchos equipos de 1/8 de carga unitaria el valor real es algo mayor.",
  "Close to 0 Ω — A and B are shorted together.":
    "Cerca de 0 Ω: A y B están en cortocircuito.",
  "Look for stray strands at terminals, crushed cable or a damaged transceiver. Re-measure while removing devices one by one to narrow it down.":
    "Busque hilos sueltos en los bornes, cable aplastado o un transceptor dañado. Vuelva a medir quitando los equipos uno a uno para acotarlo.",
  "Close to the value for termination at both ends (≈ {} Ω).":
    "Cerca del valor con terminación en ambos extremos (≈ {0} Ω).",
  "Termination belongs only at the two physical ends — this reading alone does not tell which devices have it.":
    "La terminación va solo en los dos extremos físicos: esta lectura por sí sola no dice qué equipos la tienen.",
  "Close to the value for termination at one end only (≈ {} Ω).":
    "Cerca del valor con terminación en un solo extremo (≈ {0} Ω).",
  "The standard is both ends. Short, slow lines (≤ 9600 bps, tens of metres) often work like this, but long or fast lines can garble bytes from reflections. Check the termination switch or 120 Ω at the other end.":
    "Lo estándar es en ambos extremos. Las líneas cortas y lentas (≤ 9600 bps, decenas de metros) suelen funcionar así, pero en líneas largas o rápidas las reflexiones pueden corromper bytes. Revise el interruptor de terminación o los 120 Ω del otro extremo.",
  "Close to the value with no termination (hundreds of Ω to several kΩ or more).":
    "Cerca del valor sin terminación (de cientos de Ω a varios kΩ o más).",
  "The termination switches at both ends may be off or the 120 Ω missing. Some devices only switch in internal termination when powered, so it can read like this with power off.":
    "Puede que los interruptores de terminación de ambos extremos estén apagados o falten los 120 Ω. Algunos equipos solo conectan la terminación interna con alimentación, así que sin ella pueden leerse así.",
  "OL between A and B can also mean the line is broken part-way — measure again at the end device's terminals.":
    "OL entre A y B también puede indicar que la línea está cortada a mitad de camino: vuelva a medir en los bornes del equipo del extremo.",
  "Reads like three or more terminations (≈ {} Ω or less).":
    "Parece que hay tres o más terminaciones (≈ {0} Ω o menos).",
  "A middle device may have its termination switch on, or adapter and device terminations overlap. Too many terminations shrink the signal and starve the bias, causing missing or garbled replies.":
    "Puede que un equipo intermedio tenga el interruptor de terminación activado, o que se solapen la terminación del convertidor y la del equipo. Demasiadas terminaciones reducen la señal y dejan sin margen a la polarización, con respuestas que faltan o llegan corruptas.",
  "Very many devices (dozens) or small bias resistors also pull it down this far — make sure the device count and bias fields match the real bus.":
    "Muchísimos equipos (decenas) o resistencias de polarización pequeñas también bajan tanto el valor: asegúrese de que los campos de número de equipos y de polarización coinciden con el bus real.",
  "Expected with RC termination only (DC)":
    "Esperado solo con terminación RC (CC)",
  "If one 120 Ω resistor termination is mixed in":
    "Si hay mezclada una terminación de resistencia de 120 Ω",
  "Close to the DC value of a bus with RC termination only — no sign of a resistor termination mixed in (in this measurement).":
    "Cerca del valor en CC de un bus solo con terminación RC: no hay señal de una terminación de resistencia mezclada (en esta medida).",
  "RC termination itself cannot be confirmed with DC — check the switch or parts at both end devices.":
    "La terminación RC en sí no se puede confirmar en CC: revise el interruptor o los componentes de los dos equipos de los extremos.",
  "OL can also mean the line is broken part-way — measure again at the end device's terminals.":
    "OL también puede indicar que la línea está cortada a mitad de camino: vuelva a medir en los bornes del equipo del extremo.",
  "An RC-terminated bus, but a resistor termination shows (≈ {} Ω or less).":
    "Bus con terminación RC, pero aparece una terminación de resistencia (≈ {0} Ω o menos).",
  "A device or adapter may have its 120 Ω termination switch on, or a resistor termination is mixed in. Turn it off if it is not at an end.":
    "Puede que un equipo o el convertidor tenga activado el interruptor de terminación de 120 Ω, o que haya una terminación de resistencia mezclada. Desactívela si no está en un extremo.",
  "Stop polling while measuring — if anyone is transmitting, the reading jumps around.":
    "Detenga el sondeo mientras mide: si alguien transmite, la lectura salta.",
  "+200 mV or more — receivers see a defined «1» (mark) while the bus is idle.":
    "+200 mV o más: con el bus en reposo los receptores ven un «1» (marca) definido.",
  "Within ±200 mV — receivers have no defined state while the bus is idle.":
    "Dentro de ±200 mV: con el bus en reposo los receptores no tienen un estado definido.",
  "Bias (fail-safe) resistors are missing, or too large for the 60 Ω termination. The first byte may be garbled or noise read as bytes.":
    "Faltan las resistencias de polarización (fail-safe) o son demasiado grandes para la terminación de 60 Ω. El primer byte puede llegar corrupto o el ruido leerse como bytes.",
  "Many newer transceivers have fail-safe receivers that read 0 V as «1», so it may still work. Use the RS-485 calculator to size bias resistors.":
    "Muchos transceptores recientes tienen receptores fail-safe que leen 0 V como «1», así que puede funcionar igualmente. Use la calculadora RS-485 para dimensionar las resistencias de polarización.",
  "−200 mV or lower — the idle state reads inverted («0»).":
    "−200 mV o menos: el estado de reposo se lee invertido («0»).",
  "First check the probes (red = B · D1 · +). If they are right, the A/B at the bias side may be swapped, or a device is stuck transmitting.":
    "Primero revise las puntas (roja = B · D1 · +). Si están bien, puede que A/B estén intercambiados en el lado de la polarización o que un equipo se haya quedado transmitiendo.",
  "Some vendors label A and B the other way round — if nothing replies, swapping the two wires is a valid test (it does not damage devices).":
    "Algunos fabricantes rotulan A y B al revés: si nadie responde, intercambiar los dos hilos es una prueba válida (no daña los equipos).",
  "Common mode (A+B)/2":
    "Modo común (A+B)/2",
  "Outside −7 to +12 V — receivers may not decode correctly or may be damaged.":
    "Fuera de −7 a +12 V: los receptores pueden no decodificar bien o dañarse.",
  "The SG (common) wire may be missing so device grounds sit at different potentials, or another supply such as 24 V touches the line. Measure the ground-to-ground difference too.":
    "Puede que falte el hilo SG (común) y las tierras de los equipos estén a potenciales distintos, o que otra fuente, como la de 24 V, toque la línea. Mida también la diferencia entre tierras.",
  "Between distant devices, an isolated adapter or repeater is the usual remedy.":
    "Entre equipos alejados, la solución habitual es un convertidor o repetidor aislado.",
  "Inside −7 to +12 V but close to the edge.":
    "Dentro de −7 a +12 V, pero cerca del límite.",
  "It usually sits between 0 and 5 V. Re-measure while motors run, when it can drift further. Check the SG wire.":
    "Suele estar entre 0 y 5 V. Vuelva a medir con los motores en marcha, cuando puede desviarse más. Revise el hilo SG.",
  "Within the common-mode range (−7 to +12 V).":
    "Dentro del rango de modo común (−7 a +12 V).",
  "Without an SG connection the reading floats and changes between measurements — check the SG wire first in that case.":
    "Sin conexión SG la lectura flota y cambia de una medida a otra: en ese caso revise primero el hilo SG.",
  "Percent of span":
    "Porcentaje del rango",
  "Measure mA by breaking the loop and putting the meter in series, or divide the voltage across the receiver resistor (e.g. 250 Ω) by its value.":
    "Mida los mA abriendo el lazo y poniendo el multímetro en serie, o divida la tensión en la resistencia de carga (p. ej., 250 Ω) entre su valor.",
  "No current — the loop is open or has no supply.":
    "No hay corriente: el lazo está abierto o sin alimentación.",
  "For 2-wire, check reversed polarity, fuses, loose terminals and the loop supply. A 4-wire (separately powered) device may be wired like a 2-wire one.":
    "A 2 hilos, revise polaridad invertida, fusibles, bornes flojos y la fuente del lazo. Puede que un equipo a 4 hilos (alimentación separada) esté conectado como uno a 2 hilos.",
  "Negative — the probes are reversed or current flows the wrong way.":
    "Negativo: las puntas están invertidas o la corriente circula al revés.",
  "3.6 mA or less — the NE 43 low failure-signal range.":
    "3.6 mA o menos: rango de señal de fallo baja de NE 43.",
  "The transmitter may be signalling a sensor fault (broken sensor wire etc.), or the loop voltage is too low for it to drive current. Check the transmitter display or diagnostics.":
    "Puede que el transmisor esté señalando un fallo del sensor (hilo del sensor roto, etc.) o que la tensión del lazo sea demasiado baja para que entregue corriente. Revise la pantalla o el diagnóstico del transmisor.",
  "3.6–3.8 mA — neither the measurement range (3.8–20.5 mA) nor a failure signal.":
    "3.6–3.8 mA: ni rango de medida (3.8–20.5 mA) ni señal de fallo.",
  "Check the failure-signal setting in the transmitter manual (some products use values other than 3.6 mA).":
    "Compruebe la configuración de señal de fallo en el manual del transmisor (algunos productos usan valores distintos de 3.6 mA).",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA).":
    "Por debajo de 4 mA: bajo rango, pero dentro del rango de medida de NE 43 (hasta 3.8 mA).",
  "The process value may be below the range or the zero may be off.":
    "Puede que el valor de proceso esté por debajo del rango o que el cero esté desajustado.",
  "Within 4–20 mA.":
    "Dentro de 4–20 mA.",
  "If the PLC or display shows something else, check the scaling (range) and input type (current/voltage).":
    "Si el PLC o el indicador muestran otra cosa, revise el escalado (rango) y el tipo de entrada (corriente/tensión).",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA).":
    "Por encima de 20 mA: sobre rango, pero dentro del rango de medida de NE 43 (hasta 20.5 mA).",
  "The process value may exceed the range or the span may be off.":
    "Puede que el valor de proceso supere el rango o que el span esté desajustado.",
  "20.5–21 mA — neither the measurement range nor a failure signal.":
    "20.5–21 mA: ni rango de medida ni señal de fallo.",
  "21 mA or more — the NE 43 high failure-signal range.":
    "21 mA o más: rango de señal de fallo alta de NE 43.",
  "The transmitter may be signalling a fault (failure set to «upscale»).":
    "Puede que el transmisor esté señalando un fallo (fallo configurado en «escala alta»).",
  "The transmitter may be signalling a fault (failure set to «upscale»). Well above 25 mA, also suspect wiring where the supply bypasses the transmitter (a short).":
    "Puede que el transmisor esté señalando un fallo (fallo configurado en «escala alta»). Muy por encima de 25 mA, sospeche también de un cableado en que la fuente puentea el transmisor (cortocircuito).",
  "Drop":
    "Caída",
  "Allowed range (−15 % to +20 %)":
    "Rango admisible (−15 % a +20 %)",
  "Measure at the device terminals, not at the power supply, with the load (valves, relays, brakes …) switched on.":
    "Mida en los bornes del equipo, no en la fuente, con la carga (válvulas, relés, frenos…) activada.",
  "More than 20 % above nominal.":
    "Más de un 20 % por encima del nominal.",
  "Check the supply's voltage adjustment (ADJ) and rating.":
    "Revise el ajuste de tensión (ADJ) y los valores nominales de la fuente.",
  "Drop is 5 % or less.":
    "Caída del 5 % o menos.",
  "5–15 % drop — still within the allowed range but with less margin.":
    "Caída del 5–15 %: aún dentro del rango admisible, pero con menos margen.",
  "The wire may be long or thin, or a terminal may have contact resistance. Check whether it drops further when loads switch on together.":
    "Puede que el cable sea largo o fino, o que un borne tenga resistencia de contacto. Mire si baja más cuando las cargas se activan a la vez.",
  "Drop over 15 % — below the usual lower limit for 24 V DC equipment (20.4 V).":
    "Caída de más del 15 %: por debajo del límite inferior habitual de los equipos de 24 V CC (20.4 V).",
  "Check wire size and length, supply capacity (including inrush) and loose terminals. Re-size the wire with the voltage drop calculator.":
    "Revise sección y longitud del cable, capacidad de la fuente (incluida la corriente de arranque) y bornes flojos. Recalcule la sección con la calculadora de caída de tensión.",
  "Voltage across the PLC input (approx.)":
    "Tensión en la entrada del PLC (aprox.)",
  "Check the black probe is on the sensor 0 V (blue) and the red on the output (black).":
    "Compruebe que la punta negra está en el 0 V del sensor (azul) y la roja en la salida (negro).",
  "NPN pulls the output towards 0 V when on. The PLC input COM must be +24 V; measured with the output disconnected from the PLC, the off state floats and can read like 0 V.":
    "El NPN lleva la salida hacia 0 V cuando se activa. El COM de entradas del PLC debe ser +24 V; si se mide con la salida desconectada del PLC, el estado desactivado flota y puede leerse como 0 V.",
  "PNP pulls the output up to the supply (+24 V) when on. The PLC input COM must be 0 V.":
    "El PNP lleva la salida a la alimentación (+24 V) cuando se activa. El COM de entradas del PLC debe ser 0 V.",
  "Thresholds (15 V, 11 V, 5 V) are for 24 V DC inputs — for other voltages use the input card manual.":
    "Los umbrales (15 V, 11 V, 5 V) son para entradas de 24 V CC; para otras tensiones, use el manual de la tarjeta de entradas.",
  "Above 30 V — beyond the ON range of a 24 V DC input (15–30 V). Check the supply voltage.":
    "Por encima de 30 V: fuera del rango ON de una entrada de 24 V CC (15–30 V). Revise la tensión de alimentación.",
  "A voltage read as ON (15 V or more is ON for input types 1, 2 and 3).":
    "Tensión leída como ON (15 V o más es ON para entradas de tipo 1, 2 y 3).",
  "11–15 V — ON for type 2/3 inputs, undefined for type 1 inputs.":
    "11–15 V: ON para entradas de tipo 2/3, indefinido para entradas de tipo 1.",
  "The sensor's residual voltage may be high or the supply low. Measure the sensor supply (brown–blue) too.":
    "Puede que la tensión residual del sensor sea alta o la alimentación baja. Mida también la alimentación del sensor (marrón–azul).",
  "5–11 V — neither ON nor OFF.":
    "5–11 V: ni ON ni OFF.",
  "Check the input COM, the sensor's output current versus what the input needs, and supply drop.":
    "Revise el COM de entradas, la corriente de salida del sensor frente a la que necesita la entrada, y la caída de la alimentación.",
  "The sensor is on but the PLC input sees almost no voltage (reads OFF).":
    "El sensor está activado, pero la entrada del PLC casi no ve tensión (se lee OFF).",
  "The NPN/PNP type and input COM polarity may be mismatched, or the output wire goes to another input or is broken.":
    "Puede que el tipo NPN/PNP y la polaridad del COM de entradas no coincidan, o que el hilo de salida vaya a otra entrada o esté cortado.",
  "A voltage read as OFF (5 V or less).":
    "Tensión leída como OFF (5 V o menos).",
  "5–11 V — undefined while it should be OFF.":
    "5–11 V: indefinido cuando debería estar en OFF.",
  "Could be leakage from a 2-wire sensor or induced voltage on long parallel wiring. See whether the manual suggests a bleeder resistor across the input.":
    "Puede ser la fuga de un sensor de 2 hilos o tensión inducida en cableados largos en paralelo. Mire si el manual sugiere una resistencia de drenaje en paralelo con la entrada.",
  "The sensor is off but the PLC input sees an ON voltage.":
    "El sensor está desactivado, pero la entrada del PLC ve una tensión de ON.",
  "Check for a shorted output (touching +24 V or 0 V), swapped NPN/PNP, and the sensor output mode (NO/NC, light-on/dark-on).":
    "Busque una salida en cortocircuito (tocando +24 V o 0 V), NPN/PNP intercambiados y el modo de salida del sensor (NA/NC, light-on/dark-on).",
  "On a PC (DTE) DB9, pin 3 is TXD and pin 5 GND. On a device (DCE), TXD is often pin 2.":
    "En un DB9 de PC (DTE), el pin 3 es TXD y el 5 es GND. En un equipo (DCE), TXD suele ser el pin 2.",
  "Beyond ±25 V — outside the RS-232 maximum.":
    "Más de ±25 V: fuera del máximo de RS-232.",
  "Check the meter range and probe position — it may be a supply pin, not RS-232.":
    "Revise el rango del multímetro y la posición de las puntas: puede ser un pin de alimentación, no RS-232.",
  "Below −15 V — beyond the normal output (−5 to −15 V) but within ±25 V.":
    "Por debajo de −15 V: más allá de la salida típica (−5 a −15 V), pero dentro de ±25 V.",
  "−5 to −15 V — an RS-232 transmitter at idle (mark).":
    "−5 a −15 V: un transmisor RS-232 en reposo (marca).",
  "−3 to −5 V — past the receive threshold (−3 V) but below the transmit spec (−5 V).":
    "−3 a −5 V: pasa el umbral de recepción (−3 V), pero no llega a la especificación de transmisión (−5 V).",
  "Common on weakly powered adapters and laptop ports. With long cables the far end may not see enough voltage.":
    "Habitual en adaptadores con poca alimentación y en puertos de portátiles. Con cables largos, el otro extremo puede no recibir tensión suficiente.",
  "−3 to +3 V — not a defined RS-232 level.":
    "−3 a +3 V: no es un nivel RS-232 definido.",
  "It may not be the TXD pin (check 2 vs 3), or the driver is off or faulty. Some adapters only drive TX once the port is open — re-measure with a terminal program holding the port open.":
    "Puede que no sea el pin TXD (compruebe 2 frente a 3) o que el driver esté apagado o averiado. Algunos adaptadores solo excitan TX con el puerto abierto: vuelva a medir con un programa de terminal manteniendo el puerto abierto.",
  "+3 to +5.5 V — looks like a TTL (3.3/5 V) UART rather than RS-232.":
    "+3 a +5.5 V: parece una UART TTL (3.3/5 V) y no RS-232.",
  "TTL idles high. Wiring it straight to an RS-232 port does not work and can damage the device — use a TTL USB adapter (3.3 V/5 V).":
    "En TTL el reposo es nivel alto. Conectarla directamente a un puerto RS-232 no funciona y puede dañar el equipo: use un adaptador USB TTL (3.3 V/5 V).",
  "Positive voltage — TXD is not at idle (negative).":
    "Tensión positiva: TXD no está en reposo (negativo).",
  "A break (continuous 0) may be in progress, or the pin is a control line such as RTS (7) or DTR (4) that goes positive when asserted.":
    "Puede que haya un break (0 continuo) en curso o que el pin sea una línea de control, como RTS (7) o DTR (4), que se pone en positivo al activarse.",
  "Measure both DC (V⎓) and AC (V~) and enter the larger. Repeat with equipment on and motors running.":
    "Mida en CC (V⎓) y en CA (V~) e introduzca el mayor. Repita con los equipos encendidos y los motores en marcha.",
  "Under 1 V — generally not enough to disturb communication.":
    "Menos de 1 V: en general no basta para perturbar la comunicación.",
  "1–7 V — eats into the RS-485 common-mode margin (−7 to +12 V).":
    "1–7 V: se come el margen de modo común de RS-485 (−7 a +12 V).",
  "With non-isolated USB adapters and RS-232, this difference drives current through signal ground, causing drops and noise. Check the SG wire, single-point grounding, and an isolated adapter.":
    "Con adaptadores USB no aislados y con RS-232, esta diferencia hace circular corriente por la tierra de señal y provoca cortes y ruido. Revise el hilo SG, la puesta a tierra en un solo punto y un adaptador aislado.",
  "7 V or more — the grounds differ a lot.":
    "7 V o más: las tierras difieren mucho.",
  "It can exceed the RS-485 common-mode range and push current through comms and USB, damaging ports. Have an electrician check for a missing PE connection or leakage; until then, connect through an isolated adapter.":
    "Puede superar el rango de modo común de RS-485 y hacer circular corriente por la comunicación y el USB, dañando puertos. Pida a un electricista cualificado que revise si falta la conexión PE o hay fugas; mientras tanto, conecte a través de un adaptador aislado.",
  "No issue found (in this measurement)":
    "Sin problemas detectados (en esta medida)",
  "Worth a look":
    "Conviene revisarlo",
  "Problem":
    "Problema",
};
