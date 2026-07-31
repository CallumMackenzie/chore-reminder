export type IntervalUnit = "day" | "month";

export interface PersonConfig {
  displayName: string;
  phone?: string;
}

export interface RotationItem {
  taskId: string;
  assignee: string;
  task: string;
}

export interface ScheduleConfig {
  id: string;
  startDate: string;
  reminderTime: string;
  interval: {
    every: number;
    unit: IntervalUnit;
  };
  dueWindow: {
    amount: number;
    unit: IntervalUnit;
  };
  messageTemplate?: string;
  rotation: RotationItem[];
}

export interface AppConfig {
  timezone: string;
  lookbackDays?: number;
  people: Record<string, PersonConfig>;
  schedules: ScheduleConfig[];
}

export interface Occurrence {
  reminderId: string;
  scheduleId: string;
  occurrenceIndex: number;
  taskId: string;
  assigneeId: string;
  assigneeName: string;
  phone?: string;
  task: string;
  dueAt: Date;
  dueBy: Date;
  message: string;
}
