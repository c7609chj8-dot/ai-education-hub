"use server";
import {readActivity} from "@/lib/admin/activity";
export async function readActivityAction(form:FormData){return readActivity(form);}
