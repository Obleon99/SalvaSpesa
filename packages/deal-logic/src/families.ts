export type CategoryId = "dispensa" | "oli" | "conserve" | "casa" | "freschi";

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: "dispensa", label: "Dispensa & Colazione", icon: "bakery_dining" },
  { id: "oli", label: "Oli & Condimenti", icon: "nutrition" },
  { id: "conserve", label: "Conserve & Tonno", icon: "set_meal" },
  { id: "freschi", label: "Freschi & Bevande", icon: "egg_alt" },
  { id: "casa", label: "Cura della Casa", icon: "cleaning_services" },
];

export interface FamilyDef {
  id: string;
  label: string;
  title: string;
  category: CategoryId;
  unit: "kg" | "l";
  // Gruppi alternativi (OR); in ogni gruppo tutti i termini devono comparire (AND). I termini sono inizi di parola.
  include: string[][];
  exclude?: string[];
}

const NOT_FOOD_PETS = ["gatto", "gatti", "cane", "cani", "crocchette", "felix", "purina", "whiskas", "sheba", "cesar"];

export const FAMILIES: FamilyDef[] = [
  { id: "biscotti", label: "Biscotti & frollini", title: "Biscotti e frollini", category: "dispensa", unit: "kg", include: [["biscott"], ["frollin"]], exclude: [...NOT_FOOD_PETS, "bimbi", "gelato", "biscottat", "tiramisu", "cheesecake", "dessert"] },
  { id: "pasta", label: "Pasta di semola", title: "Pasta di semola", category: "dispensa", unit: "kg", include: [["pasta", "semola"], ["spaghett"], ["penne"], ["fusilli"], ["rigaton"], ["mezze maniche"], ["linguine"], ["tagliatelle"]], exclude: ["sugo", "pesto", "ripien", "insalata", "salsa", "pizza", ...NOT_FOOD_PETS] },
  { id: "caffe", label: "Caffè", title: "Caffè macinato e in grani", category: "dispensa", unit: "kg", include: [["caffe", "macinat"], ["caffe", "grani"], ["caffe", "espresso"]], exclude: ["capsul", "caps", "solubile", "gelato", "bevanda"] },
  { id: "cereali", label: "Cereali & colazione", title: "Cereali e colazione", category: "dispensa", unit: "kg", include: [["cereali"], ["corn flakes"], ["muesli"], ["fette biscottate"], ["merendine"]], exclude: ["barretta", "barrette", "pane"] },
  { id: "latte", label: "Latte", title: "Latte UHT e fresco", category: "freschi", unit: "l", include: [["latte", "uht"], ["latte", "parzialmente"], ["latte", "intero"], ["latte", "scremat"]], exclude: ["cocco", "avena", "soia", "mandorla", "cioccolat", "fermentat", "polvere", "condensato", "detergente", "corpo", "bagno"] },
  { id: "yogurt", label: "Yogurt", title: "Yogurt", category: "freschi", unit: "kg", include: [["yogurt"]], exclude: [...NOT_FOOD_PETS, "gelato"] },
  { id: "mozzarella", label: "Mozzarella", title: "Mozzarella", category: "freschi", unit: "kg", include: [["mozzarell"]], exclude: ["pizza", "insalata", "sandwich", "ripien", "panzerott", "duetto", "tortell", "ravioli", "lasagn", "pomodor", "burger", "hamburger", "polpett", "cannelloni", "gnocchi", "toast", "piadina"] },
  { id: "bevande", label: "Acqua & bibite", title: "Acqua e bibite", category: "freschi", unit: "l", include: [["acqua", "naturale"], ["acqua", "frizzante"], ["coca cola"], ["fanta"], ["sprite"], ["aranciata"]], exclude: ["colonia", "profumata", "ossigenata", "micellare"] },
  { id: "olio", label: "Olio d'oliva", title: "Olio extravergine e d'oliva", category: "oli", unit: "l", include: [["olio", "extravergine"], ["olio", "extra vergine"], ["olio", "evo"], ["olio", "oliva"]], exclude: ["tonno", "sgombro", "sardin", "pesto", "acciug", "spray", "semi", "mais", "girasole", "salmone", "crema", "capelli", "corpo", "massaggio", "cosmetic", "filetti", "sott olio", "sott'olio"] },
  { id: "passata", label: "Passata di pomodoro", title: "Passata e polpa di pomodoro", category: "conserve", unit: "kg", include: [["passata"], ["polpa", "pomodor"], ["pelati"]], exclude: ["pizza", "sugo pronto"] },
  { id: "tonno", label: "Tonno in scatola", title: "Tonno all'olio e al naturale", category: "conserve", unit: "kg", include: [["tonno", "olio"], ["tonno", "naturale"], ["tonno", "sgocc"]], exclude: [...NOT_FOOD_PETS, "pizza", "pasta", "insalata", "sugo", "risotto", "cracker", "panino", "sandwich", "tramezzino", "patè", "pate", "sfoglia"] },
  { id: "legumi", label: "Legumi in scatola", title: "Legumi in scatola", category: "conserve", unit: "kg", include: [["fagioli"], ["ceci"], ["lenticchie"], ["piselli", "scatol"]], exclude: ["surgelat", "farina", "zuppa", "pasta"] },
  { id: "detersivo-piatti", label: "Detersivo piatti", title: "Detersivo per piatti", category: "casa", unit: "l", include: [["detersivo", "piatti"], ["piatti", "limone"], ["piatti", "concentrat"], ["lavapiatti"]], exclude: ["lavastoviglie", "pastiglie", "capsule"] },
  { id: "detersivo-lavatrice", label: "Detersivo lavatrice", title: "Detersivo per lavatrice", category: "casa", unit: "l", include: [["detersivo", "lavatrice"], ["detersivo", "liquido"], ["detersivo", "polvere"], ["lavatrice", "liquido"], ["lavaggi"]], exclude: ["piatti", "lavastoviglie", "pavimenti"] },
  { id: "ammorbidente", label: "Ammorbidente", title: "Ammorbidente", category: "casa", unit: "l", include: [["ammorbident"]] },
];
