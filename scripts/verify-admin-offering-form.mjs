// Static component rendering only; no browser, server actions, or database.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function compile(path, imports) {
  const source=ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const m={exports:{}};
  vm.runInNewContext(source,{module:m,exports:m.exports,require:(name)=>imports[name]??require(name),Date,Number,Intl});
  return m.exports;
}
const time=compile("src/lib/admin/seoul-time.ts",{});
const form=compile("src/app/admin/console/offerings/offering-form.tsx",{"../management-actions":{submitOffering:async()=>null},"@/lib/admin/seoul-time":time});
const course={id:"11111111-1111-4111-8111-111111111111",title:"가상 강좌",publicationState:"published"};
const empty=renderToStaticMarkup(React.createElement(form.OfferingForm,{courses:[course]}));
assert.match(empty,/name="mode" value="create"/);
assert.match(empty,/name="enrollment_opens_at"/);
assert.match(empty,/name="enrollment_closes_at"/);
assert.match(empty,/한국 시간/);
assert.doesNotMatch(empty,/name="is_public"[^>]*checked/);
const offering={id:"22222222-2222-4222-8222-222222222222",courseId:course.id,startDate:"2026-12-01",endDate:"2027-02-01",enrollmentOpensAt:"2026-11-01T00:00:00.000Z",enrollmentClosesAt:"2026-11-30T09:00:00.000Z",location:"온라인",capacity:10,status:"open",isPublic:true};
const edit=renderToStaticMarkup(React.createElement(form.OfferingForm,{courses:[course],offering}));
assert.match(edit,/name="mode" value="update"/);
assert.match(edit,/value="2026-11-01T09:00:00"/);
assert.match(edit,/value="2026-11-30T18:00:00"/);
console.log("PASS: static create/edit form includes Seoul time fields and private default");
