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
