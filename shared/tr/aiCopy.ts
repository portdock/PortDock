// 튀르키예어 — «AI'ya sormak için kopyala» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const TR_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Aşağıda ${app} kaydı var. Lütfen sorunun olası nedenlerini ve hangi sırayla denetleneceğini listeleyin.`,
  ask2: "Önce cihaz ayarlarına mı, kabloya mı yoksa PC'ye mi bakılacağını söyleyin ve bunu destekleyen kayıt satırlarını gösterin. Emin değilseniz başka neyi denetlemem gerektiğini söyleyin.",
  situation: "## Durum (yapıştırdıktan sonra doldurun)",
  situationLines: ["- Yapmaya çalıştığım:", "- Beklenen / gerçek sonuç:", "- Cihaz (üretici, model) ve bağlantı:"],
  kinds: {
    pc: {
      ask: (app: string) => `Aşağıda ${app} PC kontrol sonuçları var. Lütfen sorunun olası nedenlerini ve hangi sırayla denetleneceğini listeleyin.`,
      ask2: "Önce PC ayarlarına, sürücülere, kablosuz (Wi-Fi, Bluetooth) ortama mı yoksa yönlendiriciye mi bakılacağını söyleyin ve bunu destekleyen satırları gösterin. Emin değilseniz başka neyi denetlemem gerektiğini söyleyin.",
      situationLines: ["- Yapmaya çalıştığım:", "- Beklenen / gerçek sonuç:", "- PC ve kablosuz düzen (dizüstü/masaüstü, kablolu/kablosuz, yönlendirici veya cihaz modeli):"],
    },
    scan: {
      ask: (app: string) => `Aşağıda ${app} ile bulunan ağ cihazlarının listesi var. Aradığım cihazı bulmama ya da neden görünmediğini anlamama yardım edin.`,
      ask2: "Önce adres aralığına (alt ağ), cihazın IP ayarlarına, ağ bağdaştırıcısına mı yoksa anahtara mı bakılacağını söyleyin ve bunu destekleyen satırları gösterin. Emin değilseniz başka neyi denetlemem gerektiğini söyleyin.",
      situationLines: ["- Aradığım cihaz (üretici, model, bilinen IP):", "- Beklenen / gerçek sonuç:", "- PC ve cihaz nasıl bağlı (doğrudan, anahtar, fabrika ağı):"],
    },
    port: {
      ask: (app: string) => `Aşağıda ${app} port kontrol sonuçları var. Lütfen sorunun olası nedenlerini ve hangi sırayla denetleneceğini listeleyin.`,
      ask2: "Önce port numarasına, sürücüye, USB adaptöre mi yoksa güç tasarrufu ayarlarına mı bakılacağını söyleyin ve bunu destekleyen satırları gösterin. Emin değilseniz başka neyi denetlemem gerektiğini söyleyin.",
      situationLines: ["- Yapmaya çalıştığım:", "- Beklenen / gerçek sonuç:", "- Adaptör veya cihaz (üretici, model) ve kullanılan USB portu:"],
    },
  },
  found: "## Bulunan cihazlar",
  program: "## Program",
  state: "Mevcut durum",
  settings: "## Bağlantı ayarları",
  errors: (n: number) => `## Bu oturumdaki hatalar (${n})`,
  checks: "## Kontrol sonuçları",
  log: (n: number) => `## Son trafik (${n} satır)`,
  logFormat: "Biçim: zaman yön [karşı taraf] HEX | metin | programın eklediği not",
  logEmpty: "(trafik yok)",
  cutLines: (n: number, max: number) => `(${max.toLocaleString("en-US")} karaktere sığması için ${n} eski satır çıkarıldı)`,
  cutText: "…(kesildi — çok uzun)",
  masked: (ip: HideIp) => `_PortDock'un gizledikleri: kullanıcı klasörü, PC adı (DESKTOP-… vb.), MAC adreslerinin son 3 baytı, ${ip === "all" ? "tüm IP adresleri" : "genel IP adresleri"} («[IP-n]»)._`,
};
