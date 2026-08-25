import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/pages.yml", import.meta.url),
  "utf8",
);

const pushBlock = workflow.match(/on:\n([\s\S]*?)\npermissions:/)?.[1] ?? "";
const pathsBlock = pushBlock.match(/\n\s+paths:\n([\s\S]*)/)?.[1] ?? "";
const watchedPaths = [...pathsBlock.matchAll(/^\s+-\s+(.+)$/gm)].map((match) => match[1].trim());

const watches = (path) => watchedPaths.some((pattern) => {
  if (pattern.endsWith("/**")) return path.startsWith(pattern.slice(0, -3));
  return path === pattern;
});

assert.ok(watches("tests/example.mjs"), "a tests-only commit must trigger the review workflow");
assert.ok(watches("reviews/example/index.html"), "a review-page commit must trigger the review workflow");

console.log("Design-review workflow trigger contract verified.");
