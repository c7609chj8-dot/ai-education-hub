// Read-only checks against a disposable, mock-mode local build only.
import assert from "node:assert/strict";
const origin = process.env.ACADEMY_STAGE3_TEST_ORIGIN || "http://127.0.0.1:3109";
const url = new URL(origin);
assert.ok(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
assert.ok(url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash);
for (const path of ["/", "/programs", "/schedule", "/about", "/outcomes", "/news", "/faq", "/contact", "/resources", "/partnership"]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /<h1\b/, path);
  assert.match(html, /AI융합대학/, path);
  assert.match(html, /AI로 연결하는 지식, 융합으로 여는 미래/, path);
  if (path === "/") {
    assert.match(html, /property="og:site_name" content="AI융합대학"/);
    assert.match(html, /name="twitter:card" content="summary"/);
    assert.match(html, /property="og:image"[^>]*ai-fusion-logo\.png/);
  }
  if (path === "/faq") {
    assert.match(html, /AI 광고영상제작과/);
    assert.match(html, /총 교육시간.*미확정/);
    assert.doesNotMatch(html, /주 2시간|총 24시간/);
  }
  console.log("PASS public page: " + path);
}
for (const path of ["/icon.png", "/images/ai-fusion-logo.png"]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /image\/png/);
}
const unknown = await fetch(origin + "/schedule?course=unknown-course");
assert.match(await unknown.text(), /시연용 예시 일정/);
console.log("PASS: brand / sharing metadata / favicon / unconfirmed FAQ policy; no remote writes");
