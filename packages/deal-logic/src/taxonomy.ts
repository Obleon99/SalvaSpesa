import { hasTerm, hasWholeTerm, normalizeText } from "./text";

export type GroupId =
  | "proteine"
  | "carboidrati"
  | "frutta-verdura"
  | "grassi"
  | "casa-persona"
  | "dolci"
  | "bevande"
  | "bevande-calde"
  | "animali"
  | "altro";

export interface SubDef {
  id: string;
  label: string;
}

export interface GroupDef {
  id: GroupId;
  label: string;
  icon: string;
  subs: SubDef[];
}

export const GROUPS: GroupDef[] = [
  {
    id: "proteine",
    label: "Proteine",
    icon: "egg_alt",
    subs: [
      { id: "carne", label: "Carne" },
      { id: "salumi", label: "Salumi" },
      { id: "pesce", label: "Pesce" },
      { id: "latticini", label: "Latticini e formaggi" },
      { id: "uova", label: "Uova" },
    ],
  },
  {
    id: "carboidrati",
    label: "Carboidrati",
    icon: "bakery_dining",
    subs: [
      { id: "pasta", label: "Pasta" },
      { id: "riso", label: "Riso" },
      { id: "pane", label: "Pane e pizza" },
      { id: "crackers", label: "Crackers e grissini" },
      { id: "farine", label: "Farine e cereali" },
    ],
  },
  {
    id: "frutta-verdura",
    label: "Frutta e verdura",
    icon: "nutrition",
    subs: [
      { id: "frutta", label: "Frutta" },
      { id: "verdura", label: "Verdura" },
      { id: "zuppe", label: "Zuppe e vellutate" },
      { id: "legumi", label: "Legumi e conserve" },
    ],
  },
  {
    id: "grassi",
    label: "Grassi",
    icon: "water_drop",
    subs: [
      { id: "olio", label: "Olio" },
      { id: "burro", label: "Burro e margarina" },
      { id: "avocado", label: "Avocado" },
      { id: "frutta-secca", label: "Frutta secca e semi" },
    ],
  },
  {
    id: "casa-persona",
    label: "Casa e cura persona",
    icon: "cleaning_services",
    subs: [
      { id: "detersivi", label: "Detersivi e pulizia" },
      { id: "carta", label: "Carta e igiene casa" },
      { id: "igiene", label: "Shampoo, saponi e bagnoschiuma" },
      { id: "dentifricio", label: "Dentifrici e igiene orale" },
      { id: "creme", label: "Creme e cosmesi" },
    ],
  },
  {
    id: "dolci",
    label: "Dolci",
    icon: "cookie",
    subs: [
      { id: "biscotti", label: "Biscotti" },
      { id: "merendine", label: "Merendine e snack" },
      { id: "spalmabili", label: "Marmellate, miele e creme" },
      { id: "torte", label: "Torte e dolci da forno" },
      { id: "gelati", label: "Gelati" },
      { id: "cioccolato", label: "Cioccolato e caramelle" },
    ],
  },
  {
    id: "bevande",
    label: "Bevande",
    icon: "local_drink",
    subs: [
      { id: "acqua", label: "Acqua" },
      { id: "gassate", label: "Bevande gassate" },
      { id: "energetiche", label: "Energetiche" },
      { id: "succhi", label: "Succhi di frutta" },
      { id: "vegetali", label: "Bevande vegetali" },
      { id: "alcolici", label: "Birra e vino" },
    ],
  },
  {
    id: "bevande-calde",
    label: "Bevande calde",
    icon: "coffee",
    subs: [
      { id: "caffe", label: "Caffè" },
      { id: "te", label: "Tè" },
      { id: "tisane", label: "Tisane e infusi" },
    ],
  },
  {
    id: "animali",
    label: "Animali",
    icon: "pets",
    subs: [
      { id: "cani", label: "Cani" },
      { id: "gatti", label: "Gatti" },
      { id: "accessori", label: "Lettiere e accessori" },
    ],
  },
  {
    id: "altro",
    label: "Altro",
    icon: "shopping_basket",
    subs: [
      { id: "condimenti", label: "Salse e condimenti" },
      { id: "snack-salati", label: "Patatine e snack salati" },
      { id: "altro", label: "Altro" },
    ],
  },
];

export const GROUP_BY_ID = new Map(GROUPS.map((group) => [group.id, group]));

export type Storage = "fresco" | "surgelato" | "conserva";

export const STORAGE_LABEL: Record<Storage, string> = { fresco: "Fresco", surgelato: "Surgelato", conserva: "In scatola / conserva" };

export interface Classification {
  group: GroupId;
  sub: string;
  storage: Storage | null;
}

