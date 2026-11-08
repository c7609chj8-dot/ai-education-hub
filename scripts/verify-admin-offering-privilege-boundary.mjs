// Disposable PGlite demonstration only; this intentionally tests a privileged bypass.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db=new PGlite();
try {
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  for(const file of [
    "supabase/migrations/20261107100302_academy_course_foundation.sql",
    "supabase/migrations/20261108105949_public_course_catalog.sql",
    "supabase/drafts/day08_dev_examples.sql",
    "supabase/migrations/20261108143123_public_offerings_catalog.sql",
    "supabase/drafts/b03_5_insecure_v1_do_not_apply.sql",
  ]) await db.exec(await readFile(file,"utf8"));
  const id=(await db.query("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  await db.exec("SET ROLE service_role");
  // An invalid public/open offering with missing windows is rejected by the RPC...
  await assert.rejects(db.query("SELECT public.academy_admin_save_offering_v1($1::uuid,true,$2::uuid,NULL::date,NULL::date,NULL::timestamptz,NULL::timestamptz,NULL::text,10,'open',true)",["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",id]),/Invalid offering/);
  // ...but the proposed SECURITY INVOKER grants allow the privileged role to bypass it.
  await db.query("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public) VALUES ($1,$2,10,'open',true)",["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",id]);
  await db.exec("RESET ROLE; SET ROLE anon");
  const rows=(await db.query("SELECT status,enrollment_opens_at,enrollment_closes_at FROM public.published_offerings")).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].status,"open");assert.equal(rows[0].enrollment_opens_at,null);assert.equal(rows[0].enrollment_closes_at,null);
  console.log("PASS: isolated test demonstrates service_role direct-table bypass of RPC validation; fake public row visible");
} finally { await db.close(); }
