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
let response={data:{user:null},error:null},throwGet=false,checks=0,client=true,rpcChecks=0,member=false,rpcError=null,throwRpc=false;
const env={ACADEMY_ADMIN_USER_IDS:admin}; // Legacy value must not grant authority.
const access=compile("src/lib/admin/access.ts",{"@/lib/supabase/server":{createAuthClient:async()=>client?{
  auth:{getUser:async()=>{checks++;if(throwGet)throw Error("auth unavailable");return response;}},
  rpc:async(name)=>{assert.equal(name,"academy_is_admin_v2");rpcChecks++;if(throwRpc)throw Error("db unavailable");return {data:member,error:rpcError};}
}:null}},{process:{env}});
const route=compile("src/app/api/admin/access/route.ts",{"next/server":{NextResponse:{json:(body,options)=>({body,...options})}},"@/lib/admin/access":access});
let result=await route.GET();assert.equal(result.status,401);assert.equal(result.body.authorized,false);
response={data:{user:{id:other,user_metadata:{is_admin:true}}},error:null};
result=await route.GET();assert.equal(result.status,403);assert.equal(result.body.authorized,false);
response={data:{user:{id:admin}},error:null};result=await route.GET();assert.equal(result.status,403);
member=true;result=await route.GET();assert.equal(result.status,200);assert.equal(result.body.authorized,true);
assert.equal(result.headers["Cache-Control"],"private, no-store");
env.ACADEMY_ADMIN_USER_IDS="";result=await route.GET();assert.equal(result.status,200);
member=false;result=await route.GET();assert.equal(result.status,403); // same JWT after DB revocation
member="true";result=await route.GET();assert.equal(result.status,403); // malformed response cannot authorize
member=true;rpcError={message:"missing function"};result=await route.GET();assert.equal(result.status,403);
rpcError=null;throwRpc=true;result=await route.GET();assert.equal(result.status,403);throwRpc=false;
response={data:{user:{id:admin}},error:{message:"bad token"}};result=await route.GET();assert.equal(result.status,401);
response={data:{user:{id:admin}},error:null};throwGet=true;result=await route.GET();assert.equal(result.status,401);
throwGet=false;client=false;result=await route.GET();assert.equal(result.status,401);
assert.ok(checks>=6);
assert.ok(rpcChecks>=7);
console.log("PASS: fake verified Auth + DB membership, revocation and RPC failures fail closed; legacy env cannot grant");
