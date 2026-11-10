// Offline fault injection with fictional sessions and responses; no network.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { PostgrestClient } from "@supabase/postgrest-js";

const logs=[];
async function load(path, imports) {
  const code=ts.transpileModule(await readFile(path,"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const compiled={exports:{}};
  vm.runInNewContext(code,{
    module:compiled,exports:compiled.exports,URL,Date,console:{warn:(...args)=>logs.push(args)},fetch:()=>{throw Error("Network disabled")},
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
const diagnostics=await load("src/lib/admin/diagnostics.ts",{});
assert.equal(diagnostics.classifyFailure(broken),"malformed_json");
assert.equal(diagnostics.classifyFailure({name:"TypeError",message:"secret-marker"}),"network_or_client");
assert.equal(diagnostics.classifyFailure({},401),"auth");
assert.equal(diagnostics.classifyFailure({},408),"timeout");
assert.equal(diagnostics.classifyFailure({},429),"rate_limit");
assert.equal(diagnostics.classifyFailure({},503),"upstream_server");
assert.equal(diagnostics.classifyFailure({name:"other",message:"secret-marker"}),"unknown");
assert.equal(diagnostics.classifyFailure({name:"Error"},0),"network_or_client");
assert.equal(diagnostics.classifyFailure({message:"secret-marker"},200),"invalid_response");

// Exercise the installed PostgREST parser with an injected local-only fetch.
// The mock body deliberately contains a marker which must never enter logs.
const sdkResult=async(body,status)=>new PostgrestClient("https://fixture.invalid",{
  fetch:async()=>new Response(body,{status,headers:{"content-type":"application/json"}}),
}).rpc("fixture",{});
const blank=await sdkResult("",200);
assert.equal(blank.data,null);assert.equal(blank.error,null);
const malformed=await sdkResult("secret-marker{",200);
assert.equal(malformed.data,null);assert.ok(malformed.error);
assert.equal(diagnostics.classifyFailure(malformed.error,malformed.status),"invalid_response");

let failure="json", calls=0;
const client={rpc:async()=>{
  calls++;
  if(failure==="json") throw broken;
  if(failure==="network") throw TypeError("fixture network failure secret-marker");
  if(failure==="rpc") return {data:null,error:{code:"fixture"}};
  if(failure==="server") return {data:null,error:{message:"secret-marker"},status:503};
  if(failure==="throttled") return {data:null,error:{message:"secret-marker"},status:429};
  if(failure==="expired") return {data:null,error:{message:"secret-marker"},status:401};
  if(failure==="sdk_blank") return blank;
  if(failure==="sdk_malformed") return malformed;
  if(failure==="shape") return {data:{courses:null,offerings:[]},error:null};
  return {data:{courses:[],offerings:[]},error:null};
}};
const management=await load("src/lib/admin/management.ts",{
  "@supabase/supabase-js":{createClient:()=>{throw Error("secret client prohibited")}},
  "@/lib/supabase/config":{getSupabaseAuthConfig:()=>({url:"https://fixture.invalid"})},
  "@/lib/supabase/server":{createAuthClient:async()=>client},
  "./access":{getAdminAccess:async()=>"allowed"},
  "./diagnostics":diagnostics,
});
for(const mode of ["json","network","rpc","shape","server","throttled","expired","sdk_blank","sdk_malformed"]){
  failure=mode;
  assert.equal(await management.loadAdminOfferingCatalog(),null,mode);
}
failure="ok";
const catalog=await management.loadAdminOfferingCatalog();
assert.equal(catalog.courses.length,0);assert.equal(catalog.offerings.length,0);
assert.equal(calls,10);

let identityFailure="getUser";
const access=await load("src/lib/admin/access.ts",{
  "@/lib/supabase/server":{createAuthClient:async()=>({
    auth:{getUser:async()=>{
      if(identityFailure==="getUser") throw broken;
      if(identityFailure==="no_session") return {data:{user:null},error:{name:"AuthSessionMissingError",status:400}};
      if(identityFailure==="expired") return {data:{user:null},error:{name:"AuthApiError",status:401,message:"secret-marker"}};
      if(identityFailure==="server") return {data:{user:null},error:{name:"AuthApiError",status:503,message:"secret-marker"}};
      return {data:{user:{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}}};
    }},
    rpc:async()=>{throw broken;},
  })},
  "./diagnostics":diagnostics,
});
assert.equal(await access.getAdminAccess(),"unauthenticated");
identityFailure="no_session";
const beforeMissing=logs.length;assert.equal(await access.getAdminAccess(),"unauthenticated");assert.equal(logs.length,beforeMissing);
identityFailure="expired";assert.equal(await access.getAdminAccess(),"unauthenticated");
identityFailure="server";assert.equal(await access.getAdminAccess(),"unauthenticated");
identityFailure="rpc";
assert.equal(await access.getAdminAccess(),"forbidden");
assert.ok(logs.some(x=>x[1]?.stage==="offering_catalog"&&x[1]?.kind==="malformed_json"));
assert.ok(logs.some(x=>x[1]?.stage==="offering_catalog"&&x[1]?.kind==="invalid_response"));
for(const kind of ["network_or_client","upstream_server","rate_limit","auth"])
  assert.ok(logs.some(x=>x[1]?.stage==="offering_catalog"&&x[1]?.kind===kind));
assert.ok(logs.some(x=>x[1]?.stage==="auth_user"&&x[1]?.kind==="malformed_json"));
assert.ok(logs.some(x=>x[1]?.stage==="auth_user"&&x[1]?.kind==="auth"));
assert.ok(logs.some(x=>x[1]?.stage==="auth_user"&&x[1]?.kind==="upstream_server"));
assert.ok(logs.some(x=>x[1]?.stage==="admin_check"&&x[1]?.kind==="malformed_json"));
assert.doesNotMatch(JSON.stringify(logs),/secret-marker|fixture network failure|Unexpected end/);
console.log("PASS: isolated JSON/network/RPC failures fail closed with allowlisted diagnostics; historic HTTP 500 not reproduced");
