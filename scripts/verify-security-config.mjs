// Validates project pinning without network access or real keys.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code=ts.transpileModule(fs.readFileSync("src/lib/supabase/config.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}},env={NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_fixture",NEXT_PUBLIC_SUPABASE_URL:"https://uenvjqgylrevujdjpfed.supabase.co"};
vm.runInNewContext(code,{module:m,exports:m.exports,URL,process:{env}});
const check=m.exports.getSupabaseAuthConfig;
assert.equal(check().url,env.NEXT_PUBLIC_SUPABASE_URL);
for(const url of ["http://uenvjqgylrevujdjpfed.supabase.co","https://other.supabase.co","https://uenvjqgylrevujdjpfed.supabase.co.evil.test","https://evil.test@uenvjqgylrevujdjpfed.supabase.co","https://uenvjqgylrevujdjpfed.supabase.co:8443","https://uenvjqgylrevujdjpfed.supabase.co/rest/v1","https://uenvjqgylrevujdjpfed.supabase.co/?x=1","https://uenvjqgylrevujdjpfed.supabase.co/#fragment","http://localhost:54321","not a url"]){env.NEXT_PUBLIC_SUPABASE_URL=url;assert.equal(check(),null,url);}
env.NEXT_PUBLIC_SUPABASE_URL="https://uenvjqgylrevujdjpfed.supabase.co/";assert.ok(check());env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="invalid";assert.equal(check(),null);
console.log("PASS: development Supabase URL pinning and malformed configuration fail closed");
