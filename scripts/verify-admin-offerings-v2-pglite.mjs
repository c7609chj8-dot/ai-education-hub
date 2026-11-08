import { PGlite } from "@electric-sql/pglite";
import { verifyOfferingV2 } from "./verify-admin-offerings-v2-cases.mjs";
const db=new PGlite();
let failure;
try {
  await verifyOfferingV2({ query: async (sql, params) =>
    params ? db.query(sql, params) : (await db.exec(sql)).at(-1) });
} catch (error) {
  failure=error;
} finally { await db.close(); }
if(failure){console.error(`FAIL: ${failure.stack}`);process.exit(1);}
