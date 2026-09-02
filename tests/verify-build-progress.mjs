import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const progressPath = new URL("progress/index.html", root);

assert.ok(existsSync(progressPath), "the public build-progress dashboard must exist");

const home = readFileSync(new URL("index.html", root), "utf8");
const progress = readFileSync(progressPath, "utf8");

function injectTrackerMarkup(markup) {
  return progress.replace("</body>", `${markup}</body>`);
}

function injectTrackerStyle(rule) {
  return progress.replace("</style>", `${rule}\n  </style>`);
}

function injectTrackerBodyAttribute(attribute) {
  return progress.replace("<body>", `<body ${attribute}>`);
}

function extractHrefValues(html) {
  return [...html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

function extractUrlBearingAttributes(html) {
  return [
    ...html.matchAll(
      /\b((?:xlink:)?href|src|srcset|action|formaction|poster|cite|data|background|longdesc|usemap|ping|manifest|profile|codebase|archive)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    ),
  ].map((match) => ({
    attribute: match[1].toLowerCase(),
    value: match[2] ?? match[3] ?? match[4],
  }));
}

const privateSourceDenylist = [
  /\b(?:great-indian-board-games|anveshgodavarthi)\b/i,
  /\bgithub\.com\b/i,
  /\bactions\/runs\/\d{1,20}\b/i,
  /\b(?:artifact|branch|commit|sha|repository|repo)\b/i,
  /\b[0-9a-f]{7,40}\b/i,
  /\b(?:feat(?:ure)?|fix|hotfix|docs|design|review|chore|release)\//i,
  /https?:\/\/|ssh:\/\/|git:\/\/|git@/i,
];

function assertNoPrivateSourceMetadata(html) {
  assert.doesNotMatch(
    html,
    /&(?:#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);?/i,
    "private source metadata must not use HTML character references; this static tracker requires none because partial entity decoding is unsafe",
  );
  assert.doesNotMatch(
    html,
    /<script\b|\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh\b)|\burl\s*\(/i,
    "private source metadata must not use source-active URL channels",
  );
  assert.doesNotMatch(
    html,
    /\/\/[a-z0-9][a-z0-9.-]*(?:[/:?#]|$)|@import\b|(?<![-\w])image-set\s*\(|(?<!\w)-webkit-image-set\s*\(|\bon[a-z][a-z0-9:_-]*\s*=|\b(?:javascript|data|blob)\s*:/i,
    "private source metadata must not use protocol-relative URLs, CSS resource syntax, inline event handlers, or non-HTTP active schemes",
  );
  for (const pattern of privateSourceDenylist) {
    assert.doesNotMatch(
      html,
      pattern,
      "private source metadata must not bypass public-text sanitization",
    );
  }
}

function assertOnlyApprovedUrlAttributes(html) {
  assert.deepEqual(
    extractUrlBearingAttributes(html),
    [
      { attribute: "href", value: "#main-content" },
      { attribute: "href", value: "../" },
      { attribute: "href", value: "../" },
    ],
    "the public tracker must allowlist every URL-bearing HTML attribute",
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
assertOnlyApprovedUrlAttributes(progress);
assertNoPrivateSourceMetadata(progress);
assert.match(progress, /<main[^>]+id="main-content"/);
assert.match(progress, /<section[^>]+data-build-roadmap/);
assert.match(progress, /data-next-work/);
assert.doesNotMatch(progress, /data-active-work/);
assert.match(progress, /<time[^>]+datetime="\d{4}-\d{2}-\d{2}"/);
assert.match(progress, /<time datetime="2026-09-02">2 September 2026<\/time>/);
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
  0,
  "no roadmap block may be active between completed and planned work",
);
assert.deepEqual(
  roadmapItems,
  [
    { block: "00", status: "complete" },
    { block: "01", status: "complete" },
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
  /<strong>Next milestone: Block 02 · Intro and board formation<\/strong>\s*<p>Block 01 is complete\. Block 02 has not started\.<\/p>\s*<\/div>\s*<span class="next-label">Not started<\/span>/,
);
assert.doesNotMatch(progress, /Block 06 integration/i);
assert.match(
  progress,
  /Last full verification:<\/strong> 248 tests, strict TypeScript, Expo Doctor 21\/21, production and fresh visual web exports, rendered profiles at 320×568 synthetic 200% text, 390×844 standard motion, and 430×932 reduced motion, plus a throttled browser performance regression proxy\. An authored atlas is selected\. Physical-device and native screen-reader validation remain deferred before Block 05 and release\./,
);
assert.match(
  progress,
  /<p class="verification-note">\s*<span><strong>Last full verification:<\/strong> 248 tests, strict TypeScript, Expo Doctor 21\/21, production and fresh visual web exports, rendered profiles at 320×568 synthetic 200% text, 390×844 standard motion, and 430×932 reduced motion, plus a throttled browser performance regression proxy\. An authored atlas is selected\. Physical-device and native screen-reader validation remain deferred before Block 05 and release\.<\/span>\s*<\/p>/,
);
assert.doesNotMatch(progress, /Rive/i);

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

const reviewerBypass =
  '<img src="https://github.com/AnveshGodavarthi/Great-Indian-Board-Games/actions/runs/33632478569" alt="">';
assert.equal(visibleText(reviewerBypass), "");
assert.throws(
  () => assertNoPrivateSourceMetadata(reviewerBypass),
  /private source metadata/,
);
assert.throws(
  () => assertOnlyApprovedUrlAttributes(injectTrackerMarkup(reviewerBypass)),
  /URL-bearing HTML attribute/,
);

for (const encodedSourceMutation of [
  "<p>Great&#45;Indian&#45;Board&#45;Games</p>",
  '<div aria-label="Great&#45;Indian&#45;Board&#45;Games"></div>',
  '<meta http-equiv="refresh" content="0; url=https&#58;&#47;&#47;github&#46;com&#47;Anvesh&#71;odavarthi&#47;Great&#45;Indian&#45;Board&#45;Games&#47;actions&#47;runs&#47;&#51;&#51;&#54;&#51;&#50;&#52;&#55;&#56;&#53;&#54;&#57;">',
]) {
  assert.throws(
    () => assertNoPrivateSourceMetadata(encodedSourceMutation),
    /private source metadata/,
  );
}

for (const sourceOnlyChannel of [
  "<!-- Great-Indian-Board-Games -->",
  '<script>const run = "33632478569";</script>',
  '<style>/* github.com */</style>',
  '<meta name="build" content="private repository">',
  '<div data-source="Great-Indian-Board-Games"></div>',
  '<div aria-label="artifact metadata"></div>',
  '<meta http-equiv="refresh" content="0; url=/unapproved">',
  '<script>location.assign("/unapproved")</script>',
  '<style>.preview { background-image: url("/unapproved.png"); }</style>',
]) {
  assert.throws(
    () => assertNoPrivateSourceMetadata(sourceOnlyChannel),
    /private source metadata/,
  );
}

for (const fullProgressMutation of [
  injectTrackerStyle('@import "//example.test/private.css";'),
  injectTrackerBodyAttribute('onload="location=\'//example.test/private\'"'),
  injectTrackerMarkup(
    '<div style="background-image: image-set(\'//example.test/private.png\' 1x)"></div>',
  ),
  injectTrackerMarkup(
    '<div style="background-image: -webkit-image-set(\'//example.test/private.png\' 1x)"></div>',
  ),
  injectTrackerMarkup('<img onerror="location=\'/unapproved\'" alt="">'),
  injectTrackerMarkup('<a href="javascript:alert(1)">Unsafe</a>'),
  injectTrackerMarkup('<img src="data:image/png;base64,AA==" alt="">'),
  injectTrackerMarkup('<img src="blob:opaque" alt="">'),
]) {
  assert.throws(
    () => assertNoPrivateSourceMetadata(fullProgressMutation),
    /private source metadata/,
  );
}

for (const independentDenylistMutation of [
  injectTrackerStyle('@import "/relative.css";'),
  injectTrackerMarkup(
    '<div style="background-image: image-set(\'/relative.png\' 1x)"></div>',
  ),
  injectTrackerMarkup(
    '<div style="background-image: -webkit-image-set(\'/relative.png\' 1x)"></div>',
  ),
  injectTrackerMarkup('<div data-preview="//example.test/passive"></div>'),
]) {
  assert.throws(
    () => assertNoPrivateSourceMetadata(independentDenylistMutation),
    /private source metadata/,
  );
}

assert.doesNotThrow(() =>
  assertOnlyApprovedUrlAttributes(injectTrackerMarkup('<div data-check="safe"></div>')),
);

for (const urlBearingMutation of [
  '<img src="/unapproved.png" alt="">',
  '<source srcset="/small.png 1x, /large.png 2x">',
  '<form action="/submit"></form>',
  '<button formaction="/submit">Save</button>',
  '<video poster="/preview.png"></video>',
  '<blockquote cite="/source"></blockquote>',
  '<object data="/object.bin"></object>',
  '<body background="/background.png"></body>',
  '<img longdesc="/description.html" alt="">',
  '<img usemap="#map" alt="">',
  '<a ping="/audit">Audit</a>',
  '<html manifest="/app.manifest"></html>',
  '<head profile="/profile"></head>',
  '<object codebase="/plugin" archive="/plugin.jar"></object>',
  '<svg><use xlink:href="/symbol.svg#item"></use></svg>',
]) {
  assert.throws(
    () => assertOnlyApprovedUrlAttributes(injectTrackerMarkup(urlBearingMutation)),
    /URL-bearing HTML attribute/,
  );
}

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
