export type ScheduleStatus = "예정" | "모집중" | "마감임박" | "마감" | "종료" | "취소";

export type ScheduleOffering = {
  id: string;
  course: { id: string; slug: string; title: string };
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  capacity: number;
  enrolledCount: number | null;
  status: ScheduleStatus;
  demoApply: boolean;
};
