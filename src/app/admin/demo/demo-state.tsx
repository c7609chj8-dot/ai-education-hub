"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { courses, sampleOfferings } from "@/data/mock/courses";
import { demoApplications } from "@/data/mock/admin";

export type Program = { id: string; slug: string; title: string; category: string; summary: string; weeksCount: number; durationHours: number; audience: string };
export type Offering = { id: string; courseId: string; startDate: string; location: string; status: string };
export type Application = { id: string; label: string; courseId: string; state: string };
type DemoState = {
  programs: Program[]; offerings: Offering[]; applications: Application[];
  updateProgram: (item: Program) => void; updateOffering: (item: Offering) => void; updateApplication: (item: Application) => void;
};
const DemoContext = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [programs, setPrograms] = useState<Program[]>(() => courses.map(({ id, slug, title, category, summary, weeksCount, durationHours, audience }) => ({ id, slug, title, category, summary, weeksCount, durationHours, audience })));
  const [offerings, setOfferings] = useState<Offering[]>(() => sampleOfferings.map(({ id, course, startDate, location, status }) => ({ id, courseId: course.id, startDate, location, status })));
  const [applications, setApplications] = useState<Application[]>(() => demoApplications.map(item => ({ ...item })));
  return <DemoContext.Provider value={{ programs, offerings, applications,
    updateProgram: item => setPrograms(previous => previous.map(row => row.id === item.id ? item : row)),
    updateOffering: item => setOfferings(previous => previous.map(row => row.id === item.id ? item : row)),
    updateApplication: item => setApplications(previous => previous.map(row => row.id === item.id ? item : row)),
  }}>{children}</DemoContext.Provider>;
}
export function useDemo() {
  const state = useContext(DemoContext);
  if (!state) throw new Error("DemoProvider is missing");
  return state;
}
