export interface ChainTag {
  name: string;
  dotColorClass: string;
}

export const chainTags: ChainTag[] = [
  { name: "Esselunga", dotColorClass: "bg-primary" },
  { name: "Conad", dotColorClass: "bg-error" },
  { name: "Coop", dotColorClass: "bg-tertiary" },
  { name: "Lidl & Eurospin", dotColorClass: "bg-secondary-container" },
];

export interface CategoryTab {
  label: string;
  icon?: string;
}

export const categoryTabs: CategoryTab[] = [
  { label: "Tutte le Categorie" },
  { label: "Dispensa & Colazione", icon: "bakery_dining" },
  { label: "Oli & Condimenti", icon: "nutrition" },
  { label: "Conserve & Tonno", icon: "set_meal" },
  { label: "Cura della Casa", icon: "cleaning_services" },
  { label: "Bio & Filiera", icon: "eco" },
];

export interface TierProduct {
  tier: "leader" | "winner" | "discount";
  badgeLabel: string;
  rating: number;
  brand: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  priceContextLabel: string;
  price: string;
  unitPrice: string;
  unitPriceDelta?: string;
  ctaLabel: string;
  savingsBadge?: string;
}

export const frolliniComparison: TierProduct[] = [
  {
    tier: "leader",
    badgeLabel: "Marca Più Venduta",
    rating: 9.1,
    brand: "Mulino Bianco",
    name: "Pan di Stelle 700g",
    description: "Con cacao pregiato e stelline di glassa. Riferimento del mercato italiano.",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADmixSZ4oOXfFCn15i6CQY6PrxuJ5FvlIh3TXSoTXx1pe54DOeFtQdF8YnUNS4VDTguoMFzZ-2Aw50Qezd_V9eayeZoUGnr3xr98cK-NfkrsoY5GvxJV0oemnLadisUoY--wsihbZsOvp0_WxvEW6yWMZYs1pB4xXaMrr_CvpUow04kWQtwTFNylera872jaDF3-I79UlWn5zQ9tEeNGM6ia1JP3I0BADBwGzNIi4V_KjTcvVdqedpxg",
    imageAlt: "Confezione classica di biscotti frollini italiani al cacao e nocciola con stelline di zucchero",
    priceContextLabel: "Rilevato a Esselunga",
    price: "3,49 €",
    unitPrice: "4,98 €/kg",
    ctaLabel: "Aggiungi",
  },
  {
    tier: "winner",
    badgeLabel: "Risparmi il 37%",
    rating: 8.8,
    brand: "Marchio Coop",
    name: "Frollini Cacao & Nocciole 700g",
    description: "Filiera tracciata, 100% uova da allevamento all'aperto, senza olio di palma.",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCFZd7J6_RbATcnKZs_elNylfc4nLH4tZwBSY2OPA0jnw33NBRAxeKKBjXjDNdpGpDNNsHC1Is3w0f45TMneGcOou4jIx6xrA5cKT4IL3gOrk4Y6XGBtEP7wfmz2JxsszAmAH0Byca2XhBt2XmhH1RQ0Kzgim1L-Qxq7awqCOD0SqYgWq5_I0W25OHfmdEt94pLdJpTmfqMxk2VD_-C-GL8V3qZvmv2tl7X7EsRlqW5RSPOQFjip__ZwA",
    imageAlt: "Confezione private label Coop di frollini al cacao per la colazione, packaging salutare",
    priceContextLabel: "Prezzo Coop (Lorenteggio)",
    price: "2,19 €",
    unitPrice: "3,13 €/kg",
    unitPriceDelta: "-1,85 €/kg vs Mulino",
    ctaLabel: "Scegli & Risparmia 1,30€",
  },
  {
    tier: "discount",
    badgeLabel: "Massimo Risparmio (-52%)",
    rating: 8.0,
    brand: "Lidl (Sondey)",
    name: "Sondey Frollini Stellati 700g",
    description: "Gusto compatto, prodotto in stabilimenti italiani certificati IFS Food.",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDylGXINdvqHStF-KuFS-SCD1_Nh-cSas0dUNaxrL0WGGkFbOKsE1Z1NySV0TVo_KNJy7c0st0sdM00Zt5PsXMcAnJgzzmNduHYqwgZJdUAenvJWP5cPxrIP-_c2gtfEq4HLEpkx-tfK-wQzRZQHkAZyFbhtDP_V5xysgd2kPr3rB8PxefXHhMuC8yMGofb905XTmVWuSjx9j14UlKYnsQrEpajOBsLZGMMUVap6eXLhE8Q1iBTxmTTAg",
    imageAlt: "Confezione discount Sondey di biscotti stellati in stile Lidl",
    priceContextLabel: "Lidl Via Gonin",
    price: "1,69 €",
    unitPrice: "2,41 €/kg",
    ctaLabel: "Aggiungi",
  },
];