interface Rule {
  group: GroupId;
  sub: string;
  // Gruppi alternativi (OR); in ogni gruppo tutti i termini devono comparire (AND). "=" davanti = parola intera, altrimenti inizio di parola.
  any: string[][];
  not?: string[];
}

const match = (haystack: string, term: string): boolean => (term.startsWith("=") ? hasWholeTerm(haystack, term.slice(1)) : hasTerm(haystack, term));

const PET = ["gatto", "gatti", "cane", "cani", "crocchett", "felix", "purina", "whiskas", "sheba", "=cesar", "kitekat", "pedigree", "friskies", "schesir", "monge", "animonda", "lettiera", "=cat", "dog food", "gourmet gold", "gourmet perle", "gourmet a la carte", "gourmet soup", "mon petit", "migliorcane", "migliorgatto", "vitakraft", "dreamies", "perfect fit", "bonzo", "=ultima", "animali", "adoc", "romeo", "almo nature", "marpet", "bifensis", "hairball", "urinary", "croccantini", "cibo umido", "cibo secco", "=chat", "lechat", "gemon", "affinity", "exclusion", "kitten", "gattin", "cucciol", "lindocat", "natural trainer", "royal canin", "pro plan", "hill s", "applaws", "bocconcini per", "per cani", "per gatti", "migliorcane"];
const FROZEN_TERMS = ["surgelat", "congelat", "frozen", "findus", "4 salti", "orogel", "bofrost", "frosta", "igloo"];
const CANNED_TERMS = ["scatola", "sott olio", "sott aceto", "barattolo", "sgocciolat", "in conserva", "al naturale", "all olio", "in olio", "vasetto", "affumicat", "essiccat", "secco", "secca", "stagionat", "sottaceto", "sottolio", "in latta", "latta"];

const PRODUCE_CATEGORY = /ortofrutta|frutta e verdura|frutta-e-verdura/;
const PROCESSED_TERMS = ["crema", "frullat", "omogeneizz", "ramen", "roll", "agrodolce", "halloween", "vetro", "vapore", "cott", "gusto", "aroma", "dessert", "sorbet", "yogurt", "muller", "plasmon", "humana", "mellin", "fairy", "detersiv", "trolli", "zucchero", "torta", "biscott", "merendin", "succo", "bevanda", "snack", "chips", "pizza", "sugo", "salsa", "ripien", "tortell", "ravioli", "gnocch", "pasta", "pate", "pesto", "insalata di", "impanat", "piatto", "pronto", "ricetta", "mix", "mist", "fantasia", "contorno", "tris", "bon roll", "peperlizia", "percorsi di gusto", "marmellat", "confettur", "sciroppo", "sott"];

