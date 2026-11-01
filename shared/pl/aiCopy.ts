// 폴란드어 — «Kopia do pytania AI» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const PL_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Poniżej jest log z ${app}. Wypisz możliwe przyczyny problemu i kolejność, w jakiej mam je sprawdzić.`,
  ask2: "Powiedz, czy najpierw sprawdzić ustawienia urządzenia, okablowanie czy PC, i wskaż linie logu, które to potwierdzają. Jeśli nie masz pewności, powiedz, co jeszcze sprawdzić.",
  situation: "## Sytuacja (uzupełnij po wklejeniu)",
  situationLines: ["- Co próbowałem zrobić:", "- Oczekiwany / rzeczywisty wynik:", "- Urządzenie (producent, model) i połączenie:"],
  kinds: {
    pc: {
      ask: (app: string) => `Poniżej są wyniki sprawdzenia PC z ${app}. Wypisz możliwe przyczyny problemu i kolejność, w jakiej mam je sprawdzić.`,
      ask2: "Powiedz, czy najpierw sprawdzić ustawienia PC, sterowniki, otoczenie radiowe (Wi-Fi, Bluetooth) czy router, i wskaż linie, które to potwierdzają. Jeśli nie masz pewności, powiedz, co jeszcze sprawdzić.",
      situationLines: ["- Co próbowałem zrobić:", "- Oczekiwany / rzeczywisty wynik:", "- PC i sieć bezprzewodowa (laptop/stacjonarny, przewodowo/bezprzewodowo, model routera lub urządzenia):"],
    },
    scan: {
      ask: (app: string) => `Poniżej jest lista urządzeń sieciowych znalezionych przez ${app}. Pomóż mi znaleźć szukane urządzenie albo ustalić, dlaczego się nie pojawia.`,
      ask2: "Powiedz, czy najpierw sprawdzić zakres adresów (podsieć), ustawienia IP urządzenia, kartę sieciową czy switch, i wskaż linie, które to potwierdzają. Jeśli nie masz pewności, powiedz, co jeszcze sprawdzić.",
      situationLines: ["- Szukane urządzenie (producent, model, znany IP):", "- Oczekiwany / rzeczywisty wynik:", "- Połączenie PC z urządzeniem (bezpośrednio, switch, sieć zakładowa):"],
    },
    port: {
      ask: (app: string) => `Poniżej są wyniki sprawdzenia portu z ${app}. Wypisz możliwe przyczyny problemu i kolejność, w jakiej mam je sprawdzić.`,
      ask2: "Powiedz, czy najpierw sprawdzić numer portu, sterownik, konwerter USB czy ustawienia oszczędzania energii, i wskaż linie, które to potwierdzają. Jeśli nie masz pewności, powiedz, co jeszcze sprawdzić.",
      situationLines: ["- Co próbowałem zrobić:", "- Oczekiwany / rzeczywisty wynik:", "- Konwerter lub urządzenie (producent, model) i użyty port USB:"],
    },
  },
  found: "## Znalezione urządzenia",
  program: "## Program",
  state: "Stan bieżący",
  settings: "## Ustawienia połączenia",
  errors: (n: number) => `## Błędy w tej sesji (${n})`,
  checks: "## Wyniki sprawdzenia",
  log: (n: number) => `## Ostatni ruch (${n} linii)`,
  logFormat: "Format: czas kierunek [strona] HEX | tekst | uwaga dodana przez program",
  logEmpty: "(brak ruchu)",
  cutLines: (n: number, max: number) => `(usunięto ${n} starszych linii, aby zmieścić się w ${max.toLocaleString("pl-PL")} znakach)`,
  cutText: "…(ucięto — za długie)",
  masked: (ip: HideIp) => `_Ukryte przez PortDock: folder użytkownika, nazwa PC (DESKTOP-… itp.), ostatnie 3 bajty adresów MAC, ${ip === "all" ? "wszystkie adresy IP" : "publiczne adresy IP"} («[IP-n]»)._`,
};
