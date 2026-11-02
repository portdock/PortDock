// metricThreads — polski (źródło: angielska wersja views/MetricThreadsPage.astro).
export default {
  h1: "Gwinty metryczne: średnice wierteł pod gwint i tabela śrub",
  desc: "Skok i wiertło pod gwint (d − P) dla gwintów metrycznych M2–M20 oraz rozmiary kluczy imbusowych (ISO 4762) i płaskich (ISO 4032).",
  seo: "Wiertła pod gwint metryczny, klucze imbusowe i płaskie — PortDock",
  find: "Wyszukaj gwint",
  thread: "Gwint (np. M8, M10x1.25)",
  bad: "Brak w tabeli — wpisz M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 lub M20 ze skokiem zwykłym lub drobnym.",
  k: { p: "Skok", kind: "Rodzaj", coarse: "Zwykły", fine: "Drobny", drill: "Wiertło pod gwint ≈ d − P", key: "Klucz imbusowy (śruba z łbem walcowym ISO 4762)", sp: "Klucz płaski (nakrętka ISO 4032, śruba ISO 4014/4017)", din: "DIN 934 (stara norma)" },
  rev: "Szukaj według rozmiaru narzędzia",
  bySp: "Klucz płaski (mm)",
  byKey: "Klucz imbusowy (mm)",
  tTitle: "Tabela gwintów metrycznych (M2–M20)",
  tHead: ["Gwint", "Skok zwykły", "Wiertło pod gwint", "Skok drobny (wiertło)", "Klucz imbusowy", "Klucz płaski"],
  tNote:
    "Wiertło d − P to przybliżenie dla gwintowników skrawających. W praktyce użyj najbliższego posiadanego wiertła i dostosuj do materiału i głębokości gwintu. Gwintowniki wygniatające (walcowe) wymagają innej średnicy wiertła — zobacz tabelę producenta gwintownika. Rozmiary kluczy płaskich są wg ISO 4032; stare nakrętki DIN 934 mają 17 mm dla M10, 19 mm dla M12 i 22 mm dla M14.",
  torqueTitle: "Moment dokręcania",
  torque:
    "Moment dokręcania śrub zależy od klasy wytrzymałości (8.8, A2-70 itd.), smarowania i materiału współpracującego, a listwy zaciskowe, wyłączniki i styczniki mają własny moment podany przez producenta (nadrukowany na elemencie lub w karcie katalogowej). Ta tabela nie zawiera wartości momentów — sprawdź wartość producenta i użyj wkrętaka dynamometrycznego.",
  privacy: "Ta strona wyszukuje w Twojej przeglądarce; to, co wpiszesz, nie jest wysyłane na serwer.",
  srcTitle: "Źródła",
  see: ["Końcówki oczkowe pasujące do śruby znajdziesz w narzędziu ", ". Do przeliczania cali na mm użyj ", "."],
  isoNut: "Nakrętki sześciokątne zwykłe (typ 1)",
  dinNut: "dawna norma nakrętek sześciokątnych",
  faqTitle: "FAQ",
  faq: [
    ["Dlaczego wiertło pod gwint to «d − P»?", "To zwykłe przybliżenie dla gwintowników skrawających (średnica nominalna minus skok). W praktyce użyj najbliższego posiadanego wiertła i dostosuj do materiału i głębokości gwintu. Gwintowniki wygniatające (walcowe) wymagają innego wiertła — zobacz tabelę producenta gwintownika."],
    ["Rozmiar mojego klucza nie zgadza się z tabelą", "Stare nakrętki DIN 934 mają inne rozmiary kluczy niż ISO 4032 dla M10, M12 i M14. Sprawdź wartość «DIN 934» w tabeli."],
    ["Dlaczego nie ma momentu dokręcania?", "Zależy od klasy wytrzymałości śruby, smarowania i materiału współpracującego, a listwy zaciskowe, wyłączniki i styczniki mają własny moment od producenta. Kieruj się oznaczeniem produktu lub kartą katalogową."],
  ] as [string, string][],
};
