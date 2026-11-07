import "server-only";
import {cache} from "react";
import {connection} from "next/server";
import {siteConfig} from "@/config/site";
import {createPublishedDataClient} from "@/lib/courses";
import {getSupabaseAuthConfig} from "@/lib/supabase/config";
import {parseBrand,type Brand} from "./types";
const fallback:Brand={name:siteConfig.name,slogan:siteConfig.slogan,email:null,phone:null,address:null};
export const getPublicBrand=cache(async():Promise<{brand:Brand;status:"default"|"example"|"unavailable"}>=>{
 const source=process.env.ACADEMY_BRAND_SOURCE||"mock";
 if(source==="mock")return {brand:fallback,status:"default"};
 if(source!=="supabase")return {brand:fallback,status:"unavailable"};
 await connection();
 try{const config=getSupabaseAuthConfig();if(!config)throw Error();const url=new URL(config.url);if(url.origin!=="https://uenvjqgylrevujdjpfed.supabase.co"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)throw Error();
  const {data,error}=await createPublishedDataClient().from("published_brand_settings").select("name,slogan,email,phone,address").limit(2);
  if(error||!Array.isArray(data)||data.length>1)throw Error();
  if(data.length===0)return {brand:fallback,status:"default"};const brand=parseBrand(data[0]);if(!brand)throw Error();return {brand,status:"example"};
 }catch{return {brand:fallback,status:"unavailable"};}
});
