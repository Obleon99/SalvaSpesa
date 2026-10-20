import assert from "node:assert/strict";
import { test } from "node:test";
import { seasonalProduce, seasonalStatus } from "./seasonal";
import { classifyProduct } from "./taxonomy";

const classify = (name: string, category?: string) => classifyProduct({ name, category });

test("classifica proteine con conservazione", () => {
  assert.deepEqual(classify("Petto di pollo a fette"), { group: "proteine", sub: "carne", storage: "fresco" });
  assert.deepEqual(classify("Filetti di merluzzo surgelati"), { group: "proteine", sub: "pesce", storage: "surgelato" });
  assert.equal(classify("Tonno all'olio di oliva 3x80 g").storage, "conserva");
  assert.equal(classify("Tonno all'olio di oliva 3x80 g").sub, "pesce");
  assert.equal(classify("Mozzarella di bufala").sub, "latticini");
  assert.equal(classify("Prosciutto cotto alta qualità").sub, "salumi");
});

test("non confonde prodotti con parole ambigue", () => {
  assert.equal(classify("Latte detergente viso").group, "casa-persona");
  assert.equal(classify("Biscotti al latte").group, "dolci");
  assert.equal(classify("Olio extravergine di oliva").group, "grassi");
  assert.equal(classify("Fanta arancia 1,5 l").sub, "gassate");
  assert.equal(classify("Fantasia di funghi").group !== "bevande", true);
  assert.equal(classify("Purina gatto con tacchino").group, "animali");
  assert.equal(classify("Cesari Amarone Valpolicella DOCG").group, "bevande");
  assert.equal(classify("Wurstel hot dog").group, "proteine");
});

test("raggruppa carboidrati, bevande e bevande calde", () => {
  assert.equal(classify("Spaghetti n.5 500 g").sub, "pasta");
  assert.equal(classify("Riso Carnaroli").sub, "riso");
  assert.equal(classify("Caffè macinato per moka").group, "bevande-calde");
  assert.equal(classify("Tè verde 25 filtri").sub, "te");
  assert.equal(classify("Estathè limone").group, "bevande");
  assert.equal(classify("Acqua naturale 6x1,5 l").sub, "acqua");
});

test("frutta e verdura surgelata o in zuppa restano nel gruppo", () => {
  assert.deepEqual(classify("Spinaci surgelati"), { group: "frutta-verdura", sub: "verdura", storage: "surgelato" });
  assert.equal(classify("Vellutata di zucca").sub, "zuppe");
  assert.equal(classify("Mele Golden").sub, "frutta");
});

test("riconosce la frutta e verdura di stagione per mese", () => {
  assert.equal(seasonalStatus("Mele Golden 1 kg", 10)?.inSeason, true);
  assert.equal(seasonalStatus("Fragole 250 g", 10)?.inSeason, false);
  assert.equal(seasonalStatus("Succo di pera", 10), null);
  assert.equal(seasonalStatus("Zucca mantovana", 12)?.inSeason, true);
  assert.equal(seasonalProduce(10).frutta.includes("Cachi"), true);
  assert.equal(seasonalProduce(7).verdura.includes("Zucchine"), true);
});