export interface CompareStripItem {
  variant: "leader" | "winner" | "discount";
  imageUrl: string;
  imageAlt: string;
  name: string;
  meta: string;
  price: string;
  secondaryLine: string;
  icon?: string;
}

export interface CompareCategoryCard {
  categoryLabel: string;
  accent: "primary" | "tertiary";
  badge: string;
  title: string;
  description: string;
  items: CompareStripItem[];
  footerIcon: string;
  footerIconColorClass: string;
  footerNote: string;
  footerLinkLabel: string;
}

export const compareCategoryCards: CompareCategoryCard[] = [
  {
    categoryLabel: "Oli & Condimenti",
    accent: "primary",
    badge: "Benchmark 1 Litro",
    title: "Olio Extra Vergine di Oliva 100% Italiano",
    description:
      "Estratto a freddo, bassa acidità (sotto 0,3%). Confronto tra top brand nazionale e Private Label Bio.",
    items: [
      {
        variant: "leader",
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBc3N6TL7J1aWPxHCRvu_u4htfxItrnE8Xl_-1hnAiJ0e4zMpKPazkD1j0XAoUPG-TznfHGgj-q4GC2NriQu8N4hL0dHcCFAPcf2AEBec48oH0irK0bRbodL1PaRi-_yotEGxoqAfxGs9kchj6JEIsZ2VIC4xTxu5da8aTNmhquSmnrjZW-WFV6WSrOG5uO6A74-ZefLPH80rsMh--gEv1ahEnPTwNqEZuGFnhWcEp_Tjw18Ezn6YyDWg",
        imageAlt: "Bottiglia di olio extravergine d'oliva italiano Filippo Berio da 1 litro",
        name: "Filippo Berio 100% ITA 1L",
        meta: "Carrefour • Prezzo scaffale",
        price: "9,90 €",
        secondaryLine: "9,90 €/L",
      },
      {
        variant: "winner",
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDjfAEkyReB6DNwT_12Q5S553kHHQdbhO0YvATBWia8oDSWmfItda8YZSTKA2FYw0dvXv-kXGrrfQXc1_y3Q5eRIhCoixf2DGsACV_WzwcZirivodT8nFdVek59ebScqgUeYW4QJoLESQ8CBaoOR9MN2eEyxJJms5Mr95OyaLyESnoD75MWmKGtRRGWRXLh_FMg1dvOZ4Mcwc7G6Ldlbu0s4quSfs4q00jWXUV7eOd0R0wui6qryo1xrg",
        imageAlt: "Bottiglia di olio extravergine biologico Esselunga Bio da 1 litro",
        name: "Esselunga Bio 100% ITA 1L",
        meta: "Biologico Certificato • Risparmi 2,10€",
        price: "7,80 €",
        secondaryLine: "-21% vs Leader",
        icon: "verified",
      },
      {
        variant: "discount",
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuA53KchIxD8aXNCnu3BWsP7zRcPevV-focgOq4eQi47uOFlPDZOfks_3d5WZZOZtIQjX01iz866GsSF1naX6Vz0b3SLldEhncRhCLGe7Ggqw5OTv7dfb2VA5r1JfKRW7yZr1pY5hzUQV2eJwg_r8re9MgRZpe7BebiKg2XM9siz16VxyujgGsVyFbA4c1QevWHVrXXDGMJXKARZs4RtwBqjUPkeqRZuqswOTJ6zy392903HLLSmGV4pUw",
        imageAlt: "Bottiglia di olio extravergine Eurospin Frantoio del Duca da 1 litro",
        name: "Eurospin Frantoio 1L",
        meta: "Miscela comunitaria UE",
        price: "6,99 €",
        secondaryLine: "Risparmio max (-29%)",
      },
    ],
    footerIcon: "eco",
    footerIconColorClass: "text-primary",
    footerNote: "Bio Esselunga consigliato per acidità 0,22%",
    footerLinkLabel: "Approfondisci Olio",
  },
  {
    categoryLabel: "Conserve Ittiche",
    accent: "tertiary",
    badge: "Pescato Sostenibile",
    title: "Tonno all'Olio di Oliva (Confezione 4x80g)",
    description: "Valutazione della compattezza del trancio, olio di sgocciolamento e certificazione pesca a canna.",
    items: [
      {
        variant: "leader",
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuACg6S5fL-v5_UhAhE-eLQiLLmrdjcDe9mPqDSGc6X2K8DaILJ39r7A_YY-YDxZWU4VEaBUhccj5U1zVco6L0JRpJvFcLBKIxrHRuTemnLOl-6VxfaVsqGh9wB1cGPlvSoj3CWaulczleu5mCLGHD14pBsYxxlXa9UO7dwYbHc9GCQ1XlPhXEihczpAUqD-dYM5fQsSHUDwG8n78rAdaEhl0nWCQkZpx-z1Mb9_LVQGcXmEvwP2lcCP8g",
        imageAlt: "Confezione classica di tonno Rio Mare all'olio d'oliva da 4 lattine",
        name: "Rio Mare 4x80g",
        meta: "Esselunga / Conad • Pinne Gialle",
        price: "4,89 €",
        secondaryLine: "15,28 €/kg",
      },
      {
        variant: "winner",
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCQv-rsKAXNecsa9SYYYVPsF5fmR3uG3BKPpmjROmjJ7T2D7XU0-WtD33KPtk4_usZvCYmAVVqV-SDU9Aa-xcG7L9rVV0-RVTpZDXGa6hL7mm8pHQYE4XxaT1G52jVamT2JFv3m-cDi0yKHnAGYHKCM0Wc5EiPy5Y5qB09jK1iBv_VR9B79wZ5T85TC1leqE0ky2AbsNeDRDQoyCWKoTk5IiS1sNM80O73Iyglcy_48tqmDfAxSyWihiA",
        imageAlt: "Confezione di tonno Conad pescato a canna all'olio d'oliva da 4 lattine",
        name: "Conad Pescato a Canna 4x80g",
        meta: "Stesso stabilimento Frinsa • -1,50€",
        price: "3,39 €",
        secondaryLine: "10,59 €/kg (-31%)",
        icon: "thumb_up",
      },
      {
        variant: "discount",
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDzf0p-ZB-JanGZMKrey0JX3sG3ZpkzgMcW-phiW-7SIPz02FRbaT6xjfjZGxxYq3R9nNySG48hz_hagRf3fjEPoiCZtsO5hd92tGTh4mtcpM4I-0I8E3JzFO-HTWlwTH01_7ZdbadS99eX7qAWWEcD5HOqYl69CnsubjW9SHkU1nZ3rIR_k7xQsuGPtgPw2DyXNUJvYNKFweONyQKThvE5FTYEM3UXB1CupiEFyzzSc3BFPtvigW_G8g",
        imageAlt: "Flacone di detersivo piatti Lidl W5 Platinum concentrato da 1 litro",
        name: "Lidl W5 Platinum Piatti 1L",
        meta: "vs Fairy Platinum 900ml (2,69€)",
        price: "1,29 €",
        secondaryLine: "-52% Risparmio",
      },
    ],
    footerIcon: "water_drop",
    footerIconColorClass: "text-secondary",
    footerNote: "Resa e sgrassamento testati al laboratorio Altroconsumo",
    footerLinkLabel: "Tutti i 14 Test",
  },
];

