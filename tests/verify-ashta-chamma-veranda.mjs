import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const reviewPath = new URL("reviews/ashta-chamma-veranda/index.html", root);
const imagePath = new URL("reviews/assets/ashta-chamma-veranda-composition.webp", root);

assert.ok(existsSync(reviewPath), "the veranda review page must exist");
assert.ok(existsSync(imagePath), "the selected composition asset must exist");

const home = read("index.html");
const review = read("reviews/ashta-chamma-veranda/index.html");
const readme = read("reviews/README.md");
const workflow = read(".github/workflows/pages.yml");
const image = readFileSync(imagePath);

assert.match(home, /Ashta Chamma · Veranda-first vertical slice/);
assert.match(home, /href="reviews\/ashta-chamma-veranda\/"/);
assert.match(home, /ashta-chamma-veranda-composition\.webp/);
assert.match(home, /Selected · review needed/);
assert.match(home, /href="reviews\/online-turn-open-edge-landing\/"/);
assert.match(home, /<small>Approved<\/small>/);

assert.match(review, /<h1>Ashta Chamma, at home on the veranda<\/h1>/);
assert.match(review, /Selected · owner review needed/);
assert.match(review, /It does not approve game rules or pawn positions/i);
assert.match(review, /exact five by five board grid/i);
assert.match(review, /grid count and screen hierarchy are selected here/i);
assert.match(review, /one arrow or swipe advances exactly one authored scene/i);
assert.match(review, /Grandma remains environmental Clothfolk/i);
assert.match(review, /Painted environment/);
assert.match(review, /Textile board/);
assert.match(review, /Sculptural objects/);
assert.match(review, /Courtyard Clothfolk/);
assert.match(review, /Clean native HUD/);
assert.match(review, /<small>Idle<\/small>/);
assert.match(review, /<small>Attention<\/small>/);
assert.match(review, /<small>Interaction<\/small>/);
assert.match(review, /<small>Reaction<\/small>/);
assert.match(review, /prefers-reduced-motion: reduce/);
assert.match(review, /viewport/);
assert.equal((review.match(/<span class="cell(?:\s|\")/g) ?? []).length, 25);
assert.equal((review.match(/<i class="cowrie"><\/i>/g) ?? []).length, 4);
assert.doesNotMatch(review, /\b(?:TODO|TBD|Pachisi|Chowka)\b/i);

assert.match(readme, /ashta-chamma-veranda\//);
assert.match(readme, /Selected, owner review needed/);
assert.match(workflow, /reviews\/ashta-chamma-veranda\/index\.html/);
assert.match(workflow, /reviews\/assets\/ashta-chamma-veranda-composition\.webp/);
assert.match(workflow, /node tests\/verify-ashta-chamma-veranda\.mjs/);

assert.equal(image.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(image.subarray(8, 12).toString("ascii"), "WEBP");
assert.equal(
  createHash("sha256").update(image).digest("hex"),
  "79f93128c45d50a40c6b9e1b24079386818e1f3c669dc5141e8e26a1fa3c75f1",
);
assert.ok(image.byteLength < 300_000, "composition asset should remain mobile-friendly");

console.log("Ashta Chamma veranda review contract verified.");
