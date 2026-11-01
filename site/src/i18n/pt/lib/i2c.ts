// lib/i2c.ts e ferramentas I2C (views/I2cPage.astro) — frase em inglês → português do Brasil
// Termos: resistor de pull-up, capacitância do barramento, START repetido, chamada geral, expansor de E/S
export default {
  "EEPROM random read":
    "Leitura aleatória de EEPROM",
  "RTC time read":
    "Leitura da hora de um RTC",
  "Address NACK":
    "NACK de endereço",
  "Plain hex":
    "Hex simples",
  "Field":
    "Campo",
  "Byte":
    "Byte",
  "Meaning":
    "Significado",
  "Mode":
    "Modo",
  "Max rate":
    "Taxa máx.",
  " (VDD ≤ 2 V row)":
    " (linha VDD ≤ 2 V)",
  "   (* = E24 only)":
    "   (* = só E24)",
  "Bus capacitance exceeds the {} pF maximum for this mode":
    "A capacitância do barramento passa do máximo de {0} pF deste modo",
  "Minimum exceeds maximum — no pull-up fits this capacitance and speed (slow down, reduce capacitance or add a buffer)":
    "O mínimo é maior que o máximo — nenhum pull-up serve para esta capacitância e velocidade (reduza a velocidade, diminua a capacitância ou acrescente um buffer)",
  "Pick a resistor between {} and {}":
    "Escolha um resistor entre {0} e {1}",
  "Check the numbers — VDD and Cb must be above 0":
    "Confira os números — VDD e Cb precisam ser maiores que 0",
  "Enter hex (7-bit is 0x00–0x7F)":
    "Digite em hex (7 bits é 0x00–0x7F)",
  "7-bit":
    "7 bits",
  "write":
    "escrita",
  "read":
    "leitura",
  "binary":
    "binário",
  "1 (read)":
    "1 (leitura)",
  "0 (write)":
    "0 (escrita)",
  "Lowest bit of the value = {}":
    "Bit mais baixo do valor = {0}",
  "Reserved: ":
    "Reservado: ",
  "General call / START byte":
    "Chamada geral / byte START",
  "CBUS address (reserved)":
    "Endereço CBUS (reservado)",
  "Different bus format (reserved)":
    "Outro formato de barramento (reservado)",
  "Future purposes (reserved)":
    "Usos futuros (reservado)",
  "Hs-mode master code (reserved)":
    "Código de mestre do modo Hs (reservado)",
  "10-bit address, first byte":
    "Endereço de 10 bits, primeiro byte",
  "Device ID (reserved)":
    "ID do dispositivo (reservado)",
  "Chips that can use this address: ":
    "Chips que podem usar este endereço: ",
  "No chip in this table":
    "Nenhum chip desta tabela",
  "START":
    "START",
  "Repeated START — to change direction":
    "START repetido — para mudar de sentido",
  "STOP":
    "STOP",
  "ACK/NACK without a byte before it":
    "ACK/NACK sem um byte antes",
  "Address":
    "Endereço",
  "write (W)":
    "escrita (W)",
  "read (R)":
    "leitura (R)",
  "10-bit address":
    "Endereço de 10 bits",
  "address":
    "endereço",
  "Data {}":
    "Dado {0}",
  "device → master (read)":
    "dispositivo → mestre (leitura)",
  "master → device (write)":
    "mestre → dispositivo (escrita)",
  " — often a register/memory address":
    " — muitas vezes um endereço de registrador/memória",
  " — no device answered":
    " — nenhum dispositivo respondeu",
  " — master ends the read (expected on the last byte)":
    " — o mestre encerra a leitura (o esperado no último byte)",
  " — device refused the byte":
    " — o dispositivo recusou o byte",
  "Cannot read: ":
    "Não foi possível ler: ",
  "RTC":
    "RTC",
  "Temperature/humidity":
    "Temperatura/umidade",
  "Temperature":
    "Temperatura",
  "Pressure/temperature":
    "Pressão/temperatura",
  "Accel/gyro (IMU)":
    "Acelerômetro/giroscópio (IMU)",
  "Accelerometer":
    "Acelerômetro",
  "Magnetometer":
    "Magnetômetro",
  "OLED display":
    "Display OLED",
  "I/O expander":
    "Expansor de E/S",
  "PWM/servo driver":
    "Driver PWM/servo",
  "Current/power monitor":
    "Monitor de corrente/potência",
  "I2C multiplexer":
    "Multiplexador I2C",
  "Distance (ToF)":
    "Distância (ToF)",
  "Light":
    "Luz",
  "Air quality / CO2":
    "Qualidade do ar / CO2",
  "Magnetic angle sensor":
    "Sensor de ângulo magnético",
  "Capacitive touch":
    "Toque capacitivo",
  "Clock generator":
    "Gerador de clock",
  "Secure element":
    "Elemento seguro",
  "Battery fuel gauge":
    "Medidor de bateria (fuel gauge)",
  "Heart rate / SpO2":
    "Frequência cardíaca / SpO2",
  "Fixed":
    "Fixo",
  "A2/A1/A0 pins (larger parts use some bits for block select)":
    "Pinos A2/A1/A0 (nas memórias maiores alguns bits selecionam o bloco)",
  "ADDR pin low/high":
    "Pino ADDR em nível baixo/alto",
  "ADD0 to GND, V+, SDA or SCL":
    "ADD0 em GND, V+, SDA ou SCL",
  "SDO pin to GND/VDDIO":
    "Pino SDO em GND/VDDIO",
  "AD0 pin — 0x68 clashes with DS1307/DS3231":
    "Pino AD0 — 0x68 colide com DS1307/DS3231",
  "SDO/SA0 pin":
    "Pino SDO/SA0",
  "COM3 pin":
    "Pino COM3",
  "ALT ADDRESS pin low → 0x53, high → 0x1D":
    "Pino ALT ADDRESS baixo → 0x53, alto → 0x1D",
  "SA0 pin":
    "Pino SA0",
  "SA0 (D/C#) pin":
    "Pino SA0 (D/C#)",
  "A2/A1/A0 — common on character LCD backpacks":
    "A2/A1/A0 — comum nas placas adaptadoras de LCD de caracteres",
  "A5–A0 (6 pins). 0x70 clashes with the default All Call address; 0x78 and up are reserved by I2C":
    "A5–A0 (6 pinos). 0x70 colide com o endereço All Call padrão; de 0x78 em diante são reservados pelo I2C",
  "ADDR to GND, VDD, SDA or SCL":
    "ADDR em GND, VDD, SDA ou SCL",
  "Part variant (A0–A3) + A0 pin":
    "Variante da peça (A0–A3) + pino A0",
  "A1/A0 to GND, VS, SDA or SCL":
    "A1/A0 em GND, VS, SDA ou SCL",
  "Default — changed in software":
    "Padrão — muda por software",
  "ADDR pin low → 0x23, high → 0x5C":
    "Pino ADDR baixo → 0x23, alto → 0x5C",
  "ADDR SEL pin GND, float, VDD":
    "Pino ADDR SEL em GND, flutuando ou em VDD",
  "ADDR pin":
    "Pino ADDR",
  "Default (0x61 on some variants)":
    "Padrão (0x61 em algumas variantes)",
  "Factory default (8-bit 0xC0) — configurable":
    "Padrão de fábrica (8 bits 0xC0) — configurável",
};
