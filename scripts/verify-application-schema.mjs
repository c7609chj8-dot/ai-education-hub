// In-memory PostgreSQL only. These test values are fictional.
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import fs from "node:fs";
const db = new PGlite();
try {
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  await db.exec(fs.readFileSync("supabase/migrations/20261107100302_academy_course_foundation.sql","utf8"));
  // Model permissive defaults to verify the draft explicitly revokes table access.
  await db.exec("ALTER DEFAULT PRIVILEGES IN SCHEMA academy GRANT ALL ON TABLES TO anon, authenticated, service_role");
  await db.exec(fs.readFileSync("supabase/drafts/day11_application_data.sql","utf8"));
  const rls = await db.query("SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='academy' AND relname IN ('applications','application_private') ORDER BY relname");
  assert.equal(rls.rows.length,2);assert.ok(rls.rows.every((row)=>row.relrowsecurity));
  for (const role of ["anon","authenticated","service_role"]) for (const table of ["applications","application_private"]) for (const right of ["SELECT","INSERT","UPDATE","DELETE"]) {
    const r=await db.query("SELECT has_table_privilege($1,$2,$3) AS allowed",[role,`academy.${table}`,right]);assert.equal(r.rows[0].allowed,false,`${role} ${table} ${right}`);
  }
  const course=(await db.query("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact) VALUES ('test','Test','Test','Test','Test','Test') RETURNING id")).rows[0].id;
  const offering=(await db.query("INSERT INTO academy.offerings(course_id,capacity) VALUES ($1,10) RETURNING id",[course])).rows[0].id;
  const app=(await db.query("INSERT INTO academy.applications(offering_id,notice_version) VALUES ($1,'test-v1') RETURNING id",[offering])).rows[0].id;
  await db.query("INSERT INTO academy.application_private(application_id,applicant_name,contact) VALUES ($1,'Fictional','010-0000-0000')",[app]);
  await assert.rejects(db.query("INSERT INTO academy.applications(offering_id,notice_version) VALUES ($1,'')",[offering]),/check constraint/);
  await assert.rejects(db.query("INSERT INTO academy.application_private(application_id,applicant_name,contact) VALUES ('00000000-0000-4000-8000-000000000000','Fictional','010-0000-0000')"),/foreign key/);
  await assert.rejects(db.query("DELETE FROM academy.applications WHERE id=$1",[app]),/foreign key/);
  for (const role of ["anon","authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query("SELECT * FROM academy.applications"),/permission denied/);
    await assert.rejects(db.query("SELECT * FROM academy.application_private"),/permission denied/);
    await db.exec("RESET ROLE");
  }
  console.log("PASS: draft tables enable RLS, explicitly deny all API roles despite permissive default grants, and enforce basic references (isolated PostgreSQL)");
} finally { await db.close(); }