export interface NearbyStorePrice {
  store: string;
  price: string;
  isHighlighted?: boolean;
}

export const brandTracker = {
  searchValue: "Pasta De Cecco Spaghetti n.12 (500g)",
  frequentBrands: ["Barilla", "De Cecco", "Nutella", "Coca-Cola", "Pampers"],
  bestStore: "Esselunga • Via Washington",
  bestStoreNote: "Sconto Carta Fìdaty -40%",
  validUntilNote: "In volantino fino a domenica",
  expiresNote: "Scade tra 2 giorni",
  bestPrice: "0,99 €",
  originalPrice: "1,69 €",
  nearbyPrices: [
    { store: "Conad Lorenteggio", price: "1,39 €" },
    { store: "Coop Piazza Frattini", price: "1,25 €" },
    { store: "Carrefour Express", price: "1,79 €", isHighlighted: true },
  ] satisfies NearbyStorePrice[],
  trendChangeLabel: "-28% min.",
  sparklineFillPath: "M0,25 C30,22 60,35 90,30 C120,25 150,55 180,48 C210,42 240,62 280,15 L280,70 L0,70 Z",
  sparklineLinePath: "M0,25 C30,22 60,35 90,30 C120,25 150,55 180,48 C210,42 240,62 280,15",
  timelineLabels: ["15 Gen (1,59€)", "1 Feb (1,45€)", "Oggi (0,99€)"],
  alertThresholdNote: "Avviso quando scende sotto 1,10€",
};

