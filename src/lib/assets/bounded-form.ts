import "server-only";
import {MAX_ASSET_BYTES} from "./validation";
const MAX_BODY=MAX_ASSET_BYTES+65536;
export async function readBoundedAssetForm(request:Request):Promise<FormData|null>{
 try{const type=request.headers.get("content-type")??"",length=request.headers.get("content-length");
  if(!/^multipart\/form-data;\s*boundary=/i.test(type)||(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BODY))||!request.body)return null;
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>MAX_BODY){await reader.cancel();return null;}chunks.push(part.value);}
  const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  return await new Request("http://127.0.0.1/",{method:"POST",headers:{"content-type":type},body}).formData();
 }catch{return null;}
}
