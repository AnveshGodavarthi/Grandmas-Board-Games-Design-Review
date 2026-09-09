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
assert.match(progress, /<time datetime="2026-09-09">9 September 2026<\/time>/);
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
  { block: "02", status: "complete" },
  { block: "03", status: "complete" },
  { block: "04", status: "complete" },
  { block: "05", status: "active" },
  { block: "06", status: "active" },
  { block: "07", status: "planned" },
  { block: "08", status: "planned" },
  { block: "09", status: "planned" },
]);
assert.equal(roadmapItems.filter(({ status }) => status === "active").length, 2);

assert.match(progress, /Next milestone: verify and merge Blocks 05–06/);
assert.match(progress, /Repository implementation is ready; exact-head hosted verification is blocked before runner assignment\./);
assert.match(progress, /Current checkpoint:<\/strong> Blocks 05 and 06 are repository-complete integration candidates\./);
assert.match(progress, /Verification boundary:<\/strong> Local fallback checks and independent code critique passed\./);
assert.match(progress, /Path to first launch:<\/strong> close the open Blocks 05–06 evidence/);
assert.doesNotMatch(progress, /Rive/i);

const expectedVisibleText = "Grandma's Board Games · Build Roadmap Skip to build roadmap G Grandma's Board Games Design review Build status Roadmap Updated 9 September 2026 Next milestone: verify and merge Blocks 05–06 Repository implementation is ready; exact-head hosted verification is blocked before runner assignment. Verification 00 Storyboard and journey Approved product and visual contract. Complete 01 Expo foundation Core experience foundation. Complete 02 Intro and board formation Authored first arrival and live board handoff. Complete 03 Ashta Chamma 2–4 player local rules loop, result and rematch. Complete 04 Navakankari Two-player local board, mills, capture and result. Complete 05 Character system Repository and browser checkpoint complete; rights, cultural and physical-device gates remain. External gates 06 Ownerless multiplayer Milestones 06.0–06.7 integrated; exact-head, provider, carrier and device evidence remain. Candidate 07 Puli Meka Third-game expansion follows the first stable two-game launch. Post-launch 08 Launch quality Accounts, privacy, safety, operations, native experience and release-candidate closeout. Planned 09 First store release Signing, listings, beta, submission, controlled launch and initial watch. Planned Current checkpoint: Blocks 05 and 06 are repository-complete integration candidates. Character work is browser-accepted; both launch games now have the ownerless multiplayer journey. Rights, cultural, provider, carrier and physical-device evidence remain open. Verification boundary: Local fallback checks and independent code critique passed. Exact-head hosted tests, strict types, Expo Doctor, web export and PostgreSQL checks are still pending because the jobs did not acquire a runner; no native or production-readiness result is claimed. Path to first launch: close the open Blocks 05–06 evidence, complete Block 08 quality and compliance, then execute Block 09 beta, store submission, controlled release and the initial 72-hour watch. Puli Meka follows stabilization. Owner-facing build roadmap";

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
