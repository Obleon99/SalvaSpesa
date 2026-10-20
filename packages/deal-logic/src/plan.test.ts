import assert from "node:assert/strict";
import { test } from "node:test";
import type { ComparableOffer } from "./compare";
import { areEquivalent, planBasket } from "./plan";

let n = 0;
const offer = (chainId: string, name: string, packageText: string, price: number, brand: string | null = null): ComparableOffer => ({
  id: `o${++n}`, chainId, chainName: chainId.toUpperCase(), name, brand, packageText, price, originalPrice: null, discountPercent: null, unitPrice: null, unit: null,
});

test("areEquivalent riconosce lo stesso prodotto con nomi scritti in modo diverso", () => {
  assert.equal(areEquivalent({ brand: null, name: "Barilla Al Bronzo Pasta Linguine 500g", packageText: "500 g" }, { brand: "BARILLA", name: "AL BRONZO LINGUINE", packageText: "500 g" }), true);
  assert.equal(areEquivalent({ brand: null, name: "Barilla Spaghetti", packageText: "500 g" }, { brand: null, name: "Barilla Spaghetti", packageText: "1 kg" }), false);
  assert.equal(areEquivalent({ brand: null, name: "Pasta X", packageText: null, ean: "800" }, { brand: null, name: "Altro nome", packageText: null, ean: "800" }), true);
  assert.equal(areEquivalent({ brand: null, name: "Barilla Spaghetti", packageText: "500 g" }, { brand: null, name: "De Cecco Spaghetti", packageText: "500 g" }), false);
});

test("planBasket sceglie i negozi che minimizzano la spesa", () => {
  const lines = [
    { key: "1", chainId: "a", price: 2, brand: "Barilla", name: "Spaghetti", packageText: "500 g" },
    { key: "2", chainId: "a", price: 3, brand: "Mutti", name: "Passata", packageText: "700 g" },
    { key: "3", chainId: "b", price: 4, brand: "Lavazza", name: "Caffè macinato", packageText: "250 g" },
  ];
  const offers = [
    offer("a", "Spaghetti", "500 g", 2, "Barilla"),
    offer("a", "Passata", "700 g", 3, "Mutti"),
    offer("b", "Spaghetti", "500 g", 1.5, "Barilla"),
    offer("b", "Passata", "700 g", 2.8, "Mutti"),
    offer("b", "Caffè macinato", "250 g", 4, "Lavazza"),
    offer("c", "Caffè macinato", "250 g", 3.2, "Lavazza"),
  ];
  const { baseline, plans } = planBasket(lines, offers);
  assert.equal(baseline, 9);
  const [one, two] = plans;
  assert.deepEqual(one.chainIds, ["b"]);
  assert.equal(one.covered, 3);
  assert.equal(one.total, 8.3);
  assert.equal(one.savings, 0.7);
  assert.equal(two.covered, 3);
  assert.equal(two.total, 7.5);
  assert.deepEqual([...two.chainIds].sort(), ["b", "c"]);
});
