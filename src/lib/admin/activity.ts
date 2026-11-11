import "server-only";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseAuthConfig} from "@/lib/supabase/config";
import {getAdminIdentity} from "./access";
import type {ApplicationActionResult} from "./applications-types";
import type {ActivityCategory,ActivityItem,ActivityPage} from "./activity-types";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const moment=(v:unknown):v is string=>typeof v==="string"&&v.length<=40&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const category=(v:unknown):v is ActivityCategory=>typeof v==="string"&&["application","inquiry","content","asset","brand"].includes(v);
const field=(form:FormData,key:string):string|null=>{const a=form.getAll(key);return a.length===1&&typeof a[0]==="string"?a[0]:null;};
function parseItem(value:unknown,kind:ActivityCategory):ActivityItem|null{
 if(!value||typeof value!=="object")return null;const r=value as Record<string,unknown>;
 if(typeof r.id!=="string"||!uuid.test(r.id)||!moment(r.created_at)||typeof r.actor_id!=="string"||!uuid.test(r.actor_id)||!(kind==="brand"?r.target_id===null:typeof r.target_id==="string"&&uuid.test(r.target_id)))return null;
 const status=(s:unknown)=>s==="received"||s==="reviewed"||s==="in_progress"||s==="completed";
 const valid=kind==="application"?r.action==="status_changed"&&r.revision===null&&r.from_status==="received"&&r.to_status==="reviewed":kind==="inquiry"?(r.revision===null&&((r.action==="viewed"&&r.from_status===null&&r.to_status===null)||(r.action==="status_changed"&&status(r.from_status)&&status(r.to_status)&&((r.from_status==="received"&&r.to_status==="in_progress")||(r.from_status==="in_progress"&&r.to_status==="completed"))))):r.action==="saved"&&Number.isInteger(r.revision)&&(r.revision as number)>0&&r.from_status===null&&r.to_status===null;
 if(!valid)return null;return {id:r.id,createdAt:r.created_at,actorId:r.actor_id,targetId:r.target_id as string|null,action:r.action as ActivityItem["action"],revision:r.revision as number|null,fromStatus:r.from_status as string|null,toStatus:r.to_status as string|null};
}
export async function readActivity(form:FormData):Promise<ApplicationActionResult<ActivityPage>>{
 try{const identity=await getAdminIdentity();if(identity.access!=="allowed")return {ok:false,reason:"denied"};const config=getSupabaseAuthConfig(),key=process.env.SUPABASE_SECRET_KEY;if(process.env.ACADEMY_ADMIN_AUDIT_ENABLED!=="true"||!config||!key?.startsWith("sb_secret_"))return {ok:false,reason:"denied"};const url=new URL(config.url);if(url.origin!=="https://uenvjqgylrevujdjpfed.supabase.co"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)return {ok:false,reason:"denied"};
 const kind=field(form,"category"),at=field(form,"before_at"),id=field(form,"before_id");if(!category(kind)||at===null||id===null||!((at===""&&id==="")||(moment(at)&&uuid.test(id))))return {ok:false,reason:"invalid"};
 const client=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store"})}});const {data,error}=await client.rpc("academy_admin_read_activity",{p_category:kind,p_before_at:at||null,p_before_id:id||null,p_limit:21,p_actor:identity.userId});if(error||!data||!Array.isArray(data.items)||data.items.length>21)return {ok:false,reason:"unavailable"};const items=data.items.map((row:unknown)=>parseItem(row,kind)) as (ActivityItem|null)[];if(items.some((row)=>!row))return {ok:false,reason:"unavailable"};const shown=(items as ActivityItem[]).slice(0,20),last=shown.at(-1);return {ok:true,value:{items:shown,next:items.length>20&&last?{at:last.createdAt,id:last.id}:null}};
 }catch{return {ok:false,reason:"unavailable"};}
}
