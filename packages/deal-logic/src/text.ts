export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function words(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(" ") : [];
}

// Un termine coincide se è l'inizio di una parola del testo ("frollin" trova "frollini"); i termini con spazio cercano la frase.
export function hasTerm(haystack: string, term: string): boolean {
  const normalized = normalizeText(term);
  if (normalized.includes(" ")) return ` ${haystack} `.includes(` ${normalized}`);
  return haystack.split(" ").some((word) => word.startsWith(normalized));
}

// Parola o frase intera ("pam" non coincide con "pampers").
export function hasWholeTerm(haystack: string, term: string): boolean {
  return ` ${haystack} `.includes(` ${normalizeText(term)} `);
}

export interface Quantity {
  value: number;
  unit: "kg" | "l" | "pz";
}

const UNIT_FACTOR: Record<string, { unit: "kg" | "l"; factor: number }> = {
  kg: { unit: "kg", factor: 1 },
  g: { unit: "kg", factor: 0.001 },
  gr: { unit: "kg", factor: 0.001 },
  l: { unit: "l", factor: 1 },
  lt: { unit: "l", factor: 1 },
  litro: { unit: "l", factor: 1 },
  litri: { unit: "l", factor: 1 },
  ml: { unit: "l", factor: 0.001 },
  cl: { unit: "l", factor: 0.01 },
};

// "4x 56 g", "0,132 kg", "1.5 l", "750 ml" -> quantità totale in kg o l.
export function parseQuantity(...texts: Array<string | null | undefined>): Quantity | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.toLowerCase().match(/(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|gr|g|litri|litro|lt|l|ml|cl)\b/);
    if (!match) continue;
    const amount = Number(match[2].replace(",", "."));
    const multiplier = match[1] ? Number(match[1]) : 1;
    const entry = UNIT_FACTOR[match[3]];
    if (!Number.isFinite(amount) || amount <= 0 || !entry) continue;
    return { value: Math.round(amount * multiplier * entry.factor * 10000) / 10000, unit: entry.unit };
  }
  return null;
}

// Promozioni "a multipli" nel testo di un'offerta: 3x2, 2x1, 1+1, "3 per 2", "2° a metà prezzo"… Restituisce un'etichetta breve o null.
// Il formato di confezione ("2x500 g", "6 x 1 l") non è una promozione: il secondo numero deve essere più piccolo del primo e non avere unità.
export function detectMultibuy(...texts: (string | null | undefined)[]): string | null {
  const text = texts.filter(Boolean).join(" ").toLowerCase().replace(/×/g, "x");
  if (!text) return null;
  const pair = (a: string, b: string) => (Number(b) >= 1 && Number(a) > Number(b) && Number(a) <= 9 ? `${a}x${b}` : null);
  let m = text.match(/\b(\d)\s*x\s*(\d)(?![.,]\d)\b(?!\s*(?:\d|g\b|gr\b|kg\b|ml\b|cl\b|l\b|lt\b|pz\b|pezz|capsul|rotol|bustin|buste|conf))/);
  if (m) return pair(m[1], m[2]) ?? null;
  m = text.match(/\b(\d)\s*per\s*(\d)\b(?!\s*(?:\d|g\b|kg\b|ml\b|l\b|€|euro))/);
  if (m && pair(m[1], m[2])) return pair(m[1], m[2]);
  m = text.match(/\b(\d)\s*al\s*prezzo\s*di\s*(\d)\b/);
  if (m && pair(m[1], m[2])) return pair(m[1], m[2]);
  m = text.match(/prendi\s*(\d)\s*(?:e\s*)?paghi\s*(\d)/);
  if (m && pair(m[1], m[2])) return pair(m[1], m[2]);
  m = text.match(/\b(\d)\s*\+\s*(\d)\b(?!\s*(?:\d|g\b|kg\b|ml\b|l\b))/);
  if (m && Number(m[1]) >= 1 && Number(m[2]) >= 1 && Number(m[1]) <= 5 && Number(m[2]) <= 5) return `${m[1]}+${m[2]}`;
  if (/(?:2\s*[°ºo]|secondo|seconda)\s*(?:prodotto\s*)?(?:a|al)\s*(?:meta|metà|50\s*%)/.test(text) || /secondo\s+(?:a\s+)?meta\s+prezzo/.test(text)) return "2° a metà prezzo";
  m = text.match(/\b(\d)\s*(?:pezzi|pz)\s*a\s*(\d+(?:[.,]\d+)?)\s*(?:€|euro)/);
  if (m && Number(m[1]) >= 2) return `${m[1]} pezzi a ${m[2].replace(".", ",")} €`;
  return null;
}
