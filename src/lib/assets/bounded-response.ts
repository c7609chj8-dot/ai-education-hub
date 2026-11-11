import "server-only";
import {MAX_ASSET_BYTES} from "./validation";
// Limit downloaded Storage bytes before the SDK buffers them into a Blob.
export function boundStorageResponse(response:Response):Response{
 const length=response.headers.get("content-length");if(length&&/^\d+$/.test(length)&&Number(length)>MAX_ASSET_BYTES){void response.body?.cancel().catch(()=>{});throw new Error("Asset response too large");}
 if(!response.body)return response;
 const reader=response.body.getReader();let total=0;
 const body=new ReadableStream<Uint8Array>({async pull(controller){try{const chunk=await reader.read();if(chunk.done){controller.close();return;}total+=chunk.value.byteLength;if(total>MAX_ASSET_BYTES){await reader.cancel();controller.error(new Error("Asset response too large"));return;}controller.enqueue(chunk.value);}catch(error){controller.error(error);}},cancel(){return reader.cancel();}});
 return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
}
