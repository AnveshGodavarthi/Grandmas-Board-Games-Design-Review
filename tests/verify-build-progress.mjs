import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const progressPath = new URL("progress/index.html", root);

assert.ok(existsSync(progressPath), "the public build-progress dashboard must exist");

const home = readFileSync(new URL("index.html", root), "utf8");
const progress = readFileSync(progressPath, "utf8");

function extractHrefValues(html) {
  return [...html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

function visibleText(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

assert.match(home, /href="progress\/"/);
const allowedProgressLinks = ["#main-content", "../", "../"];
assert.deepEqual(
  extractHrefValues(progress),
  allowedProgressLinks,
  "the public tracker must expose only its approved relative links",
);
assert.match(progress, /<main[^>]+id="main-content"/);
assert.match(progress, /<section[^>]+data-build-roadmap/);
assert.match(progress, /data-active-work/);
assert.match(progress, /<time[^>]+datetime="\d{4}-\d{2}-\d{2}"/);
assert.match(progress, /<time datetime="2026-09-01">1 September 2026<\/time>/);
assert.match(progress, /prefers-reduced-motion: reduce/);

const main = progress.slice(progress.indexOf('<main'));
const firstSection = main.match(/<section[^>]*>/)?.[0];
assert.match(
  firstSection ?? '',
  /data-build-roadmap/,
  'the build roadmap must be the first section in the main content',
);

assert.doesNotMatch(progress, /data-latest-milestone/);
assert.doesNotMatch(progress, /data-work-in-flight/);
assert.doesNotMatch(progress, /data-build-health/);
assert.doesNotMatch(progress, /capability-grid/);

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
assert.deepEqual(
  roadmapItems,
  [
    { block: "00", status: "complete" },
    { block: "01", status: "active" },
    { block: "02", status: "planned" },
    { block: "03", status: "planned" },
    { block: "04", status: "planned" },
    { block: "05", status: "planned" },
    { block: "06", status: "planned" },
    { block: "07", status: "planned" },
    { block: "08", status: "planned" },
    { block: "09", status: "planned" },
  ],
  "public statuses must reflect the current build progress",
);
assert.match(
  progress,
  /<strong>Actively building: Block 01 · Expo foundation<\/strong>\s*<p>Finishing approved visual checkpoints and validation\.<\/p>/,
);
assert.doesNotMatch(progress, /Block 06 integration/i);
assert.match(
  progress,
  /Last full verification:<\/strong> 123 tests, strict TypeScript, Expo Doctor and web export were last verified\./,
);
assert.match(progress, /Rive comparison and on-device measurements remain pending\./);
assert.match(
  progress,
  /<p class="verification-note">\s*<span><strong>Last full verification:<\/strong> 123 tests, strict TypeScript, Expo Doctor and web export were last verified\. Rive comparison and on-device measurements remain pending\.<\/span>\s*<\/p>/,
);

const publicText = visibleText(progress);

assert.doesNotMatch(publicText, /\b(?:TODO|TBD)\b/);
assert.doesNotMatch(publicText, /\b[0-9a-f]{7,40}\b/i);
assert.doesNotMatch(
  publicText,
  /\b(?:feat(?:ure)?|fix|hotfix|docs|design|review|chore|release)\//i,
  "the public dashboard must not expose branch names",
);
assert.doesNotMatch(
  publicText,
  /https?:\/\/|ssh:\/\/|git:\/\/|git@|github\.com/i,
  "the public dashboard must not expose repository URLs or remotes",
);
assert.doesNotMatch(
  publicText,
  /great-indian-board-games/i,
  "the public dashboard must not expose the private repository name",
);
assert.doesNotMatch(
  publicText,
  /\b(?:branch|commit|sha|repository|repo)\b/i,
  "the public dashboard must not expose repository metadata",
);

assert.deepEqual(
  extractHrefValues('<a href="../">Public review</a><a href=#main-content>Skip</a>'),
  ["../", "#main-content"],
);
for (const externalHref of [
  '<a href="https://github.com/owner/private">Private</a>',
  "<a href='git@github.com:owner/private.git'>Private</a>",
  "<a href=https://github.com/owner/private>Private</a>",
  "<a href=git@github.com:owner/private.git>Private</a>",
]) {
  const href = extractHrefValues(externalHref);
  assert.equal(href.length, 1);
  assert.ok(
    !allowedProgressLinks.includes(href[0]),
    "quoted and unquoted external links must fail the public-link allowlist",
  );
}
for (const leak of [
  "<p>fix/private-screen</p>",
  "<p>git@github.com:owner/private.git</p>",
  "<p>https://github.com/owner/private</p>",
  "<p>1a2b3c4</p>",
  "<p>Great-Indian-Board-Games</p>",
  "<p>private repository</p>",
]) {
  const leakedText = visibleText(leak);
  assert.match(
    leakedText,
    /\b[0-9a-f]{7,40}\b|\b(?:feat(?:ure)?|fix|hotfix|docs|design|review|chore|release)\/|https?:\/\/|ssh:\/\/|git:\/\/|git@|github\.com|great-indian-board-games|\b(?:branch|commit|sha|repository|repo)\b/i,
  );
}
assert.equal(
  visibleText('<style>.review-link { color: inherit; }</style><a href="../">Public review</a>'),
  "Public review",
);

console.log("Public build-progress dashboard contract verified.");
