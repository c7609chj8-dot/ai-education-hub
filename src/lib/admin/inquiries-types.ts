import type { ApplicationCursor } from "./applications-types";
export type InquiryStatus = "received" | "in_progress" | "completed";
export type InquiryCategory = "course" | "partnership" | "other";
export type InquiryItem = { id: string; category: InquiryCategory; status: InquiryStatus; createdAt: string; maskedName: string; lastChangeAt: string | null; lastActorId: string | null };
export type InquiryPage = { items: InquiryItem[]; next: ApplicationCursor | null };
export type InquiryDetail = { id: string; category: InquiryCategory; status: InquiryStatus; createdAt: string; name: string; email: string; message: string };
export type InquiryTransition = { status: "in_progress" | "completed"; changedAt: string; actorId: string };
