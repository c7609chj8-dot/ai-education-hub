// Offline fault injection with fictional sessions and responses; no network.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

async function load(path, imports) {
  const code=ts.transpileModule(await readFile(path,"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const compiled={exports:{}};
  vm.runInNewContext(code,{
    module:compiled,exports:compiled.exports,URL,Date,fetch:()=>{throw Error("Network disabled")},
    process:{env:{ACADEMY_ADMIN_MANAGEMENT_ENABLED:"true"}},
    require:name=>name==="server-only"?{}:imports[name]??(()=>{throw Error("Unexpected import")})(),
  });
  return compiled.exports;
}

// This reproduces an empty JSON body error, not the historic Next.js HTTP 500.
let broken;
try { await new Response("",{status:200,headers:{"content-type":"application/json"}}).json(); }
catch(error) { broken=error; }
assert.ok(broken instanceof SyntaxError);
assert.match(broken.message,/Unexpected end of JSON input/);

let failure="json", calls=0;
const client={rpc:async()=>{
  calls++;
  if(failure==="json") throw broken;
  if(failure==="network") throw Error("fixture network failure");
  if(failure==="rpc") return {data:null,error:{code:"fixture"}};
  if(failure==="shape") return {data:{courses:null,offerings:[]},error:null};
  return {data:{courses:[],offerings:[]},error:null};
}};
const management=await load("src/lib/admin/management.ts",{
  "@supabase/supabase-js":{createClient:()=>{throw Error("secret client prohibited")}},
  "@/lib/supabase/config":{getSupabaseAuthConfig:()=>({url:"https://fixture.invalid"})},
  "@/lib/supabase/server":{createAuthClient:async()=>client},
  "./access":{getAdminAccess:async()=>"allowed"},
});
for(const mode of ["json","network","rpc","shape"]){
  failure=mode;
  assert.equal(await management.loadAdminOfferingCatalog(),null,mode);
}
failure="ok";
const catalog=await management.loadAdminOfferingCatalog();
assert.equal(catalog.courses.length,0);assert.equal(catalog.offerings.length,0);
assert.equal(calls,5);

let identityFailure="getUser";
const access=await load("src/lib/admin/access.ts",{
  "@/lib/supabase/server":{createAuthClient:async()=>({
    auth:{getUser:async()=>{if(identityFailure==="getUser") throw broken;return {data:{user:{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}}};}},
    rpc:async()=>{throw broken;},
  })},
});
assert.equal(await access.getAdminAccess(),"unauthenticated");
identityFailure="rpc";
assert.equal(await access.getAdminAccess(),"forbidden");
console.log("PASS: isolated empty JSON, malformed payload, network and RPC failures fail closed; historic HTTP 500 not reproduced");
