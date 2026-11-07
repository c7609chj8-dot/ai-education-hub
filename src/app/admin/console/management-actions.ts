"use server";

import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/admin/access";
import { saveCourse, saveOffering } from "@/lib/admin/management";
import { parseCourseForm, parseOfferingForm } from "@/lib/admin/management-validation";

export type ActionState = { error?: string; success?: string; unknown?: boolean } | null;

export async function submitCourse(previous: ActionState, form: FormData): Promise<ActionState> {
  void previous;
  if (await getAdminAccess() !== "allowed") return { error: "접근 권한이 없습니다." };
  const parsed = parseCourseForm(form);
  if (!parsed.ok) return { error: parsed.error };
  if (!(await saveCourse(parsed.value))) return { error: "저장 결과를 확인하지 못했습니다. 입력을 보관하고 목록에서 확인해 주세요.", unknown: true };
  revalidatePath("/admin/console/courses");
  revalidatePath("/programs");
  revalidatePath("/");
  return { success: "강좌를 저장했습니다." };
}

export async function submitOffering(previous: ActionState, form: FormData): Promise<ActionState> {
  void previous;
  if (await getAdminAccess() !== "allowed") return { error: "접근 권한이 없습니다." };
  const parsed = parseOfferingForm(form);
  if (!parsed.ok) return { error: parsed.error };
  if (!(await saveOffering(parsed.value))) return { error: "저장 결과를 확인하지 못했습니다. 입력을 보관하고 목록에서 확인해 주세요.", unknown: true };
  revalidatePath("/admin/console/offerings");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { success: "기수를 저장했습니다." };
}
