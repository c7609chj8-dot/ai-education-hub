import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

// Runs only a newly initialized localhost PostgreSQL cluster. No connection URL is accepted.
// Install pinned test-only packages outside the repo and set DAY12_PG_MODULE_ROOT to that folder.
const moduleRoot = process.env.DAY12_PG_MODULE_ROOT;
if (!moduleRoot) throw Error("Set DAY12_PG_MODULE_ROOT to an isolated folder with embedded-postgres and pg installed");
const load = createRequire(path.join(path.resolve(moduleRoot), "package.json"));
const { default: EmbeddedPostgres } = await import(pathToFileURL(load.resolve("embedded-postgres")).href);
const { Client } = load("pg");
const { gracefulExit } = await import(pathToFileURL(load.resolve("exit-hook")).href);
const reservePort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.on("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((err) => err ? reject(err) : resolve(port)); }); });
const tempRoot = path.resolve(os.tmpdir());
const fixtureDir = await fs.mkdtemp(path.join(tempRoot, "academy-day19-"));
const port = await reservePort();
const password = crypto.randomBytes(24).toString("base64url");
const instance = new EmbeddedPostgres({ databaseDir: path.join(fixtureDir, "db"), user: "postgres", password, port, persistent: true, autoRehydrateSymlinks: true, postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
const connection = { host: "127.0.0.1", port, database: "postgres", user: "postgres", password, connectionTimeoutMillis: 5000 };
const clients = [];
let startAttempted = false;
const open = async () => { const client = new Client(connection); await client.connect(); clients.push(client); return client; };
const root = process.cwd();
const sql = async (name) => fs.readFile(path.join(root,name), "utf8");
try{
 await instance.initialise();startAttempted=true;await instance.start();const owner=await open(),first=await open();
 await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
 for(const file of ["supabase/migrations/20261107100302_academy_course_foundation.sql","supabase/drafts/day08_public_courses.sql","supabase/drafts/day09_public_offerings.sql","supabase/drafts/day10_admin_management.sql","supabase/drafts/day11_application_data.sql","supabase/drafts/day12_atomic_applications.sql","supabase/drafts/day14_admin_applications.sql","supabase/drafts/day15_inquiries.sql","supabase/drafts/day16_content_management.sql","supabase/drafts/day17_assets.sql","supabase/drafts/day18_brand.sql","supabase/drafts/day19_activity.sql"])await owner.query(await sql(file));
 const acl=(await owner.query("SELECT has_function_privilege('anon','public.academy_admin_read_activity(text,timestamptz,uuid,integer,uuid)','EXECUTE') anon,has_function_privilege('authenticated','public.academy_admin_read_activity(text,timestamptz,uuid,integer,uuid)','EXECUTE') authenticated,has_function_privilege('service_role','public.academy_admin_read_activity(text,timestamptz,uuid,integer,uuid)','EXECUTE') service")).rows[0];assert.deepEqual(acl,{anon:false,authenticated:false,service:true});
 const actor=crypto.randomUUID(),read="SELECT public.academy_admin_read_activity($1::text,$2::timestamptz,$3::uuid,$4::int,$5::uuid) AS data";
 for(const role of ["anon","authenticated"]){await first.query(`SET ROLE ${role}`);await assert.rejects(first.query(read,["application",null,null,21,actor]),/permission denied/);await assert.rejects(first.query("SELECT * FROM academy.audit_log_reads"),/permission denied/);await first.query("RESET ROLE");}
 const course=(await owner.query("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('fictional','Fictional','Test','Test','Test','Test','published') RETURNING id")).rows[0].id;
 const offer=(await owner.query("INSERT INTO academy.offerings(course_id,capacity,status,is_public) VALUES($1,25,'open',true) RETURNING id",[course])).rows[0].id;
 const app=(await owner.query("INSERT INTO academy.applications(offering_id,notice_version,request_id) VALUES($1,'test-v1',$2) RETURNING id",[offer,crypto.randomUUID()])).rows[0].id;
 for(let i=0;i<25;i++)await owner.query("INSERT INTO academy.application_status_events(application_id,actor_id,from_status,to_status,created_at) VALUES($1,$2,'received','reviewed','2026-01-01T00:00:00Z')",[app,actor]);
 const inquiry=(await owner.query("INSERT INTO academy.inquiries(request_id,category,notice_version) VALUES($1,'course','test-v1') RETURNING id",[crypto.randomUUID()])).rows[0].id;
 await owner.query("INSERT INTO academy.inquiry_private(inquiry_id,sender_name,sender_email,message) VALUES($1,'Fictional User','person@example.test','Fictional private message')",[inquiry]);
 await owner.query("INSERT INTO academy.inquiry_events(inquiry_id,actor_id,kind) VALUES($1,$2,'viewed')",[inquiry,actor]);
 const content=(await owner.query("INSERT INTO academy.contents(kind,category,title,body) VALUES('news','test','Fictional title','Fictional text') RETURNING id")).rows[0].id;
 await owner.query("INSERT INTO academy.content_events(content_id,actor_id,revision) VALUES($1,$2,1)",[content,actor]);
 const asset=crypto.randomUUID();await owner.query("INSERT INTO academy.assets(id,kind,title,description,mime,byte_size) VALUES($1,'resource','Fictional file','Test','application/pdf',10)",[asset]);await owner.query("INSERT INTO academy.asset_events(asset_id,actor_id,revision) VALUES($1,$2,1)",[asset,actor]);await owner.query("INSERT INTO academy.brand_events(actor_id,revision) VALUES($1,1)",[actor]);
 await first.query("SET ROLE service_role");const page1=(await first.query(read,["application",null,null,20,actor])).rows[0].data.items;assert.equal(page1.length,20);const last=page1.at(-1);const page2=(await first.query(read,["application",last.created_at,last.id,20,actor])).rows[0].data.items;assert.equal(page2.length,5);assert.equal(new Set([...page1,...page2].map(x=>x.id)).size,25);
 for(const kind of ["inquiry","content","asset","brand"]){const rows=(await first.query(read,[kind,null,null,21,actor])).rows[0].data.items;assert.equal(rows.length,1);const serialized=JSON.stringify(rows);assert.ok(!serialized.includes('person@example.test')&&!serialized.includes('Fictional private message')&&!serialized.includes('Fictional title'));assert.equal(rows[0].actor_id,actor);}
 assert.equal((await owner.query("SELECT count(*)::int n FROM academy.audit_log_reads")).rows[0].n,6);
 assert.equal((await first.query(read,["inquiry",null,crypto.randomUUID(),21,actor])).rows[0].data,null);assert.equal((await first.query(read,["invalid",null,null,21,actor])).rows[0].data,null);
 await owner.query("REVOKE INSERT (actor_id,category) ON academy.audit_log_reads FROM service_role");await assert.rejects(first.query(read,["inquiry",null,null,21,actor]),/permission denied/);assert.equal((await owner.query("SELECT count(*)::int n FROM academy.audit_log_reads")).rows[0].n,6);
}finally{for(const client of clients)await client.end().catch(()=>{});if(startAttempted)await instance.stop();const target=path.resolve(fixtureDir);if(path.dirname(target)===tempRoot&&path.basename(target).startsWith("academy-day19-"))await fs.rm(target,{recursive:true,force:true,maxRetries:30,retryDelay:300});}
console.log("PASS: activity role denial, five categories, identical-time pagination, data minimization and audit-read failure (isolated PostgreSQL)");
gracefulExit(0);
