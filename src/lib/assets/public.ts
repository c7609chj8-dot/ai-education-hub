import "server-only";
import {connection} from "next/server";
import {createPublishedDataClient,CourseDataUnavailable} from "@/lib/courses";
import {getSupabaseAuthConfig} from "@/lib/supabase/config";
import {parsePublicAsset} from "./server";
import type {AssetKind} from "./validation";
import type {AssetItem} from "./types";
export function assetSource():"mock"|"supabase"{const source=process.env.ACADEMY_ASSET_SOURCE||"mock";if(source!=="mock"&&source!=="supabase")throw new CourseDataUnavailable();return source;}
export async function listPublishedAssets(kind:AssetKind):Promise<AssetItem[]>{
 await connection();const config=getSupabaseAuthConfig();if(process.env.ACADEMY_PUBLIC_ASSETS_ENABLED!=="true"||!config||new URL(config.url).origin!=="https://uenvjqgylrevujdjpfed.supabase.co")throw new CourseDataUnavailable();
 const {data,error}=await createPublishedDataClient().from("published_assets").select("id,kind,title,description,mime,byte_size,created_at").eq("kind",kind).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(201);
 if(error||!Array.isArray(data)||data.length>200)throw new CourseDataUnavailable();const parsed=data.map((row:unknown)=>parsePublicAsset(row));if(parsed.some((row:AssetItem|null)=>!row||row.kind!==kind))throw new CourseDataUnavailable();return parsed as AssetItem[];
}
