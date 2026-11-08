// Fake identities and clients only; no network or real credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(fs.readFileSync("src/lib/admin/management.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let access="forbidden", created=0, calls=[], response={data:null,error:null};
const env={ACADEMY_ADMIN_MANAGEMENT_ENABLED:"true",SUPABASE_SECRET_KEY:"sb_secret_fixture"};
const imports={
  "@supabase/supabase-js":{createClient:()=>{created++;return {rpc:async(name,args)=>{calls.push({name,args});return response;}}}},
  "@/lib/supabase/config":{getSupabaseAuthConfig:()=>({url:"https://uenvjqgylrevujdjpfed.supabase.co"})},
  "./access":{getAdminAccess:async()=>access},
};
const m={exports:{}};
vm.runInNewContext(code,{module:m,exports:m.exports,require:(name)=>name==="server-only"?{}:imports[name]??(()=>{throw Error("Unexpected import")})(),URL,Date,process:{env},fetch:()=>{throw Error("no network")}});
const input={id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",isNew:true,courseId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",startDate:"2026-12-01",endDate:"2027-02-01",enrollmentOpensAt:"2026-11-01T00:00:00.000Z",enrollmentClosesAt:"2026-11-30T09:00:00.000Z",location:"온라인",capacity:10,status:"open",isPublic:true};
assert.equal(await m.exports.saveOffering(input),"unknown");assert.equal(created,0);
access="allowed";response={data:"saved",error:null};assert.equal(await m.exports.saveOffering(input),"saved");
assert.equal(calls[0].name,"academy_admin_save_offering_v1");assert.equal(calls[0].args.p_create,true);
assert.equal(calls[0].args.p_enrollment_opens_at,input.enrollmentOpensAt);
response={data:"duplicate",error:null};assert.equal(await m.exports.saveOffering(input),"duplicate");
response={data:null,error:{}};assert.equal(await m.exports.saveOffering(input),"unknown");
response={data:{courses:[{id:input.courseId,title:"가상 강좌",publication_state:"published"}],offerings:[{id:input.id,course_id:input.courseId,start_date:input.startDate,end_date:input.endDate,enrollment_opens_at:input.enrollmentOpensAt,enrollment_closes_at:input.enrollmentClosesAt,location:input.location,capacity:10,status:"open",is_public:true}]},error:null};
const catalog=await m.exports.loadAdminOfferingCatalog();assert.equal(catalog.offerings.length,1);assert.equal(catalog.offerings[0].enrollmentOpensAt,input.enrollmentOpensAt);
response.data.offerings[0].enrollment_opens_at="2026-11-01T00:00:00.123456Z";assert.equal(await m.exports.loadAdminOfferingCatalog(),null);
console.log("PASS: unauthorized requests never create privileged client; approved client uses versioned RPC, KST instants, duplicate and malformed response handling");
