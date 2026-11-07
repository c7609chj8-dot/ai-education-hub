// Verifies the privileged catalog client independently rejects a different project.
import assert from "node:assert/strict";import fs from "node:fs";import vm from "node:vm";import ts from "typescript";
const code=ts.transpileModule(fs.readFileSync("src/lib/admin/management.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let config={url:"https://other.supabase.co"},access="allowed",created=0,requests=0;const env={ACADEMY_ADMIN_MANAGEMENT_ENABLED:"true",SUPABASE_SECRET_KEY:"sb_secret_"+"fixture"};
const imports={"@supabase/supabase-js":{createClient:()=>{created++;return {rpc:async()=>{requests++;return {data:{courses:[],offerings:[]},error:null}}}}},"@/lib/supabase/config":{getSupabaseAuthConfig:()=>config},"./access":{getAdminAccess:async()=>access}};
const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require:(n)=>n==="server-only"?{}:imports[n]??(()=>{throw Error("Unexpected import")})(),URL,process:{env},fetch:()=>{throw Error("No network")}});
const load=m.exports.loadAdminCatalog;
for(const url of ["https://other.supabase.co","https://uenvjqgylrevujdjpfed.supabase.co.evil.test","https://user@uenvjqgylrevujdjpfed.supabase.co","https://uenvjqgylrevujdjpfed.supabase.co/rest/v1"]){config={url};assert.equal(await load(),null);assert.equal(created,0);}
config={url:"https://uenvjqgylrevujdjpfed.supabase.co"};access="forbidden";assert.equal(await load(),null);assert.equal(created,0);access="allowed";env.ACADEMY_ADMIN_MANAGEMENT_ENABLED="false";assert.equal(await load(),null);assert.equal(created,0);env.ACADEMY_ADMIN_MANAGEMENT_ENABLED="true";assert.ok(await load());assert.equal(created,1);assert.equal(requests,1);
console.log("PASS: privileged catalog client independently rejects unapproved project URLs before creation");
