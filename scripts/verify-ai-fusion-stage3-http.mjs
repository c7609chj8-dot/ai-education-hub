// Read-only HTTP smoke checks. Only an explicitly local server is accepted.
import assert from "node:assert/strict";
const origin = process.env.ACADEMY_STAGE3_TEST_ORIGIN || "http://127.0.0.1:3107";
const parsed = new URL(origin);
assert.ok(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname));
assert.equal(parsed.pathname, "/");
assert.ok(!parsed.username && !parsed.password && !parsed.search && !parsed.hash);
const departments = [
 ["ai-management", "AI 경영관리학과", "demo-ai-management-01"],
 ["ai-music", "AI 음악제작학과", "demo-ai-music-01"],
 ["ai-aerial-video", "AI 항공영상제작학과", "demo-ai-aerial-video-01"],
 ["ai-multimedia", "AI 멀티미디어학과", "demo-ai-multimedia-01"],
 ["ai-programming", "AI 프로그래밍학과", "demo-ai-programming-01"],
 ["ai-advertising-video", "AI 광고영상제작과", "demo-ai-advertising-video-01"],
];
const get = async path => {
 const response = await fetch(origin + path, { redirect: "manual" });
 return { response, html: await response.text() };
};
const list = await get("/programs");
assert.equal(list.response.status, 200);
const headings = [...list.html.matchAll(/<h3\b[^>]*>(.*?)<\/h3>/gs)].map(m => m[1]);
assert.deepEqual(headings, departments.map(d => d[1]));
for (const [slug, title, id] of departments) {
 const { response, html } = await get("/programs/" + slug);
 assert.equal(response.status, 200);
 assert.ok(html.includes("<title>" + title + " | AI융합대학</title>"));
 assert.ok(html.includes("검토용 교육과정 초안"));
 assert.ok(html.includes("미확정 · 안내 예정"));
 const curriculum = html.match(/<ol\b[^>]*aria-label="주차별 교육내용"[^>]*>([\s\S]*?)<\/ol>/)?.[1];
 assert.ok(curriculum);
 assert.equal([...curriculum.matchAll(/<li\b/g)].length, 12);
 assert.equal([...curriculum.matchAll(/실습과제:/g)].length, 12);
 assert.ok(html.includes("최종 프로젝트와 결과물 (초안)"));
 const application = await get("/apply/" + id);
 assert.equal(application.response.status, 200);
 assert.ok(application.html.includes(title + " 신청 시연"));
 assert.ok(application.html.includes("실제로 접수하거나 저장하지 않습니다."));
 const select = application.html.match(/<select\b[^>]*>([\s\S]*?)<\/select>/)?.[1];
 if (select) {
   const values = [...select.matchAll(/<option[^>]*value="([^"]+)"/g)].map(m => m[1]).filter(Boolean);
   assert.ok(values.length > 0 && values.every(value => value.startsWith("demo-ai-")));
 }
 console.log("PASS HTTP: " + slug + " / 12 weeks + tasks / demo route " + id);
}
const legacy = [
 ["sample-life", "생활 속 챗GPT 활용", "life-chatgpt"],
 ["sample-work", "생성형 AI 업무혁신 실무", "ai-work"],
 ["sample-ebook", "AI 전자책 제작·작가 도전", "ai-ebook"],
 ["sample-instructor", "AI 전문강사·교육콘텐츠 제작", "ai-instructor"],
 ["sample-business", "AI 소상공인 창업·마케팅", "ai-business"],
];
for (const [id, title, slug] of legacy) {
 const { response, html } = await get("/apply/" + id);
 assert.equal(response.status, 200);
 assert.ok(html.includes(title + " 신청 시연"));
 assert.ok(html.includes("이전 교육과정의 신청 시연 주소입니다."));
 const detail = await get("/programs/" + slug);
 assert.equal(detail.response.status, 200);
 assert.ok(detail.html.includes("<title>" + title + " | AI융합대학</title>"));
}
const alias = await get("/apply/sample-advertising");
assert.ok([307, 308].includes(alias.response.status));
assert.ok(alias.response.headers.get("location")?.endsWith("/apply/demo-ai-advertising-video-01"));
assert.equal((await get("/apply/11111111-1111-4111-8111-111111111111")).response.status, 404);
const access = await get("/api/admin/access");
assert.equal(access.response.status, 401);
assert.deepEqual(JSON.parse(access.html), { authorized: false });
console.log("PASS HTTP: six-card list / five restored legacy titles / compatibility redirect / real UUID 404 / unauthorized admin 401");
