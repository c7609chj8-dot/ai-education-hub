"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { courses, sampleOfferings } from "@/data/mock/courses";
import { demoApplications } from "@/data/mock/admin";
import { siteConfig } from "@/config/site";

export type Program = { id: string; slug: string; title: string; category: string; summary: string; weeksCount: number; durationHours: number | null; audience: string };
export type Offering = { id: string; courseId: string; startDate: string; location: string; status: string };
export type Application = { id: string; label: string; courseId: string; state: string };
export type BrandPreview = { name: string; slogan: string; contactNotice: string };
export const initialBrand: BrandPreview = { name: siteConfig.name, slogan: siteConfig.slogan, contactNotice: "연락처 추후 확정" };
type DemoState = {
  programs: Program[]; offerings: Offering[]; applications: Application[]; brand: BrandPreview;
  updateBrand: (brand: BrandPreview) => void;
  updateProgram: (item: Program) => void; updateOffering: (item: Offering) => void; updateApplication: (item: Application) => void;
};
const DemoContext = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [programs, setPrograms] = useState<Program[]>(() => courses.map(({ id, slug, title, category, summary, weeksCount, durationHours, audience }) => ({ id, slug, title, category, summary, weeksCount, durationHours, audience })));
  const [offerings, setOfferings] = useState<Offering[]>(() => sampleOfferings.map(({ id, course, startDate, location, status }) => ({ id, courseId: course.id, startDate, location, status })));
  const [applications, setApplications] = useState<Application[]>(() => demoApplications.map(item => ({ ...item })));
  const [brand, setBrand] = useState<BrandPreview>(() => ({ ...initialBrand }));
  return <DemoContext.Provider value={{ programs, offerings, applications, brand, updateBrand: setBrand,
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
