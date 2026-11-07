import "server-only";

// Early rejection only; signatures do not prove a file is harmless or fully decodable.
export const MAX_ASSET_BYTES=2*1024*1024;
export type AssetKind="resource"|"outcome";
export type AssetType={mime:"application/pdf"|"image/png"|"image/jpeg"|"image/webp";extension:"pdf"|"png"|"jpg"|"webp"};
const bytesAt=(data:Uint8Array,offset:number,values:number[])=>values.every((v,index)=>data[offset+index]===v);
const uint32be=(data:Uint8Array,offset:number)=>((data[offset]*0x1000000)+(data[offset+1]<<16)+(data[offset+2]<<8)+data[offset+3])>>>0;
const uint32le=(data:Uint8Array,offset:number)=>(data[offset]+(data[offset+1]<<8)+(data[offset+2]<<16)+(data[offset+3]*0x1000000))>>>0;
export function inspectAsset(data:Uint8Array,declaredMime:string,kind:AssetKind):AssetType|null{
 if(!(data instanceof Uint8Array)||data.length===0||data.length>MAX_ASSET_BYTES||(kind!=="resource"&&kind!=="outcome"))return null;
 if(kind==="resource"&&declaredMime==="application/pdf"&&data.length>=14&&bytesAt(data,0,[37,80,68,70,45])&&new TextDecoder().decode(data.slice(Math.max(0,data.length-1024))).includes("%%EOF"))return {mime:"application/pdf",extension:"pdf"};
 if(declaredMime==="image/png"&&data.length>=45&&bytesAt(data,0,[137,80,78,71,13,10,26,10])&&uint32be(data,8)===13&&bytesAt(data,12,[73,72,68,82])&&bytesAt(data,data.length-8,[73,69,78,68])){
  const width=uint32be(data,16),height=uint32be(data,20);if(width>0&&height>0&&width<=8192&&height<=8192&&width*height<=20000000)return {mime:"image/png",extension:"png"};
 }
 if(declaredMime==="image/jpeg"&&data.length>=12&&bytesAt(data,0,[255,216,255])&&bytesAt(data,data.length-2,[255,217]))return {mime:"image/jpeg",extension:"jpg"};
 if(declaredMime==="image/webp"&&data.length>=20&&bytesAt(data,0,[82,73,70,70])&&uint32le(data,4)+8===data.length&&bytesAt(data,8,[87,69,66,80])&&(bytesAt(data,12,[86,80,56,32])||bytesAt(data,12,[86,80,56,76])||bytesAt(data,12,[86,80,56,88])))return {mime:"image/webp",extension:"webp"};
 return null;
}
