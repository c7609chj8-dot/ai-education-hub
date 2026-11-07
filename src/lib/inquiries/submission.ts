import "server-only";
import type { SubmissionResult } from "@/lib/applications/submission-types";
export type InquiryCandidate = { category: "course" | "partnership" | "other"; name: string; email: string; message: string; noticeVersion: string };
export type InquiryDependencies = { activeNoticeVersion: string | null; commit: (candidate: InquiryCandidate, requestId: string) => Promise<unknown> };
const requestId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const notice = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const field = (form: FormData,key: string): string | null => { const values=form.getAll(key); return values.length===1 && typeof values[0]==="string" ? values[0] : null; };

// No public adapter or route is connected. All dependencies must be trusted server values.
export async function submitInquiry(form: FormData, deps: InquiryDependencies): Promise<SubmissionResult> {
  const id=field(form,"request_id"),category=field(form,"category"),rawName=field(form,"name"),rawEmail=field(form,"email"),rawMessage=field(form,"message"),version=field(form,"notice_version"),consent=field(form,"consent");
  const name=rawName?.trim(),email=rawEmail?.trim(),message=rawMessage?.trim();
  if (!id || !requestId.test(id) || (category!=="course" && category!=="partnership" && category!=="other") ||
      !name || Array.from(name).length>100 || /[\p{Cc}\p{Cf}]/u.test(name) ||
      !email || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !message || Array.from(message).length>2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message) ||
      !deps.activeNoticeVersion || !notice.test(deps.activeNoticeVersion) || version!==deps.activeNoticeVersion || consent!=="on") return {status:"invalid"};
  try {
    const result=await deps.commit({category,name,email,message,noticeVersion:deps.activeNoticeVersion},id);
    if(result==="accepted"||result==="unavailable")return {status:result};
    return {status:"unknown"};
  } catch { return {status:"unknown"}; }
}
