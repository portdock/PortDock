// Pt100 ve termokupl sıcaklık dönüştürücü (lib/temperature.ts aralık hataları, views/TemperaturePage.astro tip adları ve ekran betiği), 5. grup. İngilizce cümle → Türkçe (anahtar koddaki İngilizce cümlenin aynısı, {} yerleri {0} {1} …)
// «mV-to-temperature» ve «measured mV (cold junction {} °C)» önce çevrilir, sonra «Outside the type {} {} range …» cümlesinin {1} yerine girer
export default {
  "Type {}": "{0} tipi",
  "Type {} thermocouple": "{0} tipi termokupl",
  "Type {} (mV)": "{0} tipi (mV)",
  "Not a number: «{}»": "Sayı değil: «{0}»",
  "Outside the RTD range ({} to {} °C)": "RTD aralığının dışında ({0} ile {1} °C arası)",
  "Resistance outside the range ({} to {} Ω)": "Direnç aralığın dışında ({0} ile {1} Ω arası)",
  "Outside the type {} range ({} to {} °C)": "{0} tipi aralığının dışında ({1} ile {2} °C arası)",
  "Outside the type {} {} range ({} to {} mV, {} to {} °C)": "{0} tipi için {1} aralığının dışında ({2} ile {3} mV, {4} ile {5} °C arası)",
  "mV-to-temperature": "mV → sıcaklık",
  "measured mV (cold junction {} °C)": "ölçülen mV (soğuk uç {0} °C)",
};
