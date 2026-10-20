import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBrand, qualityLabels } from "./brands";
import { assignFamily, buildComparisonGroups, summarizeGroups, type ComparableOffer } from "./compare";
import { parseQuantity } from "./text";

let counter = 0;
function offer(partial: Partial<ComparableOffer> & Pick<ComparableOffer, "name" | "price" | "chainId" | "chainName">): ComparableOffer {
  counter++;
  return { id: `o${counter}`, brand: null, packageText: null, originalPrice: null, discountPercent: null, unitPrice: null, unit: null, ...partial };
}

test("parseQuantity converte in kg e litri", () => {
  assert.deepEqual(parseQuantity("500 g"), { value: 0.5, unit: "kg" });
  assert.deepEqual(parseQuantity("4x 56 g (sgocc.)"), { value: 0.224, unit: "kg" });
  assert.deepEqual(parseQuantity("1,5 l"), { value: 1.5, unit: "l" });
  assert.deepEqual(parseQuantity("750 ml"), { value: 0.75, unit: "l" });
  assert.deepEqual(parseQuantity("1 litro"), { value: 1, unit: "l" });
  assert.deepEqual(parseQuantity("1,5 litri x 6"), { value: 1.5, unit: "l" });
  assert.equal(parseQuantity("1 pz"), null);
});

test("classifyBrand distingue leader, marchio del distributore e altre marche", () => {
  assert.equal(classifyBrand("esselunga", null, "Barilla Al Bronzo Pasta Linguine 500g").tier, "leader");
  assert.equal(classifyBrand("esselunga", null, "Esselunga Bio Olio extravergine 1L").tier, "private-label");
  assert.equal(classifyBrand("lidl", "MILBONA", "Ricotta fresca").tier, "private-label");
  assert.equal(classifyBrand("pam", null, "Pampers Baby Dry").tier, "leader");
  assert.equal(classifyBrand("penny", null, "Sconosciuto Biscotti").tier, "other");
});

test("qualityLabels riconosce bio, DOP e 100% italiano", () => {
  assert.deepEqual(qualityLabels("Olio extravergine 100% italiano Bio"), ["Bio", "100% italiano", "Extravergine"]);
  assert.deepEqual(qualityLabels("Patata di Bologna D.O.P."), ["DOP/IGP"]);
  assert.deepEqual(qualityLabels("Pasta semplice"), []);
});

test("assignFamily esclude i prodotti fuori famiglia", () => {
  assert.equal(assignFamily({ brand: null, name: "Frollini Cacao e Nocciole 700g" })?.id, "biscotti");
  assert.equal(assignFamily({ brand: null, name: "Tonno all'olio di oliva 4x80g" })?.id, "tonno");
  assert.equal(assignFamily({ brand: null, name: "Buitoni Tonno Pizza surgelata" }), null);
  assert.equal(assignFamily({ brand: null, name: "Felix Gelatina Tonno" }), null);
  assert.equal(assignFamily({ brand: null, name: "Olio extravergine di oliva 1L" })?.id, "olio");
  assert.equal(assignFamily({ brand: null, name: "Filetti di tonno sott'olio" })?.id !== "olio", true);
});

test("buildComparisonGroups costruisce leader, miglior scelta e massimo risparmio", () => {
  const offers = [
    offer({ chainId: "esselunga", chainName: "Esselunga", brand: "Mulino Bianco", name: "Pan di Stelle Frollini", packageText: "700 g", price: 3.49, unit: "kg", unitPrice: 4.99 }),
    offer({ chainId: "coop", chainName: "Coop", name: "Coop Frollini Cacao e Nocciole Senza olio di palma", packageText: "700 g", price: 2.19, unit: "kg", unitPrice: 3.13, discountPercent: 10 }),
    offer({ chainId: "lidl", chainName: "Lidl", brand: "SONDEY", name: "Frollini Stellati", packageText: "700 g", price: 1.69, unit: "kg", unitPrice: 2.41 }),
  ];
  const [group] = buildComparisonGroups(offers);
  assert.equal(group.family.id, "biscotti");
  assert.deepEqual(group.cards.map((c) => c.tier), ["leader", "winner", "discount"]);
  assert.equal(group.cards[0].scored.offer.chainId, "esselunga");
  assert.equal(group.cards[2].scored.offer.chainId, "lidl");
  assert.equal(group.cards[1].scored.offer.chainId, "coop");
  assert.equal(group.cards[2].savingsPercent, 52);
  assert.equal(group.cards[2].savingsAmount, 1.81);
  assert.ok(group.recommendation?.includes("Coop"));
  assert.equal(group.bestByChain.length, 3);
});

test("buildComparisonGroups scarta i gruppi con un solo prodotto e i prezzi anomali", () => {
  const single = [offer({ chainId: "lidl", chainName: "Lidl", name: "Frollini", packageText: "500 g", price: 1, unit: "kg", unitPrice: 2 })];
  assert.equal(buildComparisonGroups(single).length, 0);

  const withOutlier = [
    offer({ chainId: "a", chainName: "A", name: "Pasta di semola", packageText: "500 g", price: 0.9, unit: "kg", unitPrice: 1.8 }),
    offer({ chainId: "b", chainName: "B", name: "Pasta di semola", packageText: "500 g", price: 1, unit: "kg", unitPrice: 2 }),
    offer({ chainId: "c", chainName: "C", name: "Pasta di semola campione", packageText: "10 g", price: 9, unit: "kg", unitPrice: 900 }),
  ];
  const [group] = buildComparisonGroups(withOutlier);
  assert.equal(group.offers.length, 2);
});

test("summarizeGroups calcola il risparmio medio", () => {
  const offers = [
    offer({ chainId: "e", chainName: "E", brand: "Barilla", name: "Pasta semola spaghetti", packageText: "500 g", price: 1.4, unit: "kg", unitPrice: 2.8 }),
    offer({ chainId: "l", chainName: "L", name: "Pasta di semola spaghetti", packageText: "500 g", price: 0.7, unit: "kg", unitPrice: 1.4, discountPercent: 10 }),
  ];
  const summary = summarizeGroups(buildComparisonGroups(offers));
  assert.equal(summary.groups, 1);
  assert.equal(summary.averageSavingsPercent, 50);
});
