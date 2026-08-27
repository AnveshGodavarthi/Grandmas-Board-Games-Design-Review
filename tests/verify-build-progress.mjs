import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const progressPath = new URL("progress/index.html", root);

assert.ok(existsSync(progressPath), "the public build-progress dashboard must exist");

const home = readFileSync(new URL("index.html", root), "utf8");
const progress = readFileSync(progressPath, "utf8");

assert.match(home, /href="progress\/"/);
assert.match(progress, /<main[^>]+id="main-content"/);
assert.match(progress, /data-latest-milestone/);
assert.match(progress, /data-build-health/);
assert.match(progress, /<time[^>]+datetime="\d{4}-\d{2}-\d{2}"/);
assert.match(progress, /prefers-reduced-motion: reduce/);

const roadmapItems = [
  ...progress.matchAll(
    /<li[^>]+data-block="(\d{2})"[^>]+data-status="(complete|active|planned)"/g,
  ),
].map((match) => ({ block: match[1], status: match[2] }));

assert.deepEqual(
  roadmapItems.map((item) => item.block),
  ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09"],
  "the dashboard must preserve the complete Block 00-09 roadmap in order",
);
assert.equal(
  roadmapItems.filter((item) => item.status === "active").length,
  1,
  "exactly one roadmap block must be active",
);
assert.ok(
  roadmapItems.some((item) => item.status === "complete"),
  "the roadmap must retain completed work",
);

assert.doesNotMatch(progress, /\b(?:TODO|TBD)\b/);
assert.doesNotMatch(progress, /feat\/|[0-9a-f]{40}/i);
assert.doesNotMatch(
  progress,
  /github\.com\/AnveshGodavarthi\/Great-Indian-Board-Games/i,
  "the public dashboard must not expose private implementation links",
);

console.log("Public build-progress dashboard contract verified.");
