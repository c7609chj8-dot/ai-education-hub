"use server";
import { advanceAdminInquiry,readAdminInquiry,searchAdminInquiries } from "@/lib/admin/inquiries";
export async function searchInquiriesAction(form:FormData){return searchAdminInquiries(form);}
export async function readInquiryAction(form:FormData){return readAdminInquiry(form);}
export async function advanceInquiryAction(form:FormData){return advanceAdminInquiry(form);}
