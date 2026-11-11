// Only called by the disposable localhost PostgreSQL harness.
// Uses fabricated row data, a fabricated snapshot and a random local password.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec=promisify(execFile);
export async function verifyB039Candidates({client,first,course,port,password,root}) {
  const fakeId="77777777-7777-4777-8777-777777777777";
  const realId="e9791c02-5bbf-4b55-86e3-7b6302cd6711";
  const realCourse="7057c1b5-ff56-41e1-8d1a-63938f11a529";
  const actualPath="C:/Users/USER/Documents/ai-education-hub-dev-backups/b038-test-offering-snapshot-20261110-222128/offering-test-row.json";
  if(!Number.isInteger(port)||port<1024||!path.isAbsolute(root)||!path.basename(root).startsWith("academy-offering-v2-")) throw Error("Unsafe local fixture");
  await client.query("DELETE FROM academy.offerings");
  await client.query("DELETE FROM academy.courses WHERE slug='private-parent-v2'");
  await client.query("CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY)");
  await client.query("INSERT INTO supabase_migrations.schema_migrations(version) VALUES ('20261107100302'),('20261108064422'),('20261108105949'),('20261108143123'),('20261108183527')");
  await client.query("INSERT INTO academy.offerings(id,course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,location,capacity,status,created_at,is_public) VALUES($1,$2,'2027-03-02','2027-05-18','2027-02-01 00:00:00+00','2027-02-28 09:00:00+00','B-03-6 개발 시험 (수정)',10,'draft','2026-11-09 14:41:30.450208+00',false)",[fakeId,course]);
  const saved=(await client.query("SELECT to_jsonb(o) AS row FROM academy.offerings o WHERE id=$1",[fakeId])).rows[0].row;
  const snapshot=path.join(root,"fictional-offering.json");
  const content=JSON.stringify({kind:"development_test_offering_snapshot_only",project_id:"uenvjqgylrevujdjpfed",row:{...saved,observed_at:"2026-11-10T00:00:00+00:00"}});
  await fs.writeFile(snapshot,content,"utf8");
  const adapted={};
  for(const name of ["delete","restore"]) {
    const source=await fs.readFile("supabase/drafts/b03_9_dev_test_offering_"+name+".psql.txt","utf8");
    if(!source.includes(actualPath)||!source.includes(realId)||!source.includes(realCourse))throw Error("Candidate identity mismatch");
    const sql=source.replaceAll(actualPath,snapshot.split(path.sep).join("/")).replaceAll(realId,fakeId).replaceAll(realCourse,course);
    const filename=path.join(root,"fictional-"+name+".sql");await fs.writeFile(filename,sql,"utf8");adapted[name]=filename;
  }
  const psql=path.join(process.env.ProgramFiles,"PostgreSQL","17","bin","psql.exe");
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^PG/i.test(key)));
  Object.assign(env,{PGHOST:"127.0.0.1",PGPORT:String(port),PGUSER:"cluster_admin",PGDATABASE:"postgres",PGPASSWORD:password,PGOPTIONS:"-c role=postgres",PGSSLMODE:"disable",PGCONNECT_TIMEOUT:"5"});
  async function run(file,vars=[]) {
    try { await exec(psql,["-X","-w","-f",file,...vars.flatMap(value=>["-v",value])],{env,timeout:45000,windowsHide:true,maxBuffer:1024*1024});return 0; }
    catch(error) { if(typeof error.code==="number") return error.code; throw Error("Local psql fixture failed"); }
  }
  const alive=async()=>(await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[fakeId])).rows[0].n;
  assert.equal(await run(adapted.delete),3,"no approval must fail");
  assert.equal(await alive(),1);
  assert.equal(await run(adapted.delete,["b039_execute=on"]),3,"no external review must fail");
  assert.equal(await alive(),1);
  const vars=["b039_execute=on","b039_external_clear=on"];
  const altered=JSON.parse(content);altered.row.location="different fixture";
  await fs.writeFile(snapshot,JSON.stringify(altered),"utf8");
  assert.equal(await run(adapted.delete,vars),3,"snapshot mismatch must fail");
  assert.equal(await alive(),1);
  await fs.writeFile(snapshot,content,"utf8");
  await client.query("CREATE TABLE academy.b039_reference(offering_id uuid REFERENCES academy.offerings(id))");
  assert.equal(await run(adapted.delete,vars),3,"any FK must fail closed");
  assert.equal(await alive(),1);await client.query("DROP TABLE academy.b039_reference");
  await first.query("RESET ROLE; BEGIN; LOCK TABLE academy.offerings IN ACCESS SHARE MODE");
  assert.equal(await run(adapted.delete,vars),3,"conflicting lock must time out");
  await first.query("ROLLBACK");assert.equal(await alive(),1);
  const rollbackPath=path.join(root,"fictional-rollback.sql");
  const deleteSql=await fs.readFile(adapted.delete,"utf8");
  if(!deleteSql.includes("COMMIT;"))throw Error("Transaction boundary not found");
  await fs.writeFile(rollbackPath,deleteSql.replace("COMMIT;","DO $test$ BEGIN RAISE EXCEPTION 'fixture rollback'; END $test$;"+String.fromCharCode(10)+"COMMIT;"),"utf8");
  assert.equal(await run(rollbackPath,vars),3,"post-delete error must roll back");
  assert.equal(await alive(),1);
  assert.equal(await run(adapted.delete,vars),0);
  assert.equal(await alive(),0);
  assert.equal(await run(adapted.restore),3,"restore needs separate approval");
  assert.equal(await alive(),0);
  assert.equal(await run(adapted.restore,["b039_restore=on"]),0);
  assert.equal(await alive(),1);
  const restored=(await client.query("SELECT to_jsonb(o) AS row FROM academy.offerings o WHERE id=$1",[fakeId])).rows[0].row;
  assert.deepEqual(restored,saved);
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.courses")).rows[0].n,5);
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.course_weeks")).rows[0].n,60);
  console.log("PASS: isolated psql candidates enforce gates, snapshot/FK/lock checks, rollback, one-row delete and separately gated exact restore");
}
