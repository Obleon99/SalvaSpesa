import { hasWholeTerm, normalizeText } from "./text";

// Marche nazionali molto diffuse: sono la "marca leader" con cui si confronta il marchio del distributore.
const LEADER_BRANDS = [
  "barilla", "mulino bianco", "de cecco", "garofalo", "divella", "rummo", "voiello", "buitoni", "mutti", "cirio", "pomi", "valfrutta",
  "rio mare", "nostromo", "callipo", "asdomar", "filippo berio", "bertolli", "monini", "carapelli", "sasso", "dante", "costa d oro",
  "lavazza", "kimbo", "illy", "segafredo", "borbone", "vergnano", "nutella", "ferrero", "kinder", "pavesi", "ringo", "oro saiwa",
  "saiwa", "galbusera", "doria", "balocco", "colussi", "misura", "plasmon", "mellin", "nestle", "danone", "activia", "muller",
  "yomo", "vitasnella", "parmalat", "granarolo", "galbani", "vallelata", "santa lucia", "president", "philadelphia", "fairy",
  "dixan", "ariel", "scottex", "regina", "softis", "lenor", "svelto", "finish", "chanteclair", "napisan", "coca cola", "fanta",
  "sprite", "san pellegrino", "levissima", "san benedetto", "ferrarelle", "findus", "knorr", "calve", "heinz", "bonduelle",
  "star", "sacla", "zuegg", "rigoni", "pampers", "dash", "omino bianco", "felce azzurra", "vim", "mastro lindo", "ace", "amuchina",
  "bauli", "motta", "alemagna", "paluani", "sammontana", "algida", "mondelez", "oreo", "tuc", "gran soleil", "mulino", "giovanni rana",
  "rana", "beretta", "negroni", "fiorucci", "rovagnati", "aia", "amadori", "fileni", "citterio", "vismara", "ferrarini",
];

// Marchi propri delle insegne (marchio del distributore, MDD).
const PRIVATE_LABELS: Record<string, string[]> = {
  esselunga: ["esselunga", "smart"],
  coop: ["coop", "vivi verde", "fior fiore", "crescendo", "club 4 10"],
  conad: ["conad", "verso natura", "sapori e dintorni", "percorso qualita", "viviverde"],
  lidl: [
    "milbona", "italiamo", "sondey", "w5", "dulano", "deluxe", "fin carre", "freshona", "combino", "dal salumiere", "cien",
    "belbake", "crownfield", "vitasia", "pikok", "solevita", "chef select", "sol mar", "nixe", "floralys", "formil", "salumeo",
    "baresa", "tower", "freeway", "lyttos", "bellarom", "alesto", "dolce vita", "corte aurelio", "casa morando", "fior di campo",
  ],
  eurospin: ["eurospin", "tre mulini", "le giare", "terre del sole"],
  penny: ["penny", "naturaplan"],
  tigros: ["tigros", "primia", "natura si"],
  ekom: ["ekom"],
  carrefour: ["carrefour", "carrefour bio", "carrefour classic"],
  pam: ["pam", "pam panorama", "panorama"],
  md: ["md"],
  aldi: ["aldi", "mamia", "moser roth"],
};

export type BrandTier = "leader" | "private-label" | "other";

export interface BrandInfo {
  tier: BrandTier;
  label: string | null;
}

export function classifyBrand(chainId: string, brand: string | null | undefined, name: string): BrandInfo {
  const text = normalizeText(`${brand ?? ""} ${name}`);

  const privates = PRIVATE_LABELS[chainId] ?? [];
  for (const label of privates) {
    if (hasWholeTerm(text, label)) return { tier: "private-label", label: brand?.trim() || label };
  }

  for (const leader of LEADER_BRANDS) {
    if (hasWholeTerm(text, leader)) return { tier: "leader", label: leader.replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
  return { tier: "other", label: brand?.trim() || null };
}

const QUALITY_LABELS: { id: string; label: string; test: RegExp }[] = [
  { id: "bio", label: "Bio", test: /\b(bio|biologic[oa]?i?e?)\b/ },
  { id: "dop-igp", label: "DOP/IGP", test: /\b(dop|igp|stg|doc|docg)\b/ },
  { id: "italiano", label: "100% italiano", test: /\b(100% ?ital\w*|origine italian\w*|prodott\w* in italia|solo italian\w*|italiano|italiana)\b/ },
  { id: "palma", label: "Senza olio di palma", test: /senza olio di palma/ },
  { id: "pesca", label: "Pesca sostenibile", test: /(pescat\w* a canna|pole ?(&|and)? ?line|msc|pesca sostenibile)/ },
  { id: "integrale", label: "Integrale", test: /\bintegral\w*\b/ },
  { id: "aperto", label: "Allevamento all'aperto", test: /(all aperto|galline libere|allevat\w* a terra)/ },
  { id: "extravergine", label: "Extravergine", test: /extra ?vergine/ },
];

export function qualityLabels(...texts: Array<string | null | undefined>): string[] {
  const joined = texts
    .filter(Boolean)
    .join(" ")
    .replace(/\bd\.?\s?o\.?\s?p\.?(?=\W|$)/gi, "dop")
    .replace(/\bi\.?\s?g\.?\s?p\.?(?=\W|$)/gi, "igp");
  const text = normalizeText(joined);
  const original = joined.toLowerCase();
  return QUALITY_LABELS.filter((entry) => entry.test.test(text) || entry.test.test(original)).map((entry) => entry.label);
}
