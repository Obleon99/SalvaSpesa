import { hasWholeTerm, normalizeText } from "./text";

export const MONTH_NAMES = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export const monthName = (month: number): string => MONTH_NAMES[((month % 12) + 12) % 12];

interface Produce {
  label: string;
  kind: "frutta" | "verdura";
  // Nomi (parole intere) con cui compare nei prodotti.
  names: string[];
  // Mesi di stagione in Italia (1 = gennaio); gli intervalli a cavallo d'anno sono già espansi.
  months: number[];
}

const range = (from: number, to: number): number[] => {
  const months: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    months.push(m);
    if (m === to) break;
  }
  return months;
};

// Calendario di frutta e verdura di stagione per l'Italia (fonti: calendari CREA e Coldiretti, sintetizzati).
const PRODUCE: Produce[] = [
  { label: "Mele", kind: "frutta", names: ["mela", "mele"], months: range(9, 3) },
  { label: "Pere", kind: "frutta", names: ["pera", "pere"], months: range(8, 1) },
  { label: "Uva", kind: "frutta", names: ["uva"], months: range(8, 11) },
  { label: "Cachi", kind: "frutta", names: ["cachi", "kaki"], months: range(10, 12) },
  { label: "Melagrane", kind: "frutta", names: ["melagrana", "melagrane", "melograno"], months: range(10, 12) },
  { label: "Castagne", kind: "frutta", names: ["castagna", "castagne", "marroni"], months: range(10, 12) },
  { label: "Fichi", kind: "frutta", names: ["fico", "fichi"], months: range(7, 9) },
  { label: "Arance", kind: "frutta", names: ["arancia", "arance"], months: range(11, 4) },
  { label: "Mandarini", kind: "frutta", names: ["mandarino", "mandarini"], months: range(11, 2) },
  { label: "Clementine", kind: "frutta", names: ["clementina", "clementine"], months: range(11, 2) },
  { label: "Pompelmi", kind: "frutta", names: ["pompelmo", "pompelmi"], months: range(11, 4) },
  { label: "Limoni", kind: "frutta", names: ["limone", "limoni"], months: range(10, 5) },
  { label: "Kiwi", kind: "frutta", names: ["kiwi"], months: range(11, 4) },
  { label: "Fragole", kind: "frutta", names: ["fragola", "fragole"], months: range(4, 6) },
  { label: "Ciliegie", kind: "frutta", names: ["ciliegia", "ciliegie"], months: range(5, 7) },
  { label: "Albicocche", kind: "frutta", names: ["albicocca", "albicocche"], months: range(6, 7) },
  { label: "Pesche", kind: "frutta", names: ["pesca", "pesche", "nettarina", "nettarine", "percoche"], months: range(6, 9) },
  { label: "Susine", kind: "frutta", names: ["susina", "susine", "prugna", "prugne"], months: range(6, 9) },
  { label: "Meloni", kind: "frutta", names: ["melone", "meloni"], months: range(6, 9) },
  { label: "Angurie", kind: "frutta", names: ["anguria", "angurie", "cocomero", "cocomeri"], months: range(6, 8) },
  { label: "Frutti di bosco", kind: "frutta", names: ["mirtilli", "lamponi", "more", "ribes"], months: range(6, 9) },

  { label: "Zucca", kind: "verdura", names: ["zucca"], months: range(9, 2) },
  { label: "Funghi porcini", kind: "verdura", names: ["porcini"], months: range(9, 11) },
  { label: "Cavolfiori", kind: "verdura", names: ["cavolfiore", "cavolfiori"], months: range(10, 3) },
  { label: "Broccoli", kind: "verdura", names: ["broccolo", "broccoli", "broccoletti"], months: range(10, 3) },
  { label: "Cavoli e verze", kind: "verdura", names: ["cavolo", "cavoli", "verza", "verze", "cappuccio"], months: range(10, 3) },
  { label: "Cime di rapa", kind: "verdura", names: ["rapa", "rape"], months: range(10, 3) },
  { label: "Finocchi", kind: "verdura", names: ["finocchio", "finocchi"], months: range(10, 4) },
  { label: "Radicchio", kind: "verdura", names: ["radicchio"], months: range(10, 3) },
  { label: "Spinaci", kind: "verdura", names: ["spinaci"], months: range(10, 5) },
  { label: "Sedano", kind: "verdura", names: ["sedano"], months: range(10, 3) },
  { label: "Porri", kind: "verdura", names: ["porro", "porri"], months: range(10, 3) },
  { label: "Barbabietole", kind: "verdura", names: ["barbabietola", "barbabietole"], months: range(10, 3) },
  { label: "Carciofi", kind: "verdura", names: ["carciofo", "carciofi"], months: range(2, 5) },
  { label: "Asparagi", kind: "verdura", names: ["asparago", "asparagi"], months: range(3, 6) },
  { label: "Piselli freschi", kind: "verdura", names: ["pisello", "piselli"], months: range(4, 6) },
  { label: "Fave", kind: "verdura", names: ["fava", "fave"], months: range(4, 6) },
  { label: "Bietole", kind: "verdura", names: ["bietola", "bietole", "biete"], months: range(4, 11) },
  { label: "Zucchine", kind: "verdura", names: ["zucchina", "zucchine"], months: range(5, 9) },
  { label: "Cetrioli", kind: "verdura", names: ["cetriolo", "cetrioli"], months: range(5, 9) },
  { label: "Pomodori", kind: "verdura", names: ["pomodoro", "pomodori", "pomodorini", "datterini"], months: range(6, 9) },
  { label: "Melanzane", kind: "verdura", names: ["melanzana", "melanzane"], months: range(6, 9) },
  { label: "Peperoni", kind: "verdura", names: ["peperone", "peperoni"], months: range(6, 10) },
  { label: "Fagiolini", kind: "verdura", names: ["fagiolino", "fagiolini"], months: range(6, 9) },
];

// Prodotti lavorati: non hanno una stagione.
const PROCESSED = /surgelat|congelat|succo|passata|pelati|polpa|sugo|salsa|conserva|scatola|barattolo|sott|marmellat|confettura|gelato|yogurt|torta|biscott|merendin|puree|purea|concentrato|essiccat|secc[ao]|disidratat|tisana|infuso|bevanda|ketchup/;

export interface SeasonalMatch {
  label: string;
  kind: "frutta" | "verdura";
  inSeason: boolean;
  months: number[];
}

// Riconosce frutta e verdura fresche e dice se sono di stagione nel mese indicato (1-12). null se non è un ortofrutticolo noto.
export function seasonalStatus(name: string, month: number): SeasonalMatch | null {
  const haystack = normalizeText(name);
  if (PROCESSED.test(haystack)) return null;
  for (const produce of PRODUCE) {
    if (produce.names.some((term) => hasWholeTerm(haystack, term))) {
      return { label: produce.label, kind: produce.kind, inSeason: produce.months.includes(month), months: produce.months };
    }
  }
  return null;
}

export function seasonalProduce(month: number): { frutta: string[]; verdura: string[] } {
  const inSeason = PRODUCE.filter((produce) => produce.months.includes(month));
  return {
    frutta: inSeason.filter((p) => p.kind === "frutta").map((p) => p.label),
    verdura: inSeason.filter((p) => p.kind === "verdura").map((p) => p.label),
  };
}
