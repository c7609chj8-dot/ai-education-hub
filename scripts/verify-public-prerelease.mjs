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
const curriculumDetailSource = read("src/data/mock/curriculum-details.ts");
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

const detailedWeekCount = (curriculumDetailSource.match(/\{ title: "[^"]+", practice: "[^"]+" \}/g) ?? []).length;
assert(detailedWeekCount === 72, `Expected 72 detailed curriculum weeks, found ${detailedWeekCount}`);

const expectedOfferingIds = [
  "demo-ai-management-01",
  "demo-ai-music-01",
  "demo-ai-aerial-video-01",
  "demo-ai-multimedia-01",
  "demo-ai-programming-01",
  "demo-ai-advertising-video-01",
];
for (const offeringId of expectedOfferingIds) {
  assert(courseSource.includes(`id: "${offeringId}"`), `Missing static example offering: ${offeringId}`);
}

const proxySource = read("src/proxy.ts");
assert(proxySource.includes('"/admin/:path*"'), "Proxy must cover admin paths");
assert(proxySource.includes('"/api/:path*"'), "Proxy must cover API paths");
assert(/status:\s*404/.test(proxySource), "Proxy must return 404 in public frontend-only mode");

const inputSurface = [
  read("src/app/apply/[offeringId]/page.tsx"),
  read("src/app/contact/page.tsx"),
].join("\n");
assert(!/<(?:form|input|textarea|select)\b/.test(inputSurface), "Public application or contact page must not render a data-entry form");
assert(!/from\s+["']@\/lib\/(?:supabase|courses|schedule-data)/.test(inputSurface), "Public application or contact page must not use a DB data source");

const packageSource = read("package.json");
assert(!packageSource.includes("@supabase/"), "Public pre-release must not add a Supabase client dependency");

console.log(`Verified ${expectedSlugs.length} departments and ${detailedWeekCount} detailed curriculum weeks.`);
console.log(`Verified ${expectedOfferingIds.length} static schedule examples, no public personal-data form, and server-side admin/API blocking.`);
