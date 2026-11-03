import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { sha1Hex } from "./hash";

test("sha1Hex coincide con node:crypto", () => {
  for (const text of ["", "abc", "coop|Pasta Barilla|500 g|false", "è già così — àèìòù ".repeat(20)]) {
    assert.equal(sha1Hex(text), createHash("sha1").update(text).digest("hex"));
  }
});
