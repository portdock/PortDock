// Pemeriksa hasil ukur multimeter — cara mengukur, dasar, dan kolom input per item (views/MultimeterCheckPage.astro) serta gambar pengukuran (lib/meterFig.ts). Hanya digambar di server
export default {
  // Gambar pengukuran (meterFig)
  "RS-485 device terminals": "Terminal perangkat RS-485",
  "All devices powered off · wiring left in place": "Semua perangkat mati · pengawatan dibiarkan terpasang",
  "Power on · polling stopped": "Daya menyala · polling dihentikan",
  "Power on · ① A–SG, ② B–SG": "Daya menyala · ① A–SG, ② B–SG",
  "Terminals at the far device": "Terminal di perangkat terjauh",
  "Load switched on · at the device end": "Beban menyala · di sisi perangkat",
  "Sensor wires (3-wire)": "Kabel sensor (3 kawat)",
  "Brown +V": "Cokelat +V",
  "Black out": "Hitam output",
  "Blue 0V": "Biru 0V",
  "Connected to the PLC input · ON and OFF": "Tersambung ke input PLC · ON dan OFF",
  "PC-side DB9 (DTE)": "DB9 sisi PC (DTE)",
  "Not transmitting · device may be unplugged": "Tidak mengirim · perangkat boleh dilepas",
  "USB shell": "Selubung USB",
  Equipment: "Perangkat",
  "Both powered · DC and AC": "Keduanya menyala · DC dan AC",
  "Break the loop at one point, meter in series (mA jack)": "Putus loop di satu titik, multimeter seri (jack mA)",
  Supply: "Catu daya",
  "Trans-": "Trans-",
  mitter: "mitter",
  "PLC input 250Ω": "Input PLC 250Ω",
  // Cara mengukur, dasar, dan kolom input per item (MultimeterCheckPage)
  "Power off every device, leave the wiring as it is, and measure resistance (Ω) across A–B at any device. Enter the device count and bias resistors to compare with expected values.":
    "Matikan semua perangkat, biarkan pengawatan apa adanya, lalu ukur resistansi (Ω) di antara A–B pada perangkat mana saja. Masukkan jumlah perangkat dan resistor bias untuk membandingkan dengan nilai perkiraan.",
  "Two 120 Ω terminations in parallel make 60 Ω. A receiver is typically 12 kΩ (one unit load); bias resistors can appear in series through a powered-off supply. Modbus spec: termination at both ends only (150 Ω, or 1 nF + 120 Ω in series). RC termination (1 nF in series) blocks DC, so a multimeter cannot see it.":
    "Dua terminasi 120 Ω yang paralel menjadi 60 Ω. Satu penerima biasanya 12 kΩ (satu unit load); resistor bias bisa tampak seri melalui catu daya yang mati. Spesifikasi Modbus: terminasi hanya di kedua ujung (150 Ω, atau 1 nF + 120 Ω seri). Terminasi RC (1 nF seri) memblokir DC, sehingga tidak terlihat oleh multimeter.",
  "Reading (Ω, OL allowed)": "Bacaan (Ω, boleh OL)",
  "Transceivers (incl. adapter)": "Transceiver (termasuk konverter)",
  Terminator: "Terminasi",
  "Bias resistor (each)": "Resistor bias (masing-masing)",
  "None / unknown": "Tidak ada / tidak tahu",
  "With power on and polling stopped (nobody transmitting), put red on B (D1·+) and black on A (D0·−) and measure DC volts.":
    "Dengan daya menyala dan polling dihentikan (tidak ada yang mengirim), tempelkan probe merah ke B (D1·+) dan hitam ke A (D0·−), lalu ukur tegangan DC.",
  "TIA/EIA-485: receivers have a defined state beyond ±200 mV differential. Positive while idle means «1» (mark).":
    "TIA/EIA-485: penerima berada pada keadaan pasti di luar ±200 mV diferensial. Positif saat diam berarti «1» (mark).",
  Unit: "Satuan",
  "Power on, then measure DC volts ① from A to SG (common · 0 V) and ② from B to SG. Entering only one is fine.":
    "Nyalakan daya, lalu ukur tegangan DC ① dari A ke SG (common · 0 V) dan ② dari B ke SG. Mengisi salah satu saja juga boleh.",
  "TIA/EIA-485: receiver common-mode range −7 to +12 V; usually between 0 and 5 V.": "TIA/EIA-485: rentang common mode penerima −7 sampai +12 V; biasanya di antara 0 dan 5 V.",
  "Break the loop at one point and insert the meter in series on its mA jack — or divide the voltage across the receiver resistor (e.g. 250 Ω) by its value.":
    "Putus loop di satu titik dan pasang multimeter secara seri di jack mA-nya — atau bagi tegangan pada resistor penerima (mis. 250 Ω) dengan nilainya.",
  "NAMUR NE 43: measurement 3.8–20.5 mA, failure signal ≤ 3.6 mA or ≥ 21 mA. 4 mA = 0 %, 20 mA = 100 %.": "NAMUR NE 43: rentang ukur 3,8–20,5 mA, sinyal kegagalan ≤ 3,6 mA atau ≥ 21 mA. 4 mA = 0 %, 20 mA = 100 %.",
  "Current (mA)": "Arus (mA)",
  "With loads such as valves and relays switched on, measure +24V–0V at the far device, not at the supply.": "Dengan beban seperti katup dan relai menyala, ukur +24V–0V di perangkat terjauh, bukan di catu daya.",
  "IEC 61131-2: 24 V DC supplies are generally allowed −15 % to +20 % (20.4–28.8 V). A drop of 5 % or less leaves margin.":
    "IEC 61131-2: catu 24 V DC umumnya diizinkan −15 % sampai +20 % (20,4–28,8 V). Penurunan 5 % atau kurang masih menyisakan margin.",
  "Nominal (V)": "Nominal (V)",
  "Measured (V)": "Hasil ukur (V)",
  "With the sensor connected to the PLC input, measure DC volts between the output (usually black) and 0 V (blue), once with the sensor ON and once OFF.":
    "Dengan sensor tersambung ke input PLC, ukur tegangan DC di antara output (biasanya hitam) dan 0 V (biru), sekali saat sensor ON dan sekali saat OFF.",
  "IEC 61131-2 24 V DC inputs: ON ≥ 15 V (type 1) or ≥ 11 V (types 2/3), OFF ≤ 5 V. For NPN, input voltage = supply − output.":
    "Input 24 V DC IEC 61131-2: ON ≥ 15 V (tipe 1) atau ≥ 11 V (tipe 2/3), OFF ≤ 5 V. Untuk NPN, tegangan input = catu − output.",
  "Sensor type": "Jenis sensor",
  "Sensor state (LED)": "Keadaan sensor (LED)",
  ON: "ON",
  OFF: "OFF",
  "Output–0V (V)": "Output–0V (V)",
  "Sensor supply (V)": "Catu sensor (V)",
  "While nothing is sent, measure DC volts between pin 3 (TXD) and pin 5 (GND) of the PC-side DB9. Some adapters only drive TX once the port is open.":
    "Selama tidak ada yang dikirim, ukur tegangan DC di antara pin 3 (TXD) dan pin 5 (GND) DB9 sisi PC. Sebagian konverter baru menggerakkan TX setelah port dibuka.",
  "TIA-232: idle (mark) output −5 to −15 V, receiver threshold ±3 V, max ±25 V. +3.3/+5 V indicates a TTL UART.":
    "TIA-232: output saat diam (mark) −5 sampai −15 V, ambang penerima ±3 V, maks. ±25 V. +3,3/+5 V menandakan UART TTL.",
  "Measure between the PC's USB shell (or PC ground) and the device SG/PE, in both DC (V⎓) and AC (V~). Enter the larger.":
    "Ukur di antara selubung USB PC (atau ground PC) dan SG/PE perangkat, dalam DC (V⎓) dan AC (V~). Masukkan yang lebih besar.",
  "Rule of thumb: under 1 V is comfortable; a few volts shrinks the RS-485 common-mode margin and drives current through non-isolated USB and RS-232.":
    "Aturan praktis: di bawah 1 V aman; beberapa volt sudah menggerus margin common mode RS-485 dan mengalirkan arus lewat USB dan RS-232 tanpa isolasi.",
  "Difference (V)": "Beda tegangan (V)",
  "Programmable controllers: equipment requirements (24 V DC supply, digital input types)": "Programmable controller: persyaratan peralatan (catu 24 V DC, tipe input digital)",
  "Interface for serial binary data interchange (signal levels)": "Antarmuka pertukaran data biner serial (level sinyal)",
};
