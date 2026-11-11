import "server-only";
import { connection } from "next/server";
import { createPublishedDataClient,CourseDataUnavailable } from "@/lib/courses";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import type {ContentItem,ContentKind,ContentLinkPath} from "./types";
export function contentSource():"mock"|"supabase" {const source=process.env.ACADEMY_CONTENT_SOURCE||"mock";if(source!=="mock"&&source!=="supabase")throw new CourseDataUnavailable();return source;}
function date(value:unknown):value is string|null {if(value===null)return true;if(typeof value!=="string"||!/^\d{4}-\d\d-\d\d$/.test(value))return false;const parsed=new Date(`${value}T00:00:00Z`);return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;}
export function parsePublicContent(value:unknown,kind:ContentKind):ContentItem|null{
 if(!value||typeof value!=="object")return null;const row=value as Record<string,unknown>;
 const linkValid=(row.link_path===null&&row.link_label===null)||(kind==="faq"&&typeof row.link_path==="string"&&["/programs","/schedule","/partnership","/contact"].includes(row.link_path)&&typeof row.link_label==="string"&&!!row.link_label.trim()&&Array.from(row.link_label).length<=50);
 if(!linkValid||typeof row.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)||row.kind!==kind||typeof row.category!=="string"||!row.category.trim()||Array.from(row.category).length>100||typeof row.title!=="string"||!row.title.trim()||Array.from(row.title).length>200||typeof row.body!=="string"||!row.body.trim()||Array.from(row.body).length>4000||!date(row.display_date)||!Number.isInteger(row.sort_order)||(row.sort_order as number)<0||(row.sort_order as number)>100000)return null;
 return {id:row.id,kind,category:row.category,title:row.title,body:row.body,linkPath:row.link_path as ContentLinkPath|null,linkLabel:row.link_label as string|null,displayDate:row.display_date,sortOrder:row.sort_order as number};
}
export async function listPublishedContent(kind:ContentKind):Promise<{items:ContentItem[];example:boolean}>{
 await connection();const config=getSupabaseAuthConfig();if(!config||new URL(config.url).origin!=="https://uenvjqgylrevujdjpfed.supabase.co")throw new CourseDataUnavailable();
 const {data,error}=await createPublishedDataClient().from("published_contents").select("id,kind,category,title,body,link_path,link_label,display_date,sort_order").eq("kind",kind).order("sort_order").order("id").limit(201);
 if(error||!Array.isArray(data)||data.length>200)throw new CourseDataUnavailable();const parsed=data.map((row:unknown)=>parsePublicContent(row,kind));if(parsed.some((row:ContentItem|null)=>!row))throw new CourseDataUnavailable();
 // This adapter is pinned to the development project; its content is always labeled as a demo.
 return {items:parsed as ContentItem[],example:true};
}
