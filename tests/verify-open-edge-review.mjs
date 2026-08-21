import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.ok(existsSync(new URL("../reviews/online-turn-open-edge-landing/index.html", import.meta.url)));
assert.ok(existsSync(new URL("../reviews/assets/online-turn-open-edge-landing-storyboard.png", import.meta.url)));

const home = read("index.html");
const review = read("reviews/online-turn-open-edge-landing/index.html");
const readme = read("reviews/README.md");
const workflow = read(".github/workflows/pages.yml");

assert.match(home, /Online turn · Open Edge Landing \+ Remote Touch Echo/);
assert.match(home, /href="reviews\/online-turn-open-edge-landing\/"/);
assert.match(home, /online-turn-open-edge-landing-storyboard\.png/);

assert.match(review, /<h1>Open Edge Landing \+ Remote Touch Echo<\/h1>/);
assert.match(review, /<span class="badge">Selected<\/span>/);
assert.match(review, /no dedicated mat or tray/i);
assert.match(review, /Wi-Fi-off icon/i);
assert.match(review, /compact numeric result/i);
assert.doesNotMatch(review, /Riya is rolling|Riya is choosing|Reconnecting Riya/i);

assert.match(readme, /Open Edge Landing \+ Remote Touch Echo/);
assert.match(readme, /online-turn-open-edge-landing\//);
assert.match(workflow, /reviews\/online-turn-open-edge-landing\/index\.html/);
assert.match(workflow, /reviews\/assets\/online-turn-open-edge-landing-storyboard\.png/);
assert.match(workflow, /Open Edge Landing \+ Remote Touch Echo/);

console.log("Open-edge review contract verified.");
