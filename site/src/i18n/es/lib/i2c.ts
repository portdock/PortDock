// lib/i2c.ts y herramienta I2C (views/I2cPage.astro) — frase en inglés → español
// Términos: resistencia pull-up, capacidad del bus, START repetido, llamada general, expansor de E/S
export default {
  "EEPROM random read":
    "Lectura aleatoria de EEPROM",
  "RTC time read":
    "Lectura de la hora de un RTC",
  "Address NACK":
    "NACK de dirección",
  "Plain hex":
    "Hex simple",
  "Field":
    "Campo",
  "Byte":
    "Byte",
  "Meaning":
    "Significado",
  "Mode":
    "Modo",
  "Max rate":
    "Velocidad máx.",
  " (VDD ≤ 2 V row)":
    " (fila VDD ≤ 2 V)",
  "   (* = E24 only)":
    "   (* = solo E24)",
  "Bus capacitance exceeds the {} pF maximum for this mode":
    "La capacidad del bus supera el máximo de {0} pF de este modo",
  "Minimum exceeds maximum — no pull-up fits this capacitance and speed (slow down, reduce capacitance or add a buffer)":
    "El mínimo supera al máximo: ninguna pull-up sirve para esta capacidad y velocidad (baje la velocidad, reduzca la capacidad o añada un buffer)",
  "Pick a resistor between {} and {}":
    "Elija una resistencia entre {0} y {1}",
  "Check the numbers — VDD and Cb must be above 0":
    "Revise los números: VDD y Cb deben ser mayores que 0",
  "Enter hex (7-bit is 0x00–0x7F)":
    "Escriba en hex (7 bits es 0x00–0x7F)",
  "7-bit":
    "7 bits",
  "write":
    "escritura",
  "read":
    "lectura",
  "binary":
    "binario",
  "1 (read)":
    "1 (lectura)",
  "0 (write)":
    "0 (escritura)",
  "Lowest bit of the value = {}":
    "Bit más bajo del valor = {0}",
  "Reserved: ":
    "Reservada: ",
  "General call / START byte":
    "Llamada general / byte START",
  "CBUS address (reserved)":
    "Dirección CBUS (reservada)",
  "Different bus format (reserved)":
    "Otro formato de bus (reservada)",
  "Future purposes (reserved)":
    "Usos futuros (reservada)",
  "Hs-mode master code (reserved)":
    "Código de maestro en modo Hs (reservada)",
  "10-bit address, first byte":
    "Dirección de 10 bits, primer byte",
  "Device ID (reserved)":
    "ID de dispositivo (reservada)",
  "Chips that can use this address: ":
    "Chips que pueden usar esta dirección: ",
  "No chip in this table":
    "Ningún chip de esta tabla",
  "START":
    "START",
  "Repeated START — to change direction":
    "START repetido: para cambiar de sentido",
  "STOP":
    "STOP",
  "ACK/NACK without a byte before it":
    "ACK/NACK sin un byte antes",
  "Address":
    "Dirección",
  "write (W)":
    "escritura (W)",
  "read (R)":
    "lectura (R)",
  "10-bit address":
    "Dirección de 10 bits",
  "address":
    "dirección",
  "Data {}":
    "Dato {0}",
  "device → master (read)":
    "dispositivo → maestro (lectura)",
  "master → device (write)":
    "maestro → dispositivo (escritura)",
  " — often a register/memory address":
    " — suele ser una dirección de registro/memoria",
  " — no device answered":
    " — no respondió ningún dispositivo",
  " — master ends the read (expected on the last byte)":
    " — el maestro termina la lectura (lo esperado en el último byte)",
  " — device refused the byte":
    " — el dispositivo rechazó el byte",
  "Cannot read: ":
    "No se puede leer: ",
  "RTC":
    "RTC",
  "Temperature/humidity":
    "Temperatura/humedad",
  "Temperature":
    "Temperatura",
  "Pressure/temperature":
    "Presión/temperatura",
  "Accel/gyro (IMU)":
    "Acelerómetro/giroscopio (IMU)",
  "Accelerometer":
    "Acelerómetro",
  "Magnetometer":
    "Magnetómetro",
  "OLED display":
    "Pantalla OLED",
  "I/O expander":
    "Expansor de E/S",
  "PWM/servo driver":
    "Driver PWM/servo",
  "Current/power monitor":
    "Monitor de corriente/potencia",
  "I2C multiplexer":
    "Multiplexor I2C",
  "Distance (ToF)":
    "Distancia (ToF)",
  "Light":
    "Luz",
  "Air quality / CO2":
    "Calidad del aire / CO2",
  "Magnetic angle sensor":
    "Sensor de ángulo magnético",
  "Capacitive touch":
    "Táctil capacitivo",
  "Clock generator":
    "Generador de reloj",
  "Secure element":
    "Elemento seguro",
  "Battery fuel gauge":
    "Medidor de batería (fuel gauge)",
  "Heart rate / SpO2":
    "Ritmo cardíaco / SpO2",
  "Fixed":
    "Fija",
  "A2/A1/A0 pins (larger parts use some bits for block select)":
    "Pines A2/A1/A0 (en las memorias grandes algunos bits seleccionan el bloque)",
  "ADDR pin low/high":
    "Pin ADDR a nivel bajo/alto",
  "ADD0 to GND, V+, SDA or SCL":
    "ADD0 a GND, V+, SDA o SCL",
  "SDO pin to GND/VDDIO":
    "Pin SDO a GND/VDDIO",
  "AD0 pin — 0x68 clashes with DS1307/DS3231":
    "Pin AD0: 0x68 choca con DS1307/DS3231",
  "SDO/SA0 pin":
    "Pin SDO/SA0",
  "COM3 pin":
    "Pin COM3",
  "ALT ADDRESS pin low → 0x53, high → 0x1D":
    "Pin ALT ADDRESS bajo → 0x53, alto → 0x1D",
  "SA0 pin":
    "Pin SA0",
  "SA0 (D/C#) pin":
    "Pin SA0 (D/C#)",
  "A2/A1/A0 — common on character LCD backpacks":
    "A2/A1/A0: habitual en las placas adaptadoras de LCD de caracteres",
  "A5–A0 (6 pins). 0x70 clashes with the default All Call address; 0x78 and up are reserved by I2C":
    "A5–A0 (6 pines). 0x70 choca con la dirección All Call por defecto; de 0x78 en adelante están reservadas por I2C",
  "ADDR to GND, VDD, SDA or SCL":
    "ADDR a GND, VDD, SDA o SCL",
  "Part variant (A0–A3) + A0 pin":
    "Variante de la pieza (A0–A3) + pin A0",
  "A1/A0 to GND, VS, SDA or SCL":
    "A1/A0 a GND, VS, SDA o SCL",
  "Default — changed in software":
    "Por defecto: se cambia por software",
  "ADDR pin low → 0x23, high → 0x5C":
    "Pin ADDR bajo → 0x23, alto → 0x5C",
  "ADDR SEL pin GND, float, VDD":
    "Pin ADDR SEL a GND, al aire o a VDD",
  "ADDR pin":
    "Pin ADDR",
  "Default (0x61 on some variants)":
    "Por defecto (0x61 en algunas variantes)",
  "Factory default (8-bit 0xC0) — configurable":
    "Por defecto de fábrica (8 bits 0xC0): configurable",
};