// L'ordine conta: la prima regola che coincide decide la categoria (prima i casi più specifici).
const RULES: Rule[] = [
  { group: "animali", sub: "accessori", any: [["lettiera"], ["sabbia"], ["guinzaglio"], ["lettiere"], ["antiparassit"]] },
  { group: "animali", sub: "gatti", any: [["gatto"], ["gatti"], ["=cat"], ["felix"], ["whiskas"], ["sheba"], ["kitekat"], ["friskies"], ["schesir"], ["dreamies"], ["hairball"], ["urinary"], ["bifensis"], ["=chat"], ["lechat"], ["gemon"], ["kitten"], ["gattin"], ["lindocat"], ["tratto urinario"], ["gourmet gold"], ["gourmet perle"], ["gourmet a la carte"], ["gourmet soup"], ["mon petit"], ["migliorgatto"]] },
  { group: "animali", sub: "cani", any: [...PET.filter((t) => t !== "lettiera").map((term) => [term]), ["=dog"]], not: ["hot dog"] },
  { group: "altro", sub: "snack-salati", any: [["patatine"], ["chips"], ["popcorn"], ["pop corn"], ["salatini"], ["snack", "salat"]], not: ["cioccolat", "gocce"] },

  // Casa e cura persona
  { group: "casa-persona", sub: "dentifricio", any: [["dentifric"], ["spazzolin"], ["collutorio"], ["filo interdentale"]] },
  { group: "casa-persona", sub: "carta", any: [["carta igienica"], ["carta casa"], ["rotolon"], ["scottex"], ["fazzolett"], ["tovagliol"], ["pannolin"], ["pampers"], ["huggies"], ["assorbent"], ["salvaslip"], ["proteggi slip"], ["=tena"], ["lines"], ["alluminio"], ["pellicola"], ["cotton"], ["salviett"], ["asciugatutto"], ["tutto rotolo"], ["rotolo cucina"], ["tempo"], ["foxy"], ["sofficini carta"], ["scottex"]], not: ["gelato", "cioccolat"] },
  { group: "casa-persona", sub: "creme", any: [["cerave"], ["nivea"], ["garnier"], ["vichy"], ["la roche"], ["tinta"], ["colorazione"], ["palette"], ["=dove", "crema"], ["rimmel"], ["essence"], ["maybelline"], ["burrocacao"], ["labbra"], ["after shave"], ["dopobarba"]] },
  { group: "casa-persona", sub: "igiene", any: [["shampoo"], ["balsamo"], ["bagnoschiuma"], ["bagno doccia"], ["doccia"], ["sapone"], ["saponetta"], ["detergente intimo"], ["deodorant"], ["rasatura"], ["docciaschiuma"], ["bagnodoccia"], ["=deo"], ["=dove"], ["pantene"], ["head shoulders"], ["=clear"], ["syoss"], ["intimo"], ["johnson"], ["aquafresh"], ["rasoi"], ["lamette"], ["olio", "emolliente"], ["depilat"], ["schiuma da barba"], ["gel capelli"], ["spuma"]] },
  { group: "casa-persona", sub: "creme", any: [["crema", "viso"], ["crema", "corpo"], ["crema", "mani"], ["crema", "idratante"], ["crema", "solare"], ["latte", "corpo"], ["latte detergente"], ["struccante"], ["cosmetic"], ["profumo"]] },
  { group: "casa-persona", sub: "carta", any: [["carta igienica"], ["carta casa"], ["rotolon"], ["scottex"], ["fazzolett"], ["tovagliol"], ["pannolin"], ["assorbent"], ["salvaslip"], ["alluminio"], ["pellicola"], ["cotton"]] },
  {
    group: "casa-persona",
    sub: "detersivi",
    any: [["detersiv"], ["=piatti"], ["svelto"], ["winni"], ["dixan"], ["=dash"], ["finish"], ["calgon"], ["lysoform"], ["napisan"], ["=vim"], ["mastro lindo"], ["chanteclair"], ["smac"], ["glassex"], ["ajax"], ["ariel"], ["omino bianco"], ["coccolino"], ["lenor"], ["soflan"], ["perlana"], ["spic span"], ["pulirapid"], ["=bref"], ["=cif"], ["nelsen"], ["scioglicalcare"], ["swiffer"], ["=wc"], ["quasar"], ["=sole"], ["brillantante"], ["fabuloso"], ["=pril"], ["=ace"], ["sgrassat"], ["spray bagno"], ["ammorbident"], ["candeggina"], ["lavastoviglie"], ["lavapiatti"], ["sgrassator"], ["anticalcare"], ["disinfettant"], ["pulitore"], ["spugn"], ["bucato"], ["lavatrice"], ["multiuso"], ["igienizzant"], ["deodorante ambiente"], ["detergente"], ["pavimenti"], ["vetri"]],
    not: ["latte detergente", "intimo"],
  },

  // Dolci (prima di latte, cereali, farine: "biscotti al latte", "torta di mele")
  { group: "dolci", sub: "gelati", any: [["gelato"], ["gelati"], ["ghiacciol"], ["cornetto algida"], ["magnum"], ["sorbetto"], ["cremeria gelato"], ["maxibon"], ["cameo", "muu"], ["algida"], ["sammontana"], ["=grom"], ["carte d or"], ["viennetta"]] },
  { group: "dolci", sub: "biscotti", any: [["biscott"], ["frollin"], ["wafer"], ["savoiard"], ["cantucc"], ["pavesini"], ["oreo"], ["gocciole"], ["margheritin"], ["faccine"], ["kellogg"], ["pan di stelle"], ["abbracci"], ["macine"], ["baiocchi"]], not: ["fette biscottate", "cane", "gatto", "bimbi"] },
  { group: "dolci", sub: "merendine", any: [["merendin"], ["snack"], ["barretta"], ["barrette"], ["kinder"], ["fiesta"], ["tiramisu"], ["budino"], ["dessert"], ["creme caramel"], ["plumcake"], ["girella"], ["brioss"], ["cornett"], ["croissant"], ["brioche"], ["pandoro"], ["panettone"], ["colomba"], ["nutella"], ]},
  { group: "dolci", sub: "spalmabili", any: [["nutella"], ["crema spalmabile"], ["marmellat"], ["confettur"], ["miele"], ["nocciolata"], ["crema", "nocciol"], ["crema", "mandorl"], ["crema", "noci"], ["composta di frutta"], ["zuccheri"]], not: ["senape"] },
  { group: "dolci", sub: "torte", any: [["torta"], ["crostata"], ["ciambell"], ["muffin"], ["sfogliatell"], ["strudel"], ["cheesecake"], ["millefoglie"], ["pasticcini"], ["pastine dolc"], ["pan di spagna"], ["pandistelle"]] },
  { group: "dolci", sub: "cioccolato", any: [["cioccolat"], ["cioccolatin"], ["caramell"], ["gomme"], ["gommos"], ["caramelle"], ["mentine"], ["liquirizia"], ["confett"], ["lindt"], ["ferrero"], ["chupa chups"], ["haribo"], ["fruittella"], ["=mars"], ["snickers"], ["twix"], ["bounty"], ["kit kat"], ["kitkat"], ["toffee"], ["maltesers"], ["ciocozucca"], ["gecchele"], ["elah"], ["nesquik"], ["nuvolette"], ["granbiscotto"], ["duetto"], ["capri"], ["pan goccioli"], ["loacker"], ["croccantin"], ["stollen"], ["marzapane"], ["macarons"], ["cono"], ["haagen"], ["granita"], ["polaretti"], ["ciok"], ["rollini"], ["dolcetti"], ["stecchi"], ["m&m"], ["m m s"], ["tavolett"], ["praline"], ["=baci"]] },

  // Bevande vegetali (prima di caffè e latte: "bevanda avena e caffè", "latte di soia")
  { group: "bevande", sub: "vegetali", any: [["bevanda", "vegetal"], ["bevanda", "avena"], ["bevanda", "soia"], ["bevanda", "mandorla"], ["bevanda", "riso"], ["bevanda", "cocco"], ["bevanda", "nocciola"], ["latte", "avena"], ["latte", "soia"], ["latte", "mandorla"], ["latte", "riso"], ["latte", "cocco"], ["alpro"], ["valsoia"], ["dimmidisi"]], not: ["gelato", "yogurt", "dessert", "budino"] },

  // Bevande calde
  { group: "bevande", sub: "gassate", any: [["icetea"], ["=the", "lattina"], ["=the", "bottiglia"], ["=the", "san benedetto"], ["=te", "lattina"], ["=te", "san benedetto"], ["=the", "brik"], ["te", "freddo"], ["the", "freddo"], ["tea", "freddo"], ["ice tea"], ["estathe"], ["tea", "pesca"], ["the", "pesca"], ["te", "limone", "bevanda"]], not: ["salmone"] },
  { group: "bevande-calde", sub: "caffe", any: [["caffe"], ["espresso"], ["cialde"], ["capsule", "caffe"], ["nescafe"], ["lavazza"], ["illy"], ["kimbo"], ["segafredo"], ["orzo", "solubile"], ["orzo", "macinato"], ["nespresso"], ["dolce gusto"], ["dolcegusto"], ["compatibil"], ["ginseng"], ["moka"]], not: ["gelato", "biscott", "bevanda", "yogurt", "latte", "caffein", "coca cola", "pepsi", "dolce", "budino", "tiramisu", "liquore", "crema di"] },
  { group: "bevande-calde", sub: "tisane", any: [["tisana"], ["infuso"], ["camomilla"], ["finocchio", "tisana"], ["rooibos"], ["zenzero", "infuso"]] },
  { group: "bevande-calde", sub: "te", any: [["=te"], ["=the"], ["=tea"], ["tea"], ["twinings"], ["pompadour"], ["yogi"], ["lipton"]], not: ["freddo", "bevanda", "tea tree", "salmone", "affumicat", "lattina", "icelander"] },

  // Bevande
  { group: "bevande", sub: "acqua", any: [["acqua", "naturale"], ["acqua", "frizzante"], ["acqua", "minerale"], ["acqua", "effervescente"], ["acqua", "oligominerale"], ["=acqua"], ["levissima"], ["sant anna"], ["ferrarelle"], ["vitasnella"], ["nestle vera"]], not: ["colonia", "ossigenata", "micellare", "tonica", "pasta", "sale", "tonno", "salviett", "pampers", "pura"] },
  { group: "bevande", sub: "energetiche", any: [["energy drink"], ["red bull"], ["monster"], ["bevanda energetica"], ["energetica"], ["reintegrat"], ["energade"], ["isotonic"], ["gatorade"], ["powerade"], ["integratore"]] },
  { group: "bevande", sub: "alcolici", any: [["birra"], ["vino"], ["prosecco"], ["spumante"], ["lambrusco"], ["chianti"], ["amaro"], ["grappa"], ["whisky"], ["vodka"], ["=gin"], ["aperol"], ["spritz"], ["liquore"], ["=rum"], ["champagne"], ["negroamaro"], ["d o c"], ["d o c g"], ["d o g"], ["=doc"], ["=docg"], ["=igt"], ["brut"], ["passito"], ["valpolicella"], ["barbera"], ["bardolino"], ["chardonnay"], ["morellino"], ["gutturnio"], ["sprizz"], ["teroldego"], ["bonarda"], ["dolcetto"], ["syrah"], ["muller thurgau"], ["ribolla"], ["zibibbo"], ["inferno"], ["torbato"], ["falanghina"], ["fiano"], ["aglianico"], ["nero di troia"], ["sauvignon"], ["ruche"], ["da tavola"], ["=rose"], ["castel del monte"], ["pantelleria"], ["hugo"], ["chamapagne"], ["lugana"], ["verdicchio"], ["vermentino"], ["nebbiolo"], ["montepulciano"], ["primitivo"], ["pinot"], ["sangiovese"], ["merlot"], ["cabernet"], ["lager"], ["=ipa"]], not: ["aceto", "salsa", "sugo", "risotto", "pasta", "cottura"] },
  { group: "bevande", sub: "succhi", any: [["succo"], ["succhi"], ["yoga"], ["nettare"], ["spremuta"], ["centrifugato"], ["smoothie"], ["estratto di frutta"]], not: ["gelato"] },
  { group: "bevande", sub: "gassate", any: [["coca cola"], ["coca-cola"], ["pepsi"], ["=fanta"], ["sprite"], ["aranciata"], ["limonata"], ["chinotto"], ["gassosa"], ["cedrata"], ["bibita"], ["bibite"], ["bevanda", "gassata"], ["tonica"], ["=cola"], ["schweppes"], ["oransoda"], ["lemonsoda"], ["sanpellegrino"], ["san benedetto"], ["limonata"], ["ginger"], ["bevanda"]], not: ["latte", "soia", "avena", "mandorla", "riso", "cocco", "vegetale", "yogurt"] },

  // Grassi
  { group: "proteine", sub: "pesce", any: [["tonno"], ["sgombro"], ["sardin"], ["acciug"], ["alici"]], not: ["pizza", "pasta", "insalata", "sugo", "risotto", "cracker", "panino", "sandwich", "tramezzino", "gatto", "cane", "sfoglia", "patè", "pate", "pesto", "ravioli", "tortell"] },
  { group: "grassi", sub: "olio", any: [["olio"], ["spray", "olio"]], not: ["tonno", "sgombro", "sardin", "acciug", "pesto", "salmone", "filetti", "sott olio", "sott aceto", "capelli", "corpo", "massaggio", "bagno", "solare", "viso", "doccia", "funghi", "carciof", "pomodori secch", "peperoncin", "olive", "dado", "brodo", "bagnoschiuma", "shampoo", "doccia"] },
  { group: "grassi", sub: "burro", any: [["burro"], ["margarina"], ["strutto"], ["burrocacao"]], not: ["arachid", "cacao", "karit", "biscott", "frollin", "tortin", "pane", "cornett", "sfoglia", "gnocchi", "salvia"] },
  { group: "grassi", sub: "avocado", any: [["avocado"], ["guacamole"]] },
  { group: "grassi", sub: "frutta-secca", any: [["noci"], ["mandorle"], ["nocciole"], ["pistacch"], ["anacard"], ["arachid"], ["pinoli"], ["semi di"], ["girasole"], ["=chia"], ["=noce"], ["=lino"], ["frutta secca"], ["pecan"], ["macadamia"], ["burro di arachidi"], ["sesamo"]], not: ["biscott", "barretta", "gelato", "cioccolat", "torrone", "pasta di", "olio", "crema", "latte", "bevanda", "pesto", "salsa", "sugo", "pomodor", "secchi", "cracker", "cereali"] },

  // Carboidrati
  { group: "carboidrati", sub: "pasta", any: [["pasta"], ["spaghett"], ["penne"], ["pennette"], ["fusill"], ["rigaton"], ["maccheron"], ["linguine"], ["tagliatell"], ["tortell"], ["tortellon"], ["ravioli"], ["agnolotti"], ["cappelletti"], ["gnocchi"], ["gnocchett"], ["lasagn"], ["cannelloni"], ["farfalle"], ["orecchiett"], ["paccheri"], ["bucatini"], ["fettuccine"], ["conchigli"], ["ditalini"], ["pastina"], ["noodles"], ["mezze maniche"], ["strozzapret"], ["cavatapp"], ["trofie"], ["gemelli"], ["sedani"], ["tagliolini"], ["capellini"], ["vermicelli"], ["bigoli"], ["pizzoccheri"], ["tortiglioni"], ["spaghettoni"], ["rotelle"], ["fregola"], ["radiator"], ["elicoidal"], ["cellentani"], ["puntine"], ["stelline"], ["farfallin"], ["tubett"], ["chifferi"], ["eliche"], ["ziti"], ["bavette"], ["fidelini"], ["ave maria"], ["garofalo"], ["de cecco"], ["rummo"], ["voiello"], ["la molisana"], ["delverde"], ["agnesi"], ["divella"], ["viva la mamma"], ["margherite"], ], not: ["sugo", "salsa", "pesto", "sfoglia", "pizza", "frolla", "pasta di", "dentifric", "acciuga", "olive", "tonno", "insalata di", "dolc"] },
  { group: "carboidrati", sub: "riso", any: [["riso"], ["risotto"], ["basmati"], ["arborio"], ["carnaroli"], ["parboiled"], ["venere"]], not: ["latte", "bevanda", "gallette", "farina", "cracker", "soffiato", "olio", "burro"] },
  { group: "carboidrati", sub: "crackers", any: [["cracker"], ["crackers"], ["grissin"], ["tarall"], ["fette biscottate"], ["gallette"], ["schiacciat"], ["friselle"], ["sfogliatin"], ["crostini"], ["bruschette"]], not: ["gelato"] },
  { group: "carboidrati", sub: "pane", any: [["pane"], ["panin"], ["bauletto"], ["pan carre"], ["pancarre"], ["piadin"], ["wrap"], ["tortilla"], ["focaccia"], ["pizza"], ["pinsa"], ["puccia"], ["ciabatt"], ["pangrattato"], ["rosetta"], ["baguette"], ["michett"], ["hamburger bun"], ["pita"], ["kebab"], ["sandwich"], ["toast"], ["pasta sfoglia"], ["pasta brisee"], ["pasta frolla"], ["rotolo", "pasta"]], not: ["pan di stelle", "pan di spagna", "formaggio", "burro", "cane"] },
  { group: "carboidrati", sub: "farine", any: [["farina"], ["semola"], ["amido"], ["fecola"], ["lievito"], ["polenta"], ["couscous"], ["cous cous"], ["cereali"], ["corn flakes"], ["muesli"], ["fiocchi"], ["avena"], ["orzo perlato"], ["farro"], ["quinoa"], ["bulgur"], ["miglio"], ["granola"], ["cornflakes"], ["porridge"]], not: ["bevanda", "latte", "biscott", "barretta", "torta", "cioccolat", "gelato"] },

  // Proteine
  { group: "proteine", sub: "uova", any: [["uova"], ["uovo"], ["albume"], ["tuorl"]], not: ["pasta", "tagliatell", "cioccolat", "kinder", "maionese", "sorpresa", "pasqua", "biscott", "tagliolini", "gnocchi", "cannelloni", "lasagn", "tortell", "ravioli", "torta"] },
  { group: "proteine", sub: "salumi", any: [["prosciutto"], ["salame"], ["mortadella"], ["bresaola"], ["speck"], ["pancetta"], ["coppa"], ["affettat"], ["wurstel"], ["würstel"], ["salsiccia"], ["salamini"], ["nduja"], ["guanciale"], ["culatello"], ["cotechino"], ["zampone"], ["lardo"], ["porchetta"], ["salumi"], ["spalla cotta"], ["strolghino"], ["stinco"], ["bacon"], ["wurst"], ["alette"], ["tonnato"], ["tacchino", "fette"], ["petto di tacchino", "arrosto"]], not: ["pizza", "panino", "sandwich", "toast", "tramezzino", "ripien", "pasta", "tortell", "ravioli", "cane", "gatto", "sugo", "risotto", "insalata", "olio", "gnocchi"] },
  {
    group: "proteine",
    sub: "pesce",
    any: [["salmone"], ["merluzzo"], ["nasello"], ["orata"], ["branzino"], ["spigola"], ["gamber"], ["calamar"], ["polpo"], ["seppie"], ["seppia"], ["cozze"], ["vongole"], ["sogliola"], ["platessa"], ["pangasio"], ["trota"], ["baccala"], ["stoccafisso"], ["surimi"], ["bastoncini"], ["pesce"], ["scampi"], ["mazzancolle"], ["totani"], ["halibut"], ["tilapia"], ["cernia"], ["dentice"], ["rombo"], ["frutti di mare"], ["misto mare"], ["molluschi"], ["crostacei"], ["fish"], ["pescato"], ["filetti di"], ["mitili"], ["aragosta"], ["gambero"]],
    not: ["pizza", "pasta", "sugo", "risotto", "ravioli", "tortell", "gatto", "cane", "insalata", "panino", "sandwich", "olio di", "crema", "cracker", "gnocchi", "pollo", "tacchino", "maiale", "manzo", "vitello", "pesche", "pesca", "sfoglia"],
  },
  {
    group: "proteine",
    sub: "carne",
    any: [["pollo"], ["tacchino"], ["manzo"], ["bovino"], ["vitello"], ["vitellone"], ["suino"], ["maiale"], ["agnello"], ["coniglio"], ["bistecc"], ["hamburger"], ["macinato"], ["cotolett"], ["fesa"], ["arrosto"], ["spezzatino"], ["fettine"], ["cosce"], ["coscia"], ["petto"], ["polpett"], ["braciol"], ["costine"], ["salsicc"], ["carne"], ["tagliata"], ["scaloppin"], ["filetto"], ["controfiletto"], ["bollito"], ["ossobuco"], ["spiedin"], ["nuggets"], ["kebab"], ["pulled"], ["roast"], ["fiorentina"], ["girello"], ["cavallo"], ["anatra"], ["faraona"], ["ali di"], ["sovracosc"]],
    not: ["pizza", "pasta", "sugo", "ragu", "risotto", "ravioli", "tortell", "gatto", "cane", "insalata", "panino", "sandwich", "brodo", "dado", "preparato", "gnocchi", "olio", "maionese", "crema di", "zuppa", "minestra", "patatine", "cracker"],
  },
  { group: "proteine", sub: "latticini", any: [["latte"], ["yogurt"], ["mozzarell"], ["parmigiano"], ["grana"], ["pecorino"], ["ricotta"], ["mascarpone"], ["gorgonzola"], ["provolone"], ["fontina"], ["asiago"], ["scamorza"], ["stracchino"], ["crescenza"], ["emmental"], ["gouda"], ["formagg"], ["burrata"], ["feta"], ["philadelphia"], ["spalmabile"], ["panna"], ["kefir"], ["skyr"], ["sottilette"], ["bocconcini"], ["taleggio"], ["caciotta"], ["cheddar"], ["brie"], ["camembert"], ["mozzarelline"], ["primosale"], ["halloumi"], ["quark"], ["besciamella"], ["tofu"], ["seitan"], ["caciocavallo"], ["provol"], ["leerdammer"], ["pizzoli"], ["burrat"], ["robiola"], ["edam"], ["fontal"], ["tomini"], ["grattugiat"], ["casera"], ["ricottin"], ["riccottin"], ["pizzarella"], ["biraghini"], ["tronchetto"], ["galbanino"], ["gran moravia"]], not: ["pasta", "tortell", "ravioli", "pizza", "sugo", "risotto", "gelato", "cioccolat", "biscott", "gnocchi", "torta", "crema di", "lasagn", "cannelloni", "soia", "avena", "mandorla", "cocco", "riso", "vegetale", "corpo", "detergente", "bagno", "cracker", "snack", "patatine", "pane", "panin", "piadin", "tramezz", "sandwich", "toast"] },

  // Frutta e verdura
  { group: "frutta-verdura", sub: "zuppe", any: [["zuppa"], ["zuppe"], ["vellutata"], ["vellutate"], ["minestrone"], ["minestra"], ["passato di verdura"], ["crema di verdure"], ["brodo vegetale"], ["ribollita"]], not: ["dado"] },
  { group: "frutta-verdura", sub: "legumi", any: [["fagioli"], ["ceci"], ["lenticchi"], ["piselli"], ["legumi"], ["soia"], ["fave"], ["cannellini"], ["borlotti"], ["passata"], ["polpa", "pomodor"], ["pelati"], ["pomodor", "pelati"], ["concentrato", "pomodor"], ["olive"], ["capperi"], ["carciofini"], ["giardiniera"], ["=mais"], ["sottaceti"]], not: ["farina", "pasta", "surgelat", "insalata di riso", "sugo pronto", "salsa", "bevanda", "latte"] },
  { group: "frutta-verdura", sub: "frutta", any: [["frutta"], ["=mela"], ["=mele"], ["=pera"], ["=pere"], ["=banana"], ["=banane"], ["=arancia"], ["=arance"], ["mandarin"], ["clementin"], ["=limone"], ["=limoni"], ["kiwi"], ["=uva"], ["fragol"], ["cilieg"], ["=pesca"], ["=pesche"], ["nettarin"], ["albicocc"], ["=susine"], ["=prugne"], ["ananas"], ["=melone"], ["=meloni"], ["anguria"], ["cocomero"], ["=fichi"], ["=cachi"], ["melagran"], ["mirtill"], ["lampon"], ["pompelm"], ["mango"], ["papaya"], ["frutti di bosco"], ["ribes"], ["=more"], ["castagne"], ["bergamott"], ["litchi"], ["maracuja"], ["cocco"]], not: ["succo", "yogurt", "gelato", "marmellat", "confettura", "torta", "biscott", "merendin", "tisana", "=the", "=te", "bevanda", "aroma", "gusto", "bagno", "sapone", "detersiv", "olio", "aceto", "sciroppo", "polpa", "ghiacciol", "fette", "crostata", "snack", "cioccolat", "smoothie", "barretta", "cereali", "latte", "deo", "spray", "concentrato", "gelato", "algida", "piatti", "profumat", "dove", "svelto", "winni"] },
  { group: "frutta-verdura", sub: "verdura", any: [["verdur"], ["insalat"], ["lattuga"], ["rucola"], ["spinac"], ["pomodor"], ["zucchin"], ["melanzan"], ["peperon"], ["carot"], ["patat"], ["cipoll"], ["=aglio"], ["carciof"], ["cavol"], ["broccol"], ["finocch"], ["sedano"], ["=zucca"], ["funghi"], ["fagiolin"], ["asparag"], ["radicchio"], ["verza"], ["bietol"], ["cetriol"], ["porri"], ["ravanell"], ["barbabietol"], ["cime di rapa"], ["friarielli"], ["valeriana"], ["songino"], ["scarola"], ["indivia"], ["basilico"], ["prezzemolo"], ["erbe aromatiche"], ["zenzero"], ["cicoria"], ["taccole"], ["porcini"], ["champignon"], ["pak choi"], ["mix di verdure"], ["ortaggi"], ["iceberg"], ["crudit"], ["germogli"], ["frites"], ["grigliat"]], not: ["succo", "sugo", "salsa", "pesto", "pasta", "pizza", "risotto", "ravioli", "tortell", "gnocchi", "crocchett", "patatine", "chips", "snack", "tisana", "polpa", "passata", "pelati", "concentrato", "ketchup", "maionese", "dado", "burger", "hamburger", "cracker", "torta", "lasagn", "cannelloni", "sfogliatell", "ripien", "cotolett", "gelato", "pane", "panin", "cioccolat", "biscott", "frollin", "purea", "fiocchi", "farina", "tonno", "olio", "aceto"] },

  { group: "altro", sub: "condimenti", any: [["sugo"], ["salsa"], ["pesto"], ["ragu"], ["maionese"], ["ketchup"], ["senape"], ["aceto"], ["=sale"], ["=pepe"], ["spezie"], ["dado"], ["brodo"], ["condimento"], ["tahin"], ["soia"], ["curry"], ["origano"], ["preparato"], ["zucchero"], ["dolcificante"], ["sciroppo"], ["aromi"]] },
];

