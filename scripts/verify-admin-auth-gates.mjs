// Fictitious users and Supabase responses only; does not contact Auth.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function compile(file, imports, globals={}) {
  const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const m={exports:{}};
  vm.runInNewContext(code,{module:m,exports:m.exports,require:(name)=>name==="server-only"?{}:imports[name]??(()=>{throw Error("Unexpected import")})(),...globals});
  return m.exports;
}
const admin="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
let response={data:{user:null},error:null},throwGet=false,checks=0,client=true;
const verified=compile("src/lib/supabase/verified-user.ts",{"./server":{createAuthClient:async()=>client?{auth:{getUser:async()=>{checks++;if(throwGet)throw Error("auth unavailable");return response;}}}:null}});
const env={ACADEMY_ADMIN_USER_IDS:admin};
const access=compile("src/lib/admin/access.ts",{"@/lib/supabase/verified-user":verified},{process:{env}});
const route=compile("src/app/api/admin/access/route.ts",{"next/server":{NextResponse:{json:(body,options)=>({body,...options})}},"@/lib/admin/access":access});
let result=await route.GET();assert.equal(result.status,401);assert.equal(result.body.authorized,false);
response={data:{user:{id:other,user_metadata:{is_admin:true}}},error:null};
result=await route.GET();assert.equal(result.status,403);assert.equal(result.body.authorized,false);
response={data:{user:{id:admin}},error:null};result=await route.GET();assert.equal(result.status,200);assert.equal(result.body.authorized,true);
assert.equal(result.headers["Cache-Control"],"private, no-store");
env.ACADEMY_ADMIN_USER_IDS=admin+",bad";result=await route.GET();assert.equal(result.status,403);
response={data:{user:{id:admin}},error:{message:"bad token"}};result=await route.GET();assert.equal(result.status,401);
response={data:{user:{id:admin}},error:null};throwGet=true;result=await route.GET();assert.equal(result.status,401);
throwGet=false;client=false;result=await route.GET();assert.equal(result.status,401);
assert.ok(checks>=6);
console.log("PASS: fake Auth getUser, admin ID allowlist and API 401/403/200 fail-closed behavior");
