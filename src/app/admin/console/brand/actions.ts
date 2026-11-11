"use server";
import {revalidatePath} from "next/cache";
import {saveAdminBrand} from "@/lib/brand/admin";
export type BrandState={error?:string;revision?:number;unknown?:boolean};
export async function saveBrandAction(form:FormData):Promise<BrandState>{
 const result=await saveAdminBrand(form);if(!result.ok){if(result.reason==="unavailable")return {error:"저장 결과를 확인하지 못했습니다. 입력을 보관하고 새로고침해 확인해 주세요.",unknown:true};return {error:result.reason==="conflict"?"다른 변경이 먼저 저장되었습니다. 입력을 보관하고 새로고침해 주세요.":"저장하지 못했습니다. 입력과 설정을 확인해 주세요."};}
 revalidatePath("/","layout");return {revision:result.value.revision};
}
