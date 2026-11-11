// Exercises orchestration with fictional data and injected transaction behavior only.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const compile = (file, imports = {}) => {
  const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const testModule={exports:{}};
  vm.runInNewContext(code,{module:testModule,exports:testModule.exports,FormData,Date,Number,require:(name)=>name==="server-only"?{}:imports[name]??(()=>{throw Error("Unexpected import")})()});
  return testModule.exports;
};
const validation=compile("src/lib/applications/validation.ts");
const {submitApplication}=compile("src/lib/applications/submission.ts",{"./validation":validation});
const base={offering_id:"11111111-1111-4111-8111-111111111111",request_id:"22222222-2222-4222-8222-222222222222",name:"Fictional",contact:"010-0000-0000",notice_version:"fixture-v1",consent:"on"};
const form=(input=base)=>{const f=new FormData();for(const [k,v] of Object.entries(input))f.append(k,v);return f;};
let calls=0;const accepted={activeNoticeVersion:"fixture-v1",commit:async()=>{calls++;return "accepted";}};
assert.equal((await submitApplication(form(),accepted)).status,"accepted");assert.equal(calls,1);
for(const data of [{...base,name:""},{...base,request_id:"bad"},{...base,consent:""},{...base,notice_version:"outdated"}]) assert.equal((await submitApplication(form(data),accepted)).status,"invalid");
const duplicate=form();duplicate.append("request_id",base.request_id);assert.equal((await submitApplication(duplicate,accepted)).status,"invalid");
assert.equal((await submitApplication(form(),{...accepted,activeNoticeVersion:null})).status,"invalid");assert.equal(calls,1);
assert.equal((await submitApplication(form(),{...accepted,commit:async()=>"unavailable"})).status,"unavailable");
assert.equal((await submitApplication(form(),{...accepted,commit:async()=>"unexpected"})).status,"unknown");
const stored=new Map();const lost={activeNoticeVersion:"fixture-v1",commit:async(candidate,key)=>{if(stored.has(key))return "accepted";stored.set(key,candidate);throw Error("fictional response loss after commit");}};
assert.equal((await submitApplication(form(),lost)).status,"unknown");
assert.equal((await submitApplication(form(),lost)).status,"accepted");assert.equal(stored.size,1);
const output=await submitApplication(form(),accepted);assert.deepEqual(Object.keys(output),["status"]);
console.log("PASS: rejects invalid/duplicate requests before commit, distinguishes accepted/unavailable/unknown, and safely retries a simulated lost response");