export const insightBanner = {
  eyebrow: "Audit Indipendente SpesaChiara • Febbraio 2025",
  title: "Lo sai che la Passata Conad & Coop nasce negli ",
  titleHighlight: "stessi stabilimenti",
  titleSuffix: " dei grandi marchi?",
  body: "Pomodoro 100% italiano da filiera tracciata con parametri Brix e acidità equivalenti. Scegliendo la Private Label selezionata risparmi oltre il ",
  bodyHighlight: "42% a bottiglia",
  bodySuffix: " senza alcun compromesso su sapore e sicurezza.",
  savingsStat: { label: "Risparmio Famiglia (4 pers.)", value: "1.140€ / anno" },
  qualityStat: { label: "Standard Organolettici", value: "Conformità 98.4%" },
  ctaLabel: "Scarica il Report MDD 2025",
  benchmarkTitle: "Benchmark Passata 700g",
  benchmarkBadge: "-42% Prezzo",
  leaderBrand: "Marca Leader (Mutti)",
  leaderPrice: "1,65€",
  leaderUnitPrice: "2,35€/kg",
  mddBrand: "Marchio Coop / Conad",
  mddPrice: "0,95€",
  mddUnitPrice: "1,35€/kg",
  footnote: "Stesso fornitore certificato della Pianura Padana: differisce solo per percentuale di polpa fine e pack promozionale.",
};

export const recommendation = {
  title: "CONSIGLIO SPESACHIARA:",
  body: "La versione Coop offre il compromesso nutrizionale perfetto: 100% uova fresche italiane da galline all'aperto, cacao certificato Rainforest e zero grassi idrogenati, con un risparmio del 37%.",
  ctaLabel: "Vedi Scheda Inci",
};

export const methodology = {
  title: "Come calcoliamo la qualità e i risparmi?",
  body: "Incrociamo la provenienza delle materie prime dichiarate in etichetta (stabilimento di produzione e codice bollo CE), panel test indipendenti di consumatori e il confronto al chilogrammo/litro netto.",
  primaryCtaLabel: "Criteri di Scoring",
  secondaryCtaLabel: "Segnala un Prezzo",
};
