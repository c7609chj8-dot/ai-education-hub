import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(relativePath) {
  const fullPath = resolve(root, relativePath);
  if (!existsSync(fullPath)) throw new Error(`Missing required file: ${relativePath}`);
  return readFileSync(fullPath, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const courseSource = read("src/data/mock/courses.ts");
const expectedSlugs = [
  "ai-management",
  "ai-music",
  "ai-aerial-video",
  "ai-multimedia",
  "ai-programming",
  "ai-advertising-video",
];

for (const slug of expectedSlugs) {
  assert(courseSource.includes(`slug: "${slug}"`), `Missing public curriculum: ${slug}`);
}

const weekBlocks = [...courseSource.matchAll(/weeks:\s*\[([\s\S]*?)\n\s*\],\n\s*finalProject:/g)];
assert(weekBlocks.length === expectedSlugs.length, `Expected ${expectedSlugs.length} curriculum blocks, found ${weekBlocks.length}`);

const weekCounts = weekBlocks.map((block) => (block[1].match(/^\s*"[^"]+",$/gm) ?? []).length);
for (const [index, count] of weekCounts.entries()) {
  assert(count === 12, `Curriculum ${expectedSlugs[index]} must have 12 weeks, found ${count}`);
}
assert(weekCounts.reduce((total, count) => total + count, 0) === 72, "Expected exactly 72 public curriculum weeks");
assert(/sampleOfferings:\s*Offering\[\]\s*=\s*\[\s*\]/.test(courseSource), "Public pre-release must not expose offering data");

const proxySource = read("src/proxy.ts");
assert(proxySource.includes('"/admin/:path*"'), "Proxy must cover admin paths");
assert(proxySource.includes('"/api/:path*"'), "Proxy must cover API paths");
assert(/status:\s*404/.test(proxySource), "Proxy must return 404 in public frontend-only mode");

const inputSurface = [
  read("src/app/apply/[offeringId]/page.tsx"),
  read("src/app/contact/page.tsx"),
].join("\n");
assert(!/<(?:form|input|textarea|select)\b/.test(inputSurface), "Public application or contact page must not render a data-entry form");

const packageSource = read("package.json");
assert(!packageSource.includes("@supabase/"), "Public pre-release must not add a Supabase client dependency");

console.log(`Verified ${expectedSlugs.length} departments and ${weekCounts.reduce((total, count) => total + count, 0)} curriculum weeks.`);
console.log("Verified empty offerings, no public personal-data form, and server-side admin/API blocking.");
