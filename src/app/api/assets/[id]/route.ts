import {downloadPublicAsset} from "@/lib/assets/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const asset=await downloadPublicAsset(id);
 if(!asset)return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
 const body=new Uint8Array(asset.bytes);
 return new Response(body.buffer,{headers:{"content-type":asset.mime,"content-disposition":`attachment; filename="asset-${id}.${asset.extension}"`,"x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; sandbox","cache-control":"private, no-store"}});
}
