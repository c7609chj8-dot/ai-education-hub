import type { Offering } from "@/data/mock/courses";

export function canDemoApply(offering: Offering) {
  return (offering.status === "모집중" || offering.status === "마감임박")
    && offering.enrolledCount < offering.capacity;
}
