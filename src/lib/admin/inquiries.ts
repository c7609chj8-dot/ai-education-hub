import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { getAdminIdentity } from "./access";
import type { ApplicationActionResult } from "./applications-types";
import type { InquiryCategory, InquiryDetail, InquiryItem, InquiryPage, InquiryStatus, InquiryTransition } from "./inquiries-types";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const moment=(value:unknown):value is string=>typeof value==="string"&&value.length<=40&&/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value));
const category=(value:unknown):value is InquiryCategory=>value==="course"||value==="partnership"||value==="other";
const status=(value:unknown):value is InquiryStatus=>value==="received"||value==="in_progress"||value==="completed";
const field=(form:FormData,key:string):string|null=>{const values=form.getAll(key);return values.length===1&&typeof values[0]==="string"?values[0]:null;};
async function adminClient(){
  const identity=await getAdminIdentity();if(identity.access!=="allowed")return null;
  const config=getSupabaseAuthConfig(),key=process.env.SUPABASE_SECRET_KEY;
  if(process.env.ACADEMY_ADMIN_INQUIRIES_ENABLED!=="true"||!config||!key?.startsWith("sb_secret_"))return null;
  const url=new URL(config.url);
  if(url.origin!=="https://uenvjqgylrevujdjpfed.supabase.co"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)return null;
  return {actorId:identity.userId,client:createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store"})}})};
}
function item(value:unknown):InquiryItem|null{
  if(!value||typeof value!=="object")return null;const row=value as Record<string,unknown>;
  if(typeof row.id!=="string"||!uuid.test(row.id)||!category(row.category)||!status(row.status)||!moment(row.created_at)||
     typeof row.masked_name!=="string"||!/^(?:\*|[^*]\*{1,2})$/u.test(row.masked_name)||
     !((row.last_change_at===null&&row.last_actor_id===null)||(moment(row.last_change_at)&&typeof row.last_actor_id==="string"&&uuid.test(row.last_actor_id))))return null;
  return {id:row.id,category:row.category,status:row.status,createdAt:row.created_at,maskedName:row.masked_name,lastChangeAt:row.last_change_at as string|null,lastActorId:row.last_actor_id as string|null};
}
export async function searchAdminInquiries(form:FormData):Promise<ApplicationActionResult<InquiryPage>>{
  try{
    const admin=await adminClient();if(!admin)return {ok:false,reason:"denied"};
    const search=field(form,"search"),at=field(form,"before_at"),id=field(form,"before_id");
    if(search===null||at===null||id===null||Array.from(search).length>100||/[\p{Cc}\p{Cf}]/u.test(search)||!((at===""&&id==="")||(moment(at)&&uuid.test(id))))return {ok:false,reason:"invalid"};
    const {data,error}=await admin.client.rpc("academy_admin_search_inquiries",{p_search:search.trim(),p_before_at:at||null,p_before_id:id||null,p_limit:21});
    if(error||!data||typeof data!=="object"||!Array.isArray(data.items)||data.items.length>21)return {ok:false,reason:"unavailable"};
    const items=data.items.map(item) as (InquiryItem|null)[];if(items.some((row)=>!row))return {ok:false,reason:"unavailable"};
    const shown=(items as InquiryItem[]).slice(0,20),last=shown.at(-1);
    return {ok:true,value:{items:shown,next:items.length>20&&last?{at:last.createdAt,id:last.id}:null}};
  }catch{return {ok:false,reason:"unavailable"};}
}
export async function readAdminInquiry(form:FormData):Promise<ApplicationActionResult<InquiryDetail>>{
  try{
    const admin=await adminClient();if(!admin)return {ok:false,reason:"denied"};const id=field(form,"id");if(!id||!uuid.test(id))return {ok:false,reason:"invalid"};
    const {data,error}=await admin.client.rpc("academy_admin_read_inquiry",{p_id:id,p_actor_id:admin.actorId});
    if(error||!data||typeof data!=="object"||data.id!==id||!category(data.category)||!status(data.status)||!moment(data.created_at)||
       typeof data.name!=="string"||!data.name.trim()||Array.from(data.name).length>100||typeof data.email!=="string"||data.email.length>254||
       typeof data.message!=="string"||!data.message.trim()||Array.from(data.message).length>2000)return {ok:false,reason:"unavailable"};
    return {ok:true,value:{id:data.id,category:data.category,status:data.status,createdAt:data.created_at,name:data.name,email:data.email,message:data.message}};
  }catch{return {ok:false,reason:"unavailable"};}
}
export async function advanceAdminInquiry(form:FormData):Promise<ApplicationActionResult<InquiryTransition>>{
  try{
    const admin=await adminClient();if(!admin)return {ok:false,reason:"denied"};const id=field(form,"id"),expected=field(form,"expected");
    if(!id||!uuid.test(id)||(expected!=="received"&&expected!=="in_progress"))return {ok:false,reason:"invalid"};
    const {data,error}=await admin.client.rpc("academy_admin_advance_inquiry",{p_id:id,p_actor_id:admin.actorId,p_expected:expected});
    if(error||!data||typeof data!=="object")return {ok:false,reason:"unavailable"};if(data.result==="conflict")return {ok:false,reason:"conflict"};
    const next=expected==="received"?"in_progress":"completed";
    if(data.result!==next||!moment(data.changed_at)||data.actor_id!==admin.actorId)return {ok:false,reason:"unavailable"};
    return {ok:true,value:{status:next,changedAt:data.changed_at,actorId:data.actor_id}};
  }catch{return {ok:false,reason:"unavailable"};}
}
