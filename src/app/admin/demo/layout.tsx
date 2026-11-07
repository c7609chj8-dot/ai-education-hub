import type { ReactNode } from "react";
import { DemoProvider } from "./demo-state";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
