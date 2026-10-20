// Parole della ricerca senza accenti né punteggiatura; ignora i termini troppo corti per essere significativi.
export function normalizeSearch(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9% ]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1);
}
