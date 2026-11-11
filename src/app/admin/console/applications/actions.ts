"use server";
import { reviewAdminApplication, searchAdminApplications } from "@/lib/admin/applications";

// Each data operation independently checks the verified administrator identity.
export async function searchApplicationsAction(form: FormData) { return searchAdminApplications(form); }
export async function reviewApplicationAction(form: FormData) { return reviewAdminApplication(form); }
