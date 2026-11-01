// lib/modbusConvert.ts y conversor de tramas Modbus RTU ↔ TCP (views/ModbusRtuTcpPage.astro) — frase en inglés → español
// Términos: dirección de esclavo, identificador de unidad (Unit ID), identificador de transacción, pasarela (gateway), difusión (broadcast)
export default {
  "0 — broadcast (writes only, nobody replies)":
    "0 — difusión (solo escrituras, nadie responde)",
  "{} — reserved on a serial line (device addresses are 1 to 247)":
    "{0} — reservada en una línea serie (las direcciones de los equipos van de 1 a 247)",
  "0 — depending on the gateway, forwarded as a serial broadcast or taken as the gateway itself":
    "0 — según la pasarela, se reenvía como difusión serie o se toma como la propia pasarela",
  "255 (FF) — recommended for a TCP device addressed directly; a gateway usually does not forward it to the serial line":
    "255 (FF) — recomendado para un equipo TCP al que se dirige directamente; una pasarela normalmente no lo reenvía a la línea serie",
  "{} — outside serial addresses (1 to 247), so a gateway may not forward it":
    "{0} — fuera de las direcciones serie (1 a 247), así que una pasarela puede no reenviarlo",
  "{} — address of the serial device behind the gateway":
    "{0} — dirección del equipo serie detrás de la pasarela",
  "Rest":
    "Resto",
  "{} bytes":
    "{0} bytes",
  "An ASCII frame starts with «:»":
    "Una trama ASCII empieza por «:»",
  "Enter a frame":
    "Introduzca una trama",
  "Format chosen by hand":
    "Formato elegido a mano",
  "Starts with «:», so read as ASCII":
    "Empieza por «:», así que se lee como ASCII",
  "The CRC matches, so read as RTU (an MBAP header also fits — pick TCP if that is wrong)":
    "El CRC coincide, así que se lee como RTU (también encaja una cabecera MBAP: elija TCP si no es correcto)",
  "The trailing 2-byte CRC matches, so read as RTU":
    "El CRC de los 2 últimos bytes coincide, así que se lee como RTU",
  "Protocol ID is 0 and the length field equals the remaining byte count, so read as TCP":
    "El identificador de protocolo es 0 y el campo de longitud coincide con los bytes restantes, así que se lee como TCP",
  "Neither the CRC nor an MBAP header fits — read as RTU with a bad CRC":
    "No encajan ni el CRC ni una cabecera MBAP: se lee como RTU con CRC incorrecto",
  "An RTU frame is at least 4 bytes: address, function and a 2-byte CRC":
    "Una trama RTU tiene al menos 4 bytes: dirección, función y CRC de 2 bytes",
  "Slave address":
    "Dirección de esclavo",
  "OK (low byte first)":
    "Correcto (byte bajo primero)",
  "mismatch — correct value {}":
    "no coincide — valor correcto {0}",
  "CRC mismatch — received {}, correct {}. The last 2 bytes were taken as the CRC and dropped":
    "El CRC no coincide: recibido {0}, correcto {1}. Los 2 últimos bytes se han tomado como CRC y se han quitado",
  "An RTU frame is at most 256 bytes (got {})":
    "Una trama RTU tiene como máximo 256 bytes (llegaron {0})",
  "A Modbus TCP frame is at least 8 bytes: the 7-byte MBAP header plus a function code":
    "Una trama Modbus TCP tiene al menos 8 bytes: la cabecera MBAP de 7 bytes más un código de función",
  "Transaction ID":
    "Identificador de transacción",
  "{} — the response repeats the request's number":
    "{0} — la respuesta repite el número de la petición",
  "Protocol ID":
    "Identificador de protocolo",
  "{} — must be 0":
    "{0} — debe ser 0",
  "Length":
    "Longitud",
  "{} — Unit ID to the end (matches)":
    "{0} — del identificador de unidad al final (coincide)",
  "{} — {} bytes follow (mismatch)":
    "{0} — siguen {1} bytes (no coincide)",
  "Unit ID":
    "Identificador de unidad",
  "Protocol ID is not 0 — this may not be Modbus":
    "El identificador de protocolo no es 0: puede que no sea Modbus",
  "The length field ({}) differs from the bytes that follow ({}) — the frame may be cut off or two frames joined. Converted using the actual bytes":
    "El campo de longitud ({0}) no coincide con los bytes que siguen ({1}): la trama puede estar cortada o haber dos tramas unidas. Se convierte con los bytes reales",
  "The HEX characters after «:» must come in pairs (2 per byte)":
    "Los caracteres HEX tras «:» deben ir de dos en dos (2 por byte)",
  "Not a HEX digit: «{}»":
    "No es un dígito HEX: «{0}»",
  "An ASCII frame is at least 3 bytes (6 characters): address, function and LRC":
    "Una trama ASCII tiene al menos 3 bytes (6 caracteres): dirección, función y LRC",
  "Start":
    "Inicio",
  "3A — frame start":
    "3A — inicio de trama",
  "OK":
    "Correcto",
  "End":
    "Fin",
  "LRC mismatch — received {}, correct {}. The last byte was taken as the LRC and dropped":
    "El LRC no coincide: recibido {0}, correcto {1}. El último byte se ha tomado como LRC y se ha quitado",
  "The trailing CR LF (0D 0A) is missing — it must be sent":
    "Falta el CR LF final (0D 0A): hay que enviarlo",
  "The specification sends HEX in upper case — some devices reject lower case":
    "La especificación envía el HEX en mayúsculas: algunos equipos rechazan las minúsculas",
  "No function code":
    "Falta el código de función",
  "CRC16 0x{}{} — low byte first":
    "CRC16 0x{0}{1} — byte bajo primero",
  "{} — Unit ID 1 + PDU {}":
    "{0} — identificador de unidad 1 + PDU {1}",
  "Two's complement of the address + PDU byte sum":
    "Complemento a dos de la suma de bytes de dirección + PDU",
  "Slave address {} became the Unit ID. Through a gateway this becomes the address on the serial side":
    "La dirección de esclavo {0} ha pasado a ser el identificador de unidad. A través de una pasarela será la dirección en el lado serie",
  "The sender picks the Transaction ID — for a response, use the number from its request":
    "El identificador de transacción lo elige quien envía: en una respuesta, use el número de su petición",
  "Unit ID {} became the slave address. The Transaction ID ({}) has no place in a serial frame and is dropped":
    "El identificador de unidad {0} ha pasado a ser la dirección de esclavo. El identificador de transacción ({1}) no tiene sitio en una trama serie y se descarta",
  "Address 0 is a broadcast on a serial line — every device acts on it and none replies (read requests cannot be broadcast)":
    "La dirección 0 es una difusión en una línea serie: todos los equipos la ejecutan y ninguno responde (las peticiones de lectura no se pueden difundir)",
  "Address {} is not used on a serial line (1 to 247). Change it to the device's address":
    "La dirección {0} no se usa en una línea serie (1 a 247). Cámbiela por la dirección del equipo",
  "Function {} ({}) is serial-line only — a TCP device may reject it":
    "La función {0} ({1}) es solo de línea serie: un equipo TCP puede rechazarla",
  "The PDU is {} bytes, over the 253-byte maximum":
    "La PDU tiene {0} bytes, más del máximo de 253 bytes",
  "Field":
    "Campo",
  "Bytes":
    "Bytes",
  "Value":
    "Valor",
  "Copy":
    "Copiar",
  "Copied":
    "Copiado",
  "Copy failed — select it by hand":
    "No se pudo copiar: selecciónelo a mano",
  "Transaction ID must be a number from 0 to 65535":
    "El identificador de transacción debe ser un número de 0 a 65535",
  "Input":
    "Entrada",
  "bytes":
    "bytes",
  "Bytes on the wire: {}":
    "Bytes en la línea: {0}",
};
