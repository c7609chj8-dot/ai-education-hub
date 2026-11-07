// Isolated in-memory PostgreSQL only; no remote Supabase connection or credentials.
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

async function main() {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
    for (const file of ["supabase/migrations/20261107100302_academy_course_foundation.sql", "supabase/drafts/day08_public_courses.sql", "supabase/drafts/day09_public_offerings.sql", "supabase/drafts/day10_admin_management.sql"]) await db.exec(read(file));
    const acl = await db.query("SELECT p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,has_function_privilege('service_role',p.oid,'EXECUTE') service FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('academy_admin_catalog','academy_admin_save_course','academy_admin_save_offering') ORDER BY p.proname");
    assert.equal(acl.rows.length, 3);
    for (const f of acl.rows) assert.deepEqual({ invoker: !f.prosecdef, anon: f.anon, authenticated: f.authenticated, service: f.service }, { invoker: true, anon: false, authenticated: false, service: true });
    const rights = await db.query("SELECT has_table_privilege('anon','academy.courses','INSERT') anon_write,has_table_privilege('authenticated','academy.offerings','UPDATE') user_write,has_table_privilege('service_role','academy.courses','DELETE') service_delete,has_table_privilege('service_role','academy.course_weeks','UPDATE') week_write");
    assert.deepEqual(rights.rows[0], { anon_write: false, user_write: false, service_delete: false, week_write: false });
    await db.exec("SET ROLE anon");
    await assert.rejects(db.query("SELECT public.academy_admin_catalog()"), /permission denied/);
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await assert.rejects(db.query("SELECT public.academy_admin_catalog()"), /permission denied/);
    await db.exec("RESET ROLE; SET ROLE service_role");
    const saveCourse = "SELECT public.academy_admin_save_course($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::integer,$9::text[],$10::text) AS id";
    const args = [null,"test-course","Test course","Test","Test summary","Test audience","Test result",12,["Goal"],"draft"];
    const course = (await db.query(saveCourse,args)).rows[0].id;
    const saveOffering = "SELECT public.academy_admin_save_offering($1::uuid,$2::uuid,$3::date,$4::date,$5::text,$6::integer,$7::text,$8::boolean) AS id";
    await assert.rejects(db.query(saveOffering,[null,course,"2026-11-10","2026-12-10","Test",20,"scheduled",true]), /Public offering requires/);
    await db.query(saveCourse,[course,...args.slice(1,9),"published"]);
    const offering = (await db.query(saveOffering,[null,course,"2026-11-10","2026-12-10","Test",20,"scheduled",true])).rows[0].id;
    const catalog = (await db.query("SELECT public.academy_admin_catalog() AS data")).rows[0].data;
    assert.equal(catalog.courses.length,1);assert.equal(catalog.offerings.length,1);
    await db.exec("RESET ROLE; SET ROLE anon");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.published_offerings")).rows[0].n,1);
    await db.exec("RESET ROLE; SET ROLE service_role");
    await db.query(saveOffering,[offering,course,"2026-11-10","2026-12-10","Test",20,"scheduled",false]);
    await assert.rejects(db.query(saveOffering,[offering,course,"2026-12-11","2026-12-10","Test",20,"scheduled",false]), /check constraint/);
    await assert.rejects(db.query(saveOffering,[offering,course,"2026-11-10","2026-12-10","Test",-1,"scheduled",false]), /check constraint/);
    await db.exec("RESET ROLE; SET ROLE anon");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.published_offerings")).rows[0].n,0);
    console.log("PASS: invoker-only RPC grants; anon/auth denied; service can create/edit and publish/unpublish; invalid dates, capacities and private-parent publication rejected (isolated PostgreSQL)");
  } finally { await db.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
