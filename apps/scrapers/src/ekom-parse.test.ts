import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEkomPage } from "./ekom-parse";
import type { PdfTextItem } from "./pdf";

const item = (str: string, x: number, y: number, size = 10): PdfTextItem => ({ str, x, y, size });

test("layout A: descrizione sopra il prezzo pieno", () => {
  const { blocks } = parseEkomPage([
    item("50", 285, 674, 17),
    item("%", 335, 679),
    item("PASTA DI SEMOLA", 292, 657),
    item("BARILLA", 292, 644),
    item("DIVERSI TIPI", 292, 633),
    item("G 500", 292, 622, 7),
    item("DA 1,29 €", 292, 612, 9),
    item("0,64", 304, 573, 38),
    item("€", 378, 573, 12),
    item("AL KG 1,28 €", 323, 557, 8),
  ]);
  assert.deepEqual(blocks, [
    { name: "Pasta Di Semola Barilla Diversi Tipi", packageText: "500 g", price: 0.64, originalPrice: 1.29, discountPercent: 50, unitPrice: 1.28, unit: "kg" },
  ]);
});

test("layout B: intestazione sopra, descrizione sotto il prezzo", () => {
  const { blocks } = parseEkomPage([
    item("SCONTO", 33, 770),
    item("25", 73, 770, 17),
    item("%", 92, 770),
    item("DA 6,39 €", 33, 758, 9),
    item("€", 33, 728, 12),
    item("4,75", 39, 728, 38),
    item("AL KG 19,00 €", 45, 711, 8),
    item("CAFFÈ ESPRESSO", 27, 690),
    item("CREMA E GUSTO", 27, 679),
    item("LAVAZZA", 27, 668),
    item("G 250", 27, 659, 7),
  ]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].name, "Caffè Espresso Crema E Gusto Lavazza");
  assert.equal(blocks[0].packageText, "250 g");
  assert.equal(blocks[0].price, 4.75);
  assert.equal(blocks[0].originalPrice, 6.39);
  assert.equal(blocks[0].unitPrice, 19);
});

test("layout C: descrizione a destra del prezzo", () => {
  const { blocks } = parseEkomPage([
    item("SCONTO", 221, 578),
    item("25", 261, 578, 17),
    item("%", 280, 578),
    item("RINGO PAVESI", 305, 588),
    item("VANIGLIA, CACAO", 305, 579, 7),
    item("G 330", 305, 570, 7),
    item("DA 2,89 €", 221, 566, 9),
    item("€", 221, 536, 12),
    item("2,15", 228, 536, 38),
    item("AL KG 6,52 €", 235, 519, 8),
  ]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].name, "Ringo Pavesi Vaniglia, Cacao");
  assert.equal(blocks[0].packageText, "330 g");
  assert.equal(blocks[0].price, 2.15);
  assert.equal(blocks[0].unitPrice, 6.52);
});

test("la percentuale in testata errata non scarta un prezzo plausibile", () => {
  const { blocks } = parseEkomPage([
    item("SCONTO", 33, 578),
    item("20", 73, 578, 17),
    item("%", 93, 578),
    item("DA 2,49 €", 33, 566, 9),
    item("€", 33, 536, 12),
    item("1,89", 39, 536, 38),
    item("BISCOTTI", 27, 498),
    item("G 350", 27, 460, 7),
  ]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].discountPercent, 24);
});

test("scarta i prezzi non inferiori al prezzo pieno", () => {
  const { blocks, skipped } = parseEkomPage([
    item("PASTA", 292, 657),
    item("DA 1,29 €", 292, 612, 9),
    item("1,49", 304, 573, 38),
    item("€", 378, 573, 12),
  ]);
  assert.equal(blocks.length, 0);
  assert.equal(skipped.length, 1);
});