// Parole della categoria di origine (Tigros, Aldi) che chiariscono casi dubbi o confermano il surgelato.
const CATEGORY_HINTS: { group: GroupId; sub: string; pattern: RegExp }[] = [
  { group: "proteine", sub: "carne", pattern: /\bcarni?\b|macelleria|pollame/i },
  { group: "proteine", sub: "pesce", pattern: /pescheria|\bpesce\b/i },
  { group: "proteine", sub: "latticini", pattern: /latticin|formagg|latte e panna/i },
  { group: "frutta-verdura", sub: "frutta", pattern: /ortofrutta|frutta/i },
  { group: "casa-persona", sub: "detersivi", pattern: /pulizia|igiene e pulizia/i },
  { group: "casa-persona", sub: "igiene", pattern: /cura (della )?persona|igiene persona|bellezza/i },
  { group: "dolci", sub: "merendine", pattern: /dolci|colazione/i },
  { group: "bevande", sub: "gassate", pattern: /bevande analcoliche|bibite/i },
];

export function classifyProduct(product: { name: string; brand?: string | null; category?: string | null; packageText?: string | null }): Classification {
  const haystack = normalizeText(`${product.brand ?? ""} ${product.name}`);
  const categoryText = normalizeText(product.category ?? "");

  const frozen = FROZEN_TERMS.some((term) => hasTerm(haystack, term)) || /surgelat|freezer|frozen/.test(categoryText);
  const canned = CANNED_TERMS.some((term) => hasTerm(haystack, term));
  const storageFor = (group: GroupId, sub: string): Storage | null => {
    if (frozen && group !== "dolci") return "surgelato";
    if (group === "proteine" && (sub === "carne" || sub === "pesce")) {
      const tinned = /tonno|sgombro|sardin|acciug|alici/.test(haystack);
      return canned || tinned ? "conserva" : "fresco";
    }
    if (group === "frutta-verdura" && (sub === "frutta" || sub === "verdura")) {
      if (canned) return "conserva";
      // Fresco solo se il reparto è l'ortofrutta o il nome è quello di un frutto/ortaggio, non di un prodotto lavorato.
      if (PRODUCE_CATEGORY.test(categoryText)) return "fresco";
      const processed = PROCESSED_TERMS.some((term) => hasTerm(haystack, term));
      return !processed && haystack.split(" ").length <= 6 ? "fresco" : null;
    }
    if (group === "frutta-verdura" && sub === "legumi") return "conserva";
    return null;
  };

  for (const rule of RULES) {
    if (rule.not?.some((term) => match(haystack, term))) continue;
    if (rule.any.some((group) => group.every((term) => match(haystack, term)))) {
      // Il gelato e i prodotti surgelati restano nella loro categoria: la conservazione è un filtro a parte.
      return { group: rule.group, sub: rule.sub, storage: storageFor(rule.group, rule.sub) };
    }
  }

  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(product.category ?? "")) return { group: hint.group, sub: hint.sub, storage: storageFor(hint.group, hint.sub) };
  }
  return { group: "altro", sub: "altro", storage: frozen ? "surgelato" : null };
}
