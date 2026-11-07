// Exercise the real parser with untrusted FormData; no network or credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(fs.readFileSync("src/lib/admin/management-validation.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(code, { module: testModule, exports: testModule.exports, FormData, Date, Number });
const { parseCourseForm, parseOfferingForm } = testModule.exports;
const make = (entries) => { const f = new FormData(); for (const [k,v] of Object.entries(entries)) f.append(k,v); return f; };
const course = { id:"", slug:"ai-course", title:"AI", category:"AI", summary:"Summary", audience:"Students", result_artifact:"Project", duration_hours:"12", objectives:"First\nSecond", publication_state:"draft" };
assert.equal(parseCourseForm(make(course)).ok, true);
for (const changes of [{slug:"Bad slug"},{duration_hours:"-1"},{publication_state:"unknown"},{id:"bad"}]) assert.equal(parseCourseForm(make({...course,...changes})).ok, false);
const duplicate = make(course); duplicate.append("publication_state", "published"); assert.equal(parseCourseForm(duplicate).ok, false);
const offering = {id:"",course_id:"11111111-1111-4111-8111-111111111111",start_date:"2026-11-10",end_date:"2026-12-10",location:"",capacity:"20",status:"scheduled",is_public:"on"};
assert.equal(parseOfferingForm(make(offering)).ok, true);
for (const changes of [{course_id:"bad"},{start_date:"2026-02-30"},{end_date:"2026-01-01"},{capacity:"-1"},{capacity:"2147483648"},{status:"draft"}]) assert.equal(parseOfferingForm(make({...offering,...changes})).ok, false);
const dupVisibility=make(offering); dupVisibility.append("is_public","on"); assert.equal(parseOfferingForm(dupVisibility).ok,false);
console.log("PASS: valid form inputs accepted; malformed, duplicate, out-of-range and unsafe public draft inputs rejected");
