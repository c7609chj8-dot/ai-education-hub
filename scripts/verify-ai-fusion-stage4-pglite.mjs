// Model checks only: not a native PostgreSQL concurrency substitute.
import { PGlite } from '@electric-sql/pglite';
import { verifyOfferingV2 } from './verify-admin-offerings-v2-cases.mjs';
import { verifyFusionStage4 } from './verify-ai-fusion-stage4-cases.mjs';
const db=new PGlite();
const client={query:async(sql,params)=>params?db.query(sql,params):(await db.exec(sql)).at(-1)};
try { await verifyOfferingV2(client); await verifyFusionStage4({client}); }
finally { await db.close(); }
