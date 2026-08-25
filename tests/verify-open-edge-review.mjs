import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.ok(existsSync(new URL("../reviews/online-turn-open-edge-landing/index.html", import.meta.url)));
assert.ok(existsSync(new URL("../reviews/assets/online-turn-open-edge-landing-storyboard.png", import.meta.url)));

const home = read("index.html");
const review = read("reviews/online-turn-open-edge-landing/index.html");
const readme = read("reviews/README.md");
const workflow = read(".github/workflows/pages.yml");
const storyboard = readFileSync(
  new URL("../reviews/assets/online-turn-open-edge-landing-storyboard.png", import.meta.url),
);

assert.match(home, /Online turn · Open Edge Landing/);
assert.match(home, /href="reviews\/online-turn-open-edge-landing\/"/);
assert.match(home, /<small>Approved<\/small>/);
assert.match(home, /light-stamped result/i);

assert.match(review, /<h1>Open Edge Landing \+ Remote Touch Echo<\/h1>/);
assert.match(review, /<span class="badge">Approved<\/span>/);
assert.match(review, /no dedicated mat or tray/i);
assert.match(review, /Wi-Fi-off icon/i);
assert.match(review, /four scoring cowries[^.]*rim light/i);
assert.match(review, /unboxed[^.]*numeral[^.]*open surface/i);
assert.match(review, /number disappears before pawn selection/i);
assert.match(review, /reconnect[^.]*without a result number/i);
assert.match(review, /reduced motion[^.]*static, unboxed numeral/i);
assert.match(review, /without a card, chip, badge, medallion, or container/i);
assert.match(review, /<h2>Approved interaction<\/h2>/);
assert.match(review, /approved for implementation/i);
assert.doesNotMatch(review, /compact numeric result/i);
assert.doesNotMatch(review, /Riya is rolling|Riya is choosing|Reconnecting Riya/i);

assert.match(readme, /Open Edge Landing \+ Remote Touch Echo/);
assert.match(readme, /online-turn-open-edge-landing\//);
assert.match(readme, /— Approved/);
assert.match(workflow, /reviews\/online-turn-open-edge-landing\/index\.html/);
assert.match(workflow, /reviews\/assets\/online-turn-open-edge-landing-storyboard\.png/);
assert.match(workflow, /Open Edge Landing \+ Remote Touch Echo/);
assert.match(workflow, /grep -q "Approved"/);

assert.equal(
  createHash("sha256").update(storyboard).digest("hex"),
  "21a2a38edbf8133b86cdfeb51785a3e09c61203f099fede305d57fcd30d3eff9",
);

console.log("Approved light-stamped online-turn review contract verified.");
