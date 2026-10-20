import assert from "node:assert/strict";
import { test } from "node:test";
import {
  discountPercent,
  extractBrand,
  htmlToText,
  parseEuro,
  parseItalianDates,
  parseUnitPrice,
  unitPriceFromPackage,
} from "./parse";

test("unitPriceFromPackage ricava il prezzo al kg/l dal peso", () => {
  assert.deepEqual(unitPriceFromPackage(1.99, "0,132 kg"), { unitPrice: 15.08, unit: "kg" });
  assert.deepEqual(unitPriceFromPackage(2.24, "4x 56 g (sgocc.) confezione"), { unitPrice: 10, unit: "kg" });
  assert.deepEqual(unitPriceFromPackage(6, "12 l"), { unitPrice: 0.5, unit: "l" });
  assert.deepEqual(unitPriceFromPackage(1.49, "Sfusa al kg"), { unitPrice: 1.49, unit: "kg" });
  assert.equal(unitPriceFromPackage(1, "1 pz"), null);
  assert.equal(unitPriceFromPackage(1, "Alla confezione"), null);
});

test("parseEuro legge i formati italiani", () => {
  assert.equal(parseEuro("2,49 €"), 2.49);
  assert.equal(parseEuro("1,99 €"), 1.99);
  assert.equal(parseEuro("€ 3.50"), 3.5);
  assert.equal(parseEuro("1.299,00 €"), 1299);
  assert.equal(parseEuro("gratis"), null);
  assert.equal(parseEuro(null), null);
});

test("parseUnitPrice normalizza a kg, l o pz", () => {
  assert.deepEqual(parseUnitPrice("1 kg = 6.60 €"), { unitPrice: 6.6, unit: "kg" });
  assert.deepEqual(parseUnitPrice("1 kg 18,86 €"), { unitPrice: 18.86, unit: "kg" });
  assert.deepEqual(parseUnitPrice("100 g 1,20 €"), { unitPrice: 12, unit: "kg" });
  assert.deepEqual(parseUnitPrice("1 l = 1,29 €"), { unitPrice: 1.29, unit: "l" });
  assert.deepEqual(parseUnitPrice("100 ml 0,50 €"), { unitPrice: 5, unit: "l" });
  assert.deepEqual(parseUnitPrice("1 pz = 0,30 €"), { unitPrice: 0.3, unit: "pz" });
  assert.deepEqual(parseUnitPrice("1 kg = 1.59"), { unitPrice: 1.59, unit: "kg" });
  assert.equal(parseUnitPrice("confezione da 6"), null);
  assert.equal(parseUnitPrice("1.5 kg confezione"), null);
});

test("discountPercent calcola lo sconto solo se il prezzo è sceso", () => {
  assert.equal(discountPercent(0.99, 1.29), 23);
  assert.equal(discountPercent(1.99, 1.99), null);
  assert.equal(discountPercent(1.99, null), null);
});

test("parseItalianDates restituisce date ISO in ordine", () => {
  assert.deepEqual(parseItalianDates("da gio 08.10.2026 a mer 21.10.2026"), ["2026-10-08", "2026-10-21"]);
  assert.deepEqual(parseItalianDates("nessuna data"), []);
});

test("extractBrand riconosce la marca in maiuscolo", () => {
  assert.equal(extractBrand("DIXAN Detersivo liquido Color"), "DIXAN");
  assert.equal(extractBrand("DAL SALUMIERE Prosciutto cotto"), "DAL SALUMIERE");
  assert.equal(extractBrand("FIN CARRÉ Cioccolato al latte"), "FIN CARRÉ");
  assert.equal(extractBrand("Philadelphia"), null);
  assert.equal(extractBrand("YOGURT"), null);
  assert.equal(extractBrand("Latte Zymil senza lattosio"), null);
});

test("htmlToText unisce gli elenchi", () => {
  assert.equal(htmlToText("<ul> <li>Alla fragola</li> <li>0% Grassi</li></ul>"), "Alla fragola · 0% Grassi");
  assert.equal(htmlToText("<p>Solo testo</p>"), "Solo testo");
  assert.equal(htmlToText(null), null);
});
