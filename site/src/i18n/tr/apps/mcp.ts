// PortDock MCP — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock MCP — COM portlarını ve Modbus'ı yapay zekâdan okuyun",
    desc: "Claude Desktop için ücretsiz MCP sunucusu: COM port raporu, Modbus, MC, SCPI değerlerini okur. Yalnızca 127.0.0.1 simülatörlerine yazar.",
  },
  summary: "Yapay zekâ istemcilerinin (Claude Desktop, VS Code, Cursor …) başlattığı penceresiz bir MCP sunucusu. Yapay zekâ bu PC'nin COM portlarını ve ağ bağdaştırıcılarını okur; adını verdiğiniz cihazlardan Modbus, MC protokolü ve SCPI değerlerini okur. Yazma araçları yalnızca bu PC'nin adresini (127.0.0.1) kabul eder ve simülatörler içindir. 0.10.0'dan itibaren Modbus yazmaları yalnızca kendini PortDock olarak tanıtan hedefe gider. MC yazmaları yalnızca adrese göre denetlenir; bu PC'deki bir program başka bir cihaza yönlendirirse (TCP rölesi, ağ geçidi veya tünel) yazma gerçek bir cihaza ulaşabilir.",
  who: [
    "COM port ve USB adaptör sorunlarına bir yapay zekâ asistanıyla birlikte bakmak isteyenler",
    "Modbus, MC veya SCPI değerlerini bir yapay zekâ sohbetinde okumak isteyen geliştiriciler",
    "Yapay zekâ araç kullanımını gerçek cihazlar yerine simülatörlerde deneyenler",
  ],
  features: [
    {
      title: "Dokuz okuma aracı",
      body: "COM port listesi, Port Inspector raporu, seri dinleme (hiçbir şey göndermez), Modbus okumaları (FC 01–04), MC 3E toplu okuma, SCPI sorguları, ping, ağ bağdaştırıcıları ve cihaz kayıt haritaları.",
    },
    {
      title: "Yalnızca 127.0.0.1 simülatörlerine yazma",
      body: "Bu PC'deki Modbus Slave veya PLC Simulator ile «yaz, sonra geri oku» alıştırması yapın. Başka her adres bağlanmadan reddedilir. 0.10.0'dan itibaren Modbus yazmaları ayrıca hedefin kendini «PortDock» olarak tanıtmasını (FC 2B/0E) gerektirir; MC yazmaları yalnızca adrese göre denetlenir, bu yüzden bir röle programı çalışırken kullanmayın.",
    },
    {
      title: "Yalnızca SCPI sorguları",
      body: "«?» ile biten tek bir sorgu gönderir; *TST?, *CAL? ve *RST gibi durumu değiştirebilenler reddedilir. Yeni ölçüm başlatan READ? ve MEAS…? varsayılan olarak reddedilir, yalnızca allow_measure ile izin verdiğinizde gönderilir (0.8.0'dan beri). Yalnızca son değeri okumak için FETC? kullanın.",
    },
    {
      title: "Oturum kaydı ve hız sınırları",
      body: "Her çağrı bu PC'de JSON satırları olarak tutulur ve asla dışarı gönderilmez. Aynı hedefe en çok 100 ms'de bir, dakikada 120 çağrı.",
    },
    {
      title: "Kişisel veriler maskelenir",
      body: "Sonuçlardaki kullanıcı klasörü yolları «~», MAC adresleri «xx-…» ve ağ adları «(hidden)» olur.",
    },
    {
      title: "Kurulacak tek dosya",
      body: "Python, Node veya Docker gerekmez: bir .mcpb (Claude Desktop'ta açın) ya da bir zip içinde tek exe.",
    },
  ],
  steps: [
    "PortDock-MCP.mcpb dosyasını Claude Desktop'ta açın (diğer istemciler: zip'teki exe yolunu ayarlarına yazın)",
    "Yapay zekâya «list my COM ports» gibi bir şey sorun — istemci her araç çağrısından önce size sorar",
    "Bir cihazı okumak için adresi, portu ve birimi verin. 127.0.0.1'de Modbus Slave veya PLC Simulator ile alıştırma yapın",
  ],
  faq: [
    {
      q: "Yapay zekâ cihaz ayarlarını değiştirebilir mi?",
      a: "İki yazma aracı yalnızca hedef 127.0.0.1 veya localhost (bu PC) olduğunda çalışır; başka her adres bağlanmadan reddedilir. 0.10.0'dan itibaren modbus_write_sim yalnızca hedef, cihaz kimliği sorgusuna (FC 2B/0E) «PortDock» ile başlayan bir üretici adıyla yanıt verirse yazar; böylece PortDock Serial'ın Modbus TCP ↔ RTU ağ geçidinin (varsayılan 127.0.0.1:502) arkasındaki gerçek cihazlara yazmaz. mc_write_sim yalnızca adrese göre denetlenir; bu PC'deki bir program başka bir cihaza yönlendirirse (TCP rölesi, üretici ağ geçidi, SSH tüneli …) yazma gerçek bir cihaza ulaşabilir — böyle bir program çalışırken yazma araçlarını kullanmayın.",
    },
    {
      q: "Dışarıya ne gönderir?",
      a: "PortDock MCP kendisi yalnızca sizin verdiğiniz cihaz adresleri ve portlarıyla konuşur; oturum kaydı bu PC'de kalır. Araç sonuçları kullandığınız yapay zekâ istemcisine gider, dolayısıyla oradan sonra o istemcinin ilkeleri geçerlidir.",
    },
  ],
};
