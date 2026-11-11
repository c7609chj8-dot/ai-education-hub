import {getAdminIdentity} from "@/lib/admin/access";
import {readBoundedAssetForm} from "@/lib/assets/bounded-form";
import {uploadAdminAsset} from "@/lib/assets/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const headers={"cache-control":"private, no-store"};
 const identity=await getAdminIdentity();if(identity.access!=="allowed")return Response.json({status:"denied"},{status:403,headers});
 try{const origin=request.headers.get("origin"),host=request.headers.get("host");if(!origin||!host)throw Error("missing origin");const parsed=new URL(origin);if(parsed.origin!==origin||parsed.host!==host||parsed.protocol!==new URL(request.url).protocol)throw Error("origin mismatch");}catch{return Response.json({status:"denied"},{status:403,headers});}
 const form=await readBoundedAssetForm(request);if(!form)return Response.json({status:"invalid"},{status:400,headers});
 const result=await uploadAdminAsset(form);return Response.json(result,{status:result.status==="saved"?201:result.status==="invalid"?400:result.status==="denied"?403:503,headers});
}
