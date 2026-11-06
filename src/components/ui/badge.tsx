import type { ComponentPropsWithoutRef } from "react";

export function Badge({ className = "", ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={`inline-flex rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal-ink ${className}`.trimEnd()}
    />
  );
}
