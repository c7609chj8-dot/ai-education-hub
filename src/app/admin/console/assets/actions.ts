"use server";
import {revalidatePath} from "next/cache";
import {updateAdminAsset} from "@/lib/assets/server";
export type AssetState={error?:string;success?:string;unknown?:boolean}|null;
export async function updateAssetAction(form:FormData):Promise<AssetState>{
 const result=await updateAdminAsset(form);if(!result.ok){if(result.reason==="unavailable")return {error:"저장 결과를 확인하지 못했습니다. 입력을 보관하고 목록을 새로고침해 확인해 주세요.",unknown:true};return {error:result.reason==="conflict"?"다른 변경이 먼저 저장되었습니다. 입력을 보관하고 목록을 새로고침해 주세요.":"저장하지 못했습니다. 입력과 설정을 확인해 주세요."};}
 revalidatePath("/admin/console/assets");revalidatePath("/resources");revalidatePath("/outcomes");return {success:"자료 정보를 저장했습니다."};
}
