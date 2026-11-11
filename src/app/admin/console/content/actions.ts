"use server";
import {revalidatePath} from "next/cache";
import {saveAdminContent} from "@/lib/admin/content";
export type ContentState={error?:string;success?:string;unknown?:boolean}|null;
export async function saveContentAction(previous:ContentState,form:FormData):Promise<ContentState>{
 void previous;const result=await saveAdminContent(form);if(!result.ok){
  if(result.reason==="unavailable")return {error:"저장 결과를 확인하지 못했습니다. 작성 내용을 보관한 뒤 목록을 새로고침해 확인해 주세요.",unknown:true};
  return {error:result.reason==="conflict"?"다른 변경이 먼저 저장되었습니다. 목록을 새로고침한 뒤 다시 확인해 주세요.":"저장하지 못했습니다. 입력과 설정을 확인해 주세요."};
 }
 revalidatePath("/admin/console/content");revalidatePath("/news");revalidatePath("/faq");revalidatePath("/partnership");return {success:"콘텐츠를 저장했습니다."};
}
