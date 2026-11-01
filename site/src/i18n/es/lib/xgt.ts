// lib/xgtDecode.ts y decodificador XGT (views/XgtDecoderPage.astro) — frase en inglés → español
// Términos según los manuales de LS ELECTRIC: protocolo dedicado XGT, ID de empresa, instrucción, bloque, variable, código de error, relé auxiliar, relé de mantenimiento
export default {
  "unknown error code":
    "código de error desconocido",
  "continuous (block)":
    "continua (bloque)",
  "unknown type":
    "tipo desconocido",
  "Read request (continuous)":
    "Petición de lectura (continua)",
  "Read request (individual)":
    "Petición de lectura (individual)",
  "Read response":
    "Respuesta de lectura",
  "Write request (continuous)":
    "Petición de escritura (continua)",
  "Write request (individual)":
    "Petición de escritura (individual)",
  "Write response":
    "Respuesta de escritura",
  "Status request":
    "Petición de estado",
  "Status response":
    "Respuesta de estado",
  "unknown instruction":
    "instrucción desconocida",
  "Number of blocks":
    "Número de bloques",
  "Variable length":
    "Longitud de la variable",
  "chars":
    "caracteres",
  "Variable":
    "Variable",
  "Number of data":
    "Número de datos",
  "bytes":
    "bytes",
  "Data to write":
    "Datos a escribir",
  "Data size":
    "Tamaño de los datos",
  "Value":
    "Valor",
  "Shorter than the 20-byte header + 2-byte instruction ({} bytes)":
    "Más corta que la cabecera de 20 bytes + instrucción de 2 bytes ({0} bytes)",
  "Company ID":
    "ID de empresa",
  "not LSIS-XGT/LGIS-GLOFA (error h75)":
    "no es LSIS-XGT/LGIS-GLOFA (error h75)",
  "PLC info":
    "Información del PLC",
  "not used in requests (h00)":
    "no se usa en las peticiones (h00)",
  "redundant slave":
    "esclavo redundante",
  "single/redundant master":
    "maestro simple/redundante",
  "CPU error":
    "error de CPU",
  "CPU running normally":
    "CPU funcionando sin errores",
  "state ":
    "estado ",
  "CPU info":
    "Información de la CPU",
  "unknown":
    "desconocida",
  "Source of frame":
    "Origen de la trama",
  "client → PLC (request)":
    "cliente → PLC (petición)",
  "PLC → client (response)":
    "PLC → cliente (respuesta)",
  "neither h33 nor h11":
    "ni h33 ni h11",
  "Length":
    "Longitud",
  "bytes (matches)":
    "bytes (coincide)",
  "actually {} bytes (error h76)":
    "en realidad {0} bytes (error h76)",
  "FEnet position":
    "Posición FEnet",
  "base":
    "base",
  "slot":
    "ranura",
  "correct (sum of the first 19 bytes)":
    "correcto (suma de los 19 primeros bytes)",
  "differs — computed":
    "distinto — calculado",
  " (error h77)":
    " (error h77)",
  "Instruction":
    "Instrucción",
  "Data type":
    "Tipo de datos",
  "Reserved":
    "Reservado",
  "don't care":
    "indiferente",
  "Source of frame is not h33, so PortDock PLC Simulator does not answer it.":
    "El origen de la trama no es h33, así que PortDock PLC Simulator no la responde.",
  "If only the BCC is wrong you can test with «Check header BCC» off in the app (the XBL-EMTA manual's table 5-6 example also differs from the header sum).":
    "Si solo falla el BCC, puede probar desactivando «Check header BCC» en la aplicación (el ejemplo de la tabla 5-6 del manual de XBL-EMTA tampoco coincide con la suma de la cabecera).",
  "Out of range (error 4) depends on the device sizes set in the app and is not checked here.":
    "Fuera de rango (error 4) depende de los tamaños de dispositivo configurados en la aplicación y aquí no se comprueba.",
  "Error status":
    "Estado de error",
  "h0000 normal (ACK)":
    "h0000 sin error (ACK)",
  "error (NAK)":
    "error (NAK)",
  "Error code":
    "Código de error",
  "Could not decode the matching request.":
    "No se pudo decodificar la petición correspondiente.",
  "Add the matching request to label each byte with its variable.":
    "Añada la petición correspondiente para etiquetar cada byte con su variable.",
  "block":
    "bloque",
  "A reply carries no variable names — add the matching request to label each block.":
    "Una respuesta no lleva nombres de variable: añada la petición correspondiente para etiquetar cada bloque.",
  "{} bytes left over at the end.":
    "Sobran {0} bytes al final.",
  "The reply body is shorter than its blocks and data sizes.":
    "El cuerpo de la respuesta es más corto que sus bloques y tamaños de datos.",
  "Enter a variable (e.g. %MW100)":
    "Introduzca una variable (p. ej., %MW100)",
  "Continuous takes one variable (%MB0 style)":
    "La lectura/escritura continua admite una sola variable (del tipo %MB0)",
  "Up to 16 variables":
    "Hasta 16 variables",
  "All variables must have the same type letter (X/B/W/D/L)":
    "Todas las variables deben tener la misma letra de tipo (X/B/W/D/L)",
  "Continuous takes a byte variable (%MB0 style) only":
    "La lectura/escritura continua solo admite una variable de byte (del tipo %MB0)",
  "Number of data must be 1–1400 bytes":
    "El número de datos debe estar entre 1 y 1400 bytes",
  "Continuous write values are bytes (0–255)":
    "Los valores de escritura continua son bytes (0–255)",
  "Enter one value per variable ({})":
    "Introduzca un valor por variable ({0})",
  "Value {} is out of range for {}":
    "El valor {0} está fuera de rango para {1}",
  "More than 16 blocks":
    "Más de 16 bloques",
  "Individual read/write with 0 or more than 16 blocks; continuous with a block count other than 1":
    "Lectura/escritura individual con 0 o más de 16 bloques; continua con un número de bloques distinto de 1",
  "Wrong data type":
    "Tipo de datos incorrecto",
  "Data type field not h00–h04 or h14, the variable's type letter (X/B/W/D/L) differs from it, write data size differs from the type, or continuous with a non-byte variable":
    "Campo de tipo de datos que no es h00–h04 ni h14, letra de tipo de la variable (X/B/W/D/L) distinta de él, tamaño de los datos de escritura distinto del tipo, o lectura/escritura continua con una variable que no es de byte",
  "Device not serviced":
    "Dispositivo no admitido",
  "Device letter not P/M/K/F/T/C/D/L/N, or the name does not start with «%», is over 16 characters or the number is not decimal":
    "Letra de dispositivo que no es P/M/K/F/T/C/D/L/N, o nombre que no empieza por «%», tiene más de 16 caracteres o un número que no es decimal",
  "Device area exceeded":
    "Área de dispositivo superada",
  "The number is beyond the device size (set in the app)":
    "El número supera el tamaño del dispositivo (configurado en la aplicación)",
  "Over 1,400 bytes (block)":
    "Más de 1400 bytes (bloque)",
  "Continuous read/write of more than 1,400 bytes":
    "Lectura/escritura continua de más de 1400 bytes",
  "Over 1,400 bytes (total)":
    "Más de 1400 bytes (total)",
  "(not used by the app — 16 individual blocks never exceed 1,400 bytes)":
    "(la aplicación no lo usa: 16 bloques individuales nunca superan 1400 bytes)",
  "Wrong company ID":
    "ID de empresa incorrecto",
  "The first 10 bytes are neither «LSIS-XGT»+00 00 nor «LGIS-GLOFA»":
    "Los 10 primeros bytes no son ni «LSIS-XGT»+00 00 ni «LGIS-GLOFA»",
  "Wrong header length":
    "Longitud de cabecera incorrecta",
  "The header length field differs from the bytes that follow, or the body is shorter/longer than the blocks and name lengths say":
    "El campo de longitud de la cabecera no coincide con los bytes que siguen, o el cuerpo es más corto/largo de lo que indican los bloques y las longitudes de nombre",
  "Wrong header checksum":
    "Suma de comprobación de cabecera incorrecta",
  "BCC (sum of the first 19 bytes) differs — not checked when «Check header BCC» is off in the app":
    "El BCC (suma de los 19 primeros bytes) no coincide; no se comprueba si «Check header BCC» está desactivado en la aplicación",
  "Wrong instruction":
    "Instrucción incorrecta",
  "Instruction other than h0054/h0058 (status read h00B0 included)":
    "Instrucción distinta de h0054/h0058 (incluida la lectura de estado h00B0)",
  "I/O relay":
    "Relé de E/S",
  "Auxiliary relay":
    "Relé auxiliar",
  "Keep relay":
    "Relé de mantenimiento",
  "Special relay":
    "Relé especial",
  "Timer":
    "Temporizador",
  "Counter":
    "Contador",
  "Data register":
    "Registro de datos",
  "Link relay":
    "Relé de enlace",
  "Communication data register":
    "Registro de datos de comunicación",
  "Field":
    "Campo",
  "Raw":
    "Valor bruto",
  "Meaning":
    "Significado",
  "Request":
    "Petición",
  "Reply":
    "Respuesta",
  "Error code PortDock PLC Simulator would return: ":
    "Código de error que devolvería PortDock PLC Simulator: ",
  "none (ACK)":
    "ninguno (ACK)",
  "Header (20 bytes)":
    "Cabecera (20 bytes)",
  "Instruction and data":
    "Instrucción y datos",
  "Values":
    "Valores",
  "Bytes":
    "Bytes",
  "Decimal":
    "Decimal",
  "Invoke ID must be 0–65535":
    "El Invoke ID debe estar entre 0 y 65535",
  "Values must be decimal or 0x hex":
    "Los valores deben ser decimales o hex con 0x",
};
