import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCoopPage, parseValidity } from "./coop-parse";
import type { PdfTextItem } from "./pdf";

test("parseValidity legge intervalli e scadenze", () => {
  assert.deepEqual(parseValidity("Prezzi validi dal 15 al 28 ottobre 2026 salvo esaurimento scorte", 2026), { from: "2026-10-15", to: "2026-10-28" });
  assert.deepEqual(parseValidity("DAL 22 AL 28 OTTOBRE", 2026), { from: "2026-10-22", to: "2026-10-28" });
  assert.deepEqual(parseValidity("dal 28 ottobre al 3 novembre 2026", 2026), { from: "2026-10-28", to: "2026-11-03" });
  assert.deepEqual(parseValidity("Prezzi validi fino al 21 ottobre 2026", 2026), { from: null, to: "2026-10-21" });
  assert.equal(parseValidity("nessuna data", 2026), null);
});

const item = (str: string, x: number, y: number, size: number): PdfTextItem => ({ str, x, y, size });

test("parseCoopPage legge un riquadro con sconto soci", () => {
  const items = [
    item("MAXIBURGER RAZZA", 67, 335, 10),
    item("PIEMONTESE FIOR FIORE", 67, 325, 10),
    item("180 g", 67, 316, 8),
    item("4", 67, 303, 10),
    item(",99", 72, 303, 10),
    item("€", 86, 303, 7),
    item("25", 75, 268, 23),
    item("%", 99, 269, 10),
    item("SCONTO SOCI", 72, 261, 7),
    item("3", 67, 230, 32),
    item(",74", 84, 230, 20),
    item("€", 111, 230, 14),
    item("20,78 €", 67, 219, 7),
    item("al kg", 91, 219, 7),
  ];
  const fallback = { from: "2026-10-15", to: "2026-10-28" };
  const { blocks, skipped } = parseCoopPage(items, () => null, fallback);
  assert.equal(skipped.length, 0);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].name, "Maxiburger Razza Piemontese Fior Fiore");
  assert.equal(blocks[0].price, 3.74);
  assert.equal(blocks[0].originalPrice, 4.99);
  assert.equal(blocks[0].packageText, "180 g");
  assert.equal(blocks[0].unitPrice, 20.78);
  assert.equal(blocks[0].loyalty, true);
  assert.equal(blocks[0].validTo, "2026-10-28");
});
