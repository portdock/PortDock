// Pt100 ve termokupl sıcaklık dönüştürücü (views/TemperaturePage.astro) — 5. grup. Terimler: direnç termometresi (RTD), termokupl, termoelektrik gerilim (EMK), soğuk uç kompanzasyonu, referans fonksiyonu
// Termokupl tip adları (K tipi…) ve hata cümleleri lib/temperature tablosunda. src2, its90.nist.gov bağlantısından önceki ve sonraki iki parça
// mmNote’tan sonraki bağlantı uygulama adı (PortDock Modbus Master, aynen), nNote’tan sonraki bağlantı metnini ekran pageName() ile koyar
export default {
  title: "Pt100 ve termokupl sıcaklık dönüştürücü",
  seo: "Pt100 ve termokupl hesaplama: Ω, mV ↔ °C — PortDock",
  desc: "Pt100/Pt1000 direncini ve K, J, T, E, N, R, S, B tipi termokupl mV değerini sıcaklığa ve tersine çevirir. IEC 60751 ve NIST ITS-90, soğuk uç kompanzasyonuyla.",
  rtdTitle: "Direnç termometresi (RTD)",
  sensor: "Sensör",
  temp: "Sıcaklık (°C)",
  res: "Direnç (Ω)",
  tcTitle: "Termokupl",
  type: "Tip",
  cj: "Soğuk uç sıcaklığı (°C)",
  emf: "Ölçülen gerilim (mV)",
  emf0: "EMK (0 °C referans)",
  range: "Aralık",
  rtdNote: "α = 0.00385, -200 ile 850 °C arası",
  tcNote: "Sıcaklık → mV tüm «Aralık» boyunca, mV → sıcaklık yalnızca NIST ters fonksiyon aralığında hesaplanır.",
  tableTitle: "Sıcaklık tablosu",
  step: "Adım (°C)",
  tableNote: "Termokupl tabloları, NIST tablolarındaki gibi 0 °C soğuk uç kullanır.",
  how: "Her şey tarayıcınızda hesaplanır; girdiğiniz hiçbir şey bir yere gönderilmez. Aralık dışındaki değerler hesaplanmaz, bildirilir.",
  srcTitle: "Denklemler ve kaynaklar",
  faqTitle: "Sık sorulan sorular",
  faq: [
    [
      "Soğuk uç kompanzasyonu nasıl çalışır?",
      "Termokuplun gerilimi ölçüm ucu ile soğuk uç (klemensler) arasındaki sıcaklık farkına bağlıdır. Soğuk ucun EMK’sını ölçülen mV’ye ekleyip çevirin: E(t) = E ölçülen + E(soğuk uç). Ters yönde beklenen okuma E(t) − E(soğuk uç)’tur.",
    ],
    [
      "Pt100 ile Pt1000 arasındaki fark nedir?",
      "Yalnızca 0 °C’deki direnç (R0): 100 Ω veya 1000 Ω. İkisi de aynı denklemi kullanır (α = 0.00385), bu yüzden her sıcaklıkta Pt1000, Pt100’ün on katını okur.",
    ],
    [
      "mV → sıcaklık aralığı neden daha dar?",
      "NIST, sıcaklık → mV referans fonksiyonunun tersini parçalı yaklaşımlar olarak yayımlar. Bu araç mV → sıcaklığı yalnızca bu yaklaşımların geçerli olduğu yerde çevirir; ör. K tipi −200 ile 1372 °C, B tipi 250 ile 1820 °C arası.",
    ],
  ],
  src1: "RTD: IEC 60751’in Callendar–Van Dusen denklemi. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (0 °C ve üstünde C = 0). Direnç → sıcaklık 0 °C ve üstünde ikinci derece denklemin kökünü, altında yinelemeyi kullanır.",
  src2: [
    "Termokupllar: NIST ITS-90 Thermocouple Database’in (NIST SRD 60, NIST Monograph 175) yayımladığı referans fonksiyonları E = Σ cᵢ·tⁱ (K tipi 0 °C’nin üstünde a₀·exp(a₁·(t − a₂)²) ekler) ve ters katsayılar; tip başına dosyalardan kopyalanmıştır:",
    ". mV → sıcaklık ters fonksiyondan başlar ve referans fonksiyonuna göre inceltilir. Buradaki sıcaklık → mV, NIST tablolarının her değeriyle (0.001 mV) örtüşür.",
  ],
  rngHead: ["Sıcaklık → mV", "mV → sıcaklık"],
  mmNote: "Sıcaklık kontrol cihazlarını veya transmiterleri Modbus üzerinden okumak için:",
  mmEnd: ".",
  nNote: "NTC termistörler (B değeri, Steinhart–Hart) için:",
  nEnd: ".",
};
