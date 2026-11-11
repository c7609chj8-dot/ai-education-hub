import "server-only";
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseAuthConfig} from "@/lib/supabase/config";
import {getAdminIdentity} from "@/lib/admin/access";
import {inspectAsset,MAX_ASSET_BYTES} from "./validation";
import {boundStorageResponse} from "./bounded-response";
import type {AssetKind,AssetType} from "./validation";
import type {AssetItem,AssetPage,ManagedAsset} from "./types";
import type {ApplicationActionResult} from "@/lib/admin/applications-types";
const bucket="academy-assets";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const moment=(x:unknown):x is string=>typeof x==="string"&&x.length<=40&&Number.isFinite(Date.parse(x));
const field=(f:FormData,k:string):string|null=>{const a=f.getAll(k);return a.length===1&&typeof a[0]==="string"?a[0]:null;};
const kind=(x:unknown):x is AssetKind=>x==="resource"||x==="outcome";
const ext:Record<AssetType["mime"],AssetType["extension"]>={"application/pdf":"pdf","image/png":"png","image/jpeg":"jpg","image/webp":"webp"};
function mime(x:unknown):x is AssetType["mime"]{return typeof x==="string"&&Object.hasOwn(ext,x);}
function clientFor(flag:string){const config=getSupabaseAuthConfig(),key=process.env.SUPABASE_SECRET_KEY;if(process.env[flag]!=="true"||!config||!key?.startsWith("sb_secret_"))return null;const url=new URL(config.url);if(url.origin!=="https://uenvjqgylrevujdjpfed.supabase.co"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)return null;return createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{const response=await fetch(input,{...init,cache:"no-store"});const address=typeof input==="string"?input:input instanceof URL?input.href:input.url;const method=(init?.method??(input instanceof Request?input.method:"GET")).toUpperCase();return method==="GET"&&new URL(address).pathname.startsWith("/storage/v1/object/")?boundStorageResponse(response):response;}}});}
async function hasPrivateBucket(client:NonNullable<ReturnType<typeof clientFor>>){const {data,error}=await client.storage.getBucket(bucket);return !error&&data?.id===bucket&&data.name===bucket&&data.public===false;}
async function adminClient(){const identity=await getAdminIdentity();if(identity.access!=="allowed")return null;const client=clientFor("ACADEMY_ADMIN_ASSETS_ENABLED");return client?{actor:identity.userId,client}:null;}
function item(value:unknown):ManagedAsset|null{if(!value||typeof value!=="object")return null;const r=value as Record<string,unknown>;if(typeof r.id!=="string"||!uuid.test(r.id)||!kind(r.kind)||typeof r.title!=="string"||!r.title.trim()||Array.from(r.title).length>200||typeof r.description!=="string"||!r.description.trim()||Array.from(r.description).length>1000||!mime(r.mime)||(r.kind==="outcome"&&r.mime==="application/pdf")||!Number.isInteger(r.byte_size)||(r.byte_size as number)<1||(r.byte_size as number)>MAX_ASSET_BYTES||!moment(r.created_at)||typeof r.is_public!=="boolean"||!Number.isInteger(r.revision)||(r.revision as number)<1)return null;return {id:r.id,kind:r.kind,title:r.title,description:r.description,mime:r.mime,byteSize:r.byte_size as number,createdAt:r.created_at,isPublic:r.is_public,revision:r.revision as number};}
export async function listAdminAssets(form:FormData):Promise<ApplicationActionResult<AssetPage>>{try{const admin=await adminClient();if(!admin)return {ok:false,reason:"denied"};const at=field(form,"before_at"),id=field(form,"before_id");if(at===null||id===null||!((at===""&&id==="")||(moment(at)&&uuid.test(id))))return {ok:false,reason:"invalid"};const {data,error}=await admin.client.rpc("academy_admin_list_assets",{p_before_at:at||null,p_before_id:id||null,p_limit:21});if(error||!data||!Array.isArray(data.items)||data.items.length>21)return {ok:false,reason:"unavailable"};const parsed=data.items.map(item) as (ManagedAsset|null)[];if(parsed.some((x)=>!x))return {ok:false,reason:"unavailable"};const shown=(parsed as ManagedAsset[]).slice(0,20),last=shown.at(-1);return {ok:true,value:{items:shown,next:parsed.length>20&&last?{at:last.createdAt,id:last.id}:null}};}catch{return {ok:false,reason:"unavailable"};}}
export type UploadResult={status:"saved"|"invalid"|"denied"|"unknown"};
export async function uploadAdminAsset(form:FormData):Promise<UploadResult>{
 try{const admin=await adminClient();if(!admin)return {status:"denied"};const k=field(form,"kind"),rawTitle=field(form,"title"),rawDescription=field(form,"description"),files=form.getAll("file"),title=rawTitle?.trim(),description=rawDescription?.trim();
  if(!kind(k)||!title||Array.from(title).length>200||!description||Array.from(description).length>1000||files.length!==1||!(files[0] instanceof File)||files[0].size<1||files[0].size>MAX_ASSET_BYTES)return {status:"invalid"};
  const file=files[0],bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size)return {status:"invalid"};const type=inspectAsset(bytes,file.type,k);if(!type)return {status:"invalid"};
  if(!await hasPrivateBucket(admin.client))return {status:"denied"};
  const id=randomUUID(),key=`assets/${id}.${type.extension}`;
  const upload=await admin.client.storage.from(bucket).upload(key,bytes,{contentType:type.mime,upsert:false});if(upload.error)return {status:"unknown"};
  const {data,error}=await admin.client.rpc("academy_admin_add_asset",{p_id:id,p_kind:k,p_title:title,p_description:description,p_mime:type.mime,p_size:bytes.length,p_actor:admin.actor});
  if(error||!data||data.result!=="saved"||data.id!==id||data.revision!==1)return {status:"unknown"};return {status:"saved"};
 }catch{return {status:"unknown"};}
}
export async function updateAdminAsset(form:FormData):Promise<ApplicationActionResult<{revision:number}>>{try{const admin=await adminClient();if(!admin)return {ok:false,reason:"denied"};const id=field(form,"id"),rev=field(form,"revision"),rawTitle=field(form,"title"),rawDescription=field(form,"description"),visibility=form.getAll("is_public"),title=rawTitle?.trim(),description=rawDescription?.trim();if(!id||!uuid.test(id)||!rev||!/^\d+$/.test(rev)||Number(rev)<1||Number(rev)>2147483647||!title||Array.from(title).length>200||!description||Array.from(description).length>1000||visibility.length>1||(visibility.length===1&&visibility[0]!=="on"))return {ok:false,reason:"invalid"};if(visibility.length===1&&!await hasPrivateBucket(admin.client))return {ok:false,reason:"denied"};const {data,error}=await admin.client.rpc("academy_admin_update_asset",{p_id:id,p_revision:Number(rev),p_title:title,p_description:description,p_public:visibility.length===1,p_actor:admin.actor});if(error||!data||typeof data!=="object")return {ok:false,reason:"unavailable"};if(data.result==="conflict")return {ok:false,reason:"conflict"};if(data.result!=="saved"||data.id!==id||!Number.isInteger(data.revision)||data.revision!==Number(rev)+1)return {ok:false,reason:"unavailable"};return {ok:true,value:{revision:data.revision}};}catch{return {ok:false,reason:"unavailable"};}}
// The adapter is server-only and verifies the DB flag immediately before private-bucket download.
export async function downloadPublicAsset(id:string):Promise<{bytes:Uint8Array;mime:AssetType["mime"];extension:AssetType["extension"]}|null>{try{
 if(!uuid.test(id))return null;const client=clientFor("ACADEMY_PUBLIC_ASSETS_ENABLED");if(!client)return null;
 const {data,error}=await client.rpc("academy_public_asset_lookup",{p_id:id});if(error||!data||typeof data!=="object")return null;const row=data as Record<string,unknown>;
 if(row.id!==id||!kind(row.kind)||!mime(row.mime)||!Number.isInteger(row.byte_size)||(row.byte_size as number)<1||(row.byte_size as number)>MAX_ASSET_BYTES)return null;
 const key=`assets/${id}.${ext[row.mime]}`;if(row.object_key!==key||!await hasPrivateBucket(client))return null;const stored=await client.storage.from(bucket).download(key);if(stored.error||!stored.data||stored.data.size!==row.byte_size)return null;
 const bytes=new Uint8Array(await stored.data.arrayBuffer()),type=inspectAsset(bytes,row.mime,row.kind);if(!type||bytes.length!==row.byte_size)return null;return {bytes,mime:type.mime,extension:type.extension};
 }catch{return null;}}
export function parsePublicAsset(value:unknown):AssetItem|null{if(!value||typeof value!=="object")return null;const row=value as Record<string,unknown>;const parsed=item({...row,is_public:true,revision:1});if(!parsed)return null;return {id:parsed.id,kind:parsed.kind,title:parsed.title,description:parsed.description,mime:parsed.mime,byteSize:parsed.byteSize,createdAt:parsed.createdAt};}
