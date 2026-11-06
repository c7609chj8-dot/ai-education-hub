import type { ComponentPropsWithoutRef } from "react";

export function Card({ className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={`rounded-card border border-line bg-surface p-6 sm:p-10 ${className}`.trimEnd()}
    />
  );
}
