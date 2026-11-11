// Exercise the existing server adapter with an in-memory fake client; no network or real credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = fs.readFileSync(path.join(root, "src/lib/courses.ts"), "utf8");
const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const env = { ACADEMY_COURSE_SOURCE: "supabase" };
const record = { id:"00000000-0000-4000-8000-000000000001", slug:"fictional", title:"Fictional", category:"AI", audience:"Fictional", summary:"Fictional", result_artifact:"Fictional", duration_hours:24, objectives:["Fictional"] };
const state = { configured:true, list:{data:[],error:null}, single:{data:null,error:null}, weeks:{data:[],error:null}, calls:[] };
const mockCourses = [{id:"demo",slug:"demo",title:"Demo",weeks:["Week"]}];
function fakeClient() {
  return { from(table) {
    state.calls.push(table);
    return { select() { return {
      order() { return Promise.resolve(table === "published_course_weeks" ? state.weeks : state.list); },
      eq() { return {
        maybeSingle() { return Promise.resolve(state.single); },
        order() { return Promise.resolve(state.weeks); },
      }; },
    }; } };
  } };
}
const modules = {
  "server-only": {},
  "@supabase/supabase-js": { createClient: fakeClient },
  "react": { cache: (fn) => fn },
  "next/server": { connection: async () => {} },
  "@/data/mock/courses": { courses: mockCourses },
  "@/lib/supabase/config": { getSupabaseAuthConfig: () => state.configured ? {url:"https://fixture.invalid",publishableKey:"fixture"} : null },
};
const moduleData = { exports: {} };
vm.runInNewContext(js, { module:moduleData, exports:moduleData.exports, process:{env}, require:(name)=>{if(!(name in modules))throw Error(`Unexpected module ${name}`);return modules[name];} });
const api = moduleData.exports;
const unavailable = (error) => error instanceof api.CourseDataUnavailable;

assert.equal((await api.listCourses()).courses.length,0);
assert.equal((await api.listCourses()).example,true);
state.list={data:null,error:{message:"fixture error"}};
await assert.rejects(api.listCourses(),unavailable);
state.list={data:[{slug:"bad"}],error:null};
await assert.rejects(api.listCourses(),unavailable);
state.configured=false;
await assert.rejects(api.listCourses(),unavailable);
state.configured=true;
state.calls=[];
assert.equal(await api.findCourse("Invalid slug!"),null);
assert.equal(state.calls.length,0);
assert.equal(await api.findCourse("unknown"),null);
state.single={data:null,error:{message:"fixture error"}};
await assert.rejects(api.findCourse("fictional"),unavailable);
state.single={data:record,error:null};state.weeks={data:[],error:null};
let result=await api.findCourse("fictional");
assert.equal(result.course.weeks.length,0);assert.equal(result.example,true);
state.weeks={data:[{week_number:1,title:"Fictional week"}],error:null};
result=await api.findCourse("fictional");assert.equal(result.course.weeks[0].weekNumber,1);
state.weeks={data:null,error:{message:"fixture error"}};
await assert.rejects(api.findCourse("fictional"),unavailable);
state.weeks={data:[{week_number:0,title:"Invalid"}],error:null};
await assert.rejects(api.findCourse("fictional"),unavailable);
env.ACADEMY_COURSE_SOURCE="mock";state.calls=[];
assert.equal((await api.listCourses()).courses.length,1);assert.equal(state.calls.length,0);
console.log("PASS: empty results, missing course, invalid input/data, backend errors and explicit mock mode; no network");
