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

function assertNoExternalChannels(html) {
  assert.doesNotMatch(
    html,
    /<script\b|\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh\b)|\burl\s*\(/i,
  );
  assert.doesNotMatch(
    html,
    /\/\/[a-z0-9][a-z0-9.-]*(?:[/:?#]|$)|@import\b|(?<![-\w])image-set\s*\(|(?<!\w)-webkit-image-set\s*\(|\bon[a-z][a-z0-9:_-]*\s*=|\b(?:javascript|data|blob)\s*:/i,
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
assert.deepEqual(extractHrefValues(progress), ["#main-content", "../", "../"]);
assert.deepEqual(extractUrlBearingAttributes(progress), [
  { attribute: "href", value: "#main-content" },
  { attribute: "href", value: "../" },
  { attribute: "href", value: "../" },
]);
assertNoExternalChannels(progress);
assert.match(progress, /<main[^>]+id="main-content"/);
assert.match(progress, /<section[^>]+data-build-roadmap/);
assert.match(progress, /data-next-work/);
assert.doesNotMatch(progress, /data-active-work/);
assert.match(progress, /<time datetime="2026-09-03">3 September 2026<\/time>/);
assert.match(progress, /prefers-reduced-motion: reduce/);

const main = progress.slice(progress.indexOf("<main"));
assert.match(
  main.match(/<section[^>]*>/)?.[0] ?? "",
  /data-build-roadmap/,
  "the build roadmap must be the first section in the main content",
);

const roadmapItems = [
  ...progress.matchAll(
    /<li[^>]+data-block="(\d{2})"[^>]+data-status="(complete|active|planned)"/g,
  ),
].map((match) => ({ block: match[1], status: match[2] }));

assert.deepEqual(roadmapItems, [
  { block: "00", status: "complete" },
  { block: "01", status: "complete" },
  { block: "02", status: "active" },
  { block: "03", status: "planned" },
  { block: "04", status: "planned" },
  { block: "05", status: "planned" },
  { block: "06", status: "planned" },
  { block: "07", status: "planned" },
  { block: "08", status: "planned" },
  { block: "09", status: "planned" },
]);
assert.equal(roadmapItems.filter(({ status }) => status === "active").length, 1);

assert.match(
  progress,
  /<strong>Active milestone: Block 02 · Intro and board formation<\/strong>\s*<p>The release-APK AVD closeout is running; physical validation moves to the first playable MVP\.<\/p>\s*<\/div>\s*<span class="next-label">In progress<\/span>/,
);
assert.match(
  progress,
  /Current Block 02 checkpoint:<\/strong> App implementation and browser-rendered validation are complete\. A nondebuggable Android release build plus API 29 and API 36 AVD production journeys now gate closeout; readable Gradle diagnostics and the missing splash-resource repair are cloud-synced\. Physical Snapdragon 680-class validation is intentionally deferred to the first playable MVP after Block 03, where it remains binding\./,
);
assert.match(
  progress,
  /Last full verification:<\/strong> 324 tests, strict TypeScript, Expo Doctor 21\/21, production and visual-test web exports, all 48 Block 01 rendered assertions, and the complete Block 02 rendered transition matrix passed\. AVD timing is diagnostic only and does not claim physical-device performance\./,
);
assert.doesNotMatch(progress, /Rive/i);

const expectedVisibleText = "Grandma's Board Games · Build Roadmap Skip to build roadmap G Grandma's Board Games Design review Build status Roadmap Updated 3 September 2026 Active milestone: Block 02 · Intro and board formation The release-APK AVD closeout is running; physical validation moves to the first playable MVP. In progress 00 Storyboard and journey Approved product and visual contract. Complete 01 Expo foundation Core experience foundation. Complete 02 Intro and board formation Authored first arrival and live board handoff. In progress 03 Ashta Chamma 2–4 player local rules loop, result and rematch. Planned 04 Navakankari Two-player local board, mills, capture and result. Planned 05 Character system Production Grandma and player roles. Planned 06 Multiplayer Trusted rooms, synchronized turns and reconnection. Planned 07 Puli Meka Rules engine and third game. Planned 08 Polish and accessibility Sound, haptics, profiling and QA. Planned 09 Release Preview builds, stores and launch. Planned Current Block 02 checkpoint: App implementation and browser-rendered validation are complete. A nondebuggable Android release build plus API 29 and API 36 AVD production journeys now gate closeout; readable Gradle diagnostics and the missing splash-resource repair are cloud-synced. Physical Snapdragon 680-class validation is intentionally deferred to the first playable MVP after Block 03, where it remains binding. Last full verification: 324 tests, strict TypeScript, Expo Doctor 21/21, production and visual-test web exports, all 48 Block 01 rendered assertions, and the complete Block 02 rendered transition matrix passed. AVD timing is diagnostic only and does not claim physical-device performance. Owner-facing build roadmap";

assert.equal(
  visibleText(progress),
  expectedVisibleText,
  "the dashboard must contain only the reviewed public text",
);
assert.doesNotMatch(visibleText(progress), /\b(?:TODO|TBD)\b/);

for (const mutation of [
  '<img src="/not-allowed.png" alt="">',
  '<form action="/not-allowed"></form>',
  '<a href="/not-allowed">Not allowed</a>',
]) {
  assert.notDeepEqual(
    extractUrlBearingAttributes(injectTrackerMarkup(mutation)),
    extractUrlBearingAttributes(progress),
  );
}

for (const mutation of [
  '<script>location.assign("/not-allowed")</script>',
  '<style>.preview { background-image: url("/not-allowed.png"); }</style>',
  '<img onerror="location=\'/not-allowed\'" alt="">',
]) {
  assert.throws(() => assertNoExternalChannels(injectTrackerMarkup(mutation)));
}

console.log("Public build-progress dashboard contract verified.");
