export type IntervalUnit = "day" | "month";
export type ChoreOutcomeStatus = "completed" | "skipped";
export type ChoreDisplayStatus = ChoreOutcomeStatus | "pending" | "notCompleted";

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
  startAssignee?: string;
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

export interface StoredChoreOutcome {
  status: ChoreOutcomeStatus;
  resolvedAt?: Date;
}

export interface StoredReminderMetadata {
  taskId: string;
  assigneeId: string;
  task?: string;
  assigneeName?: string;
}

export interface ChoreApiItem {
  reminderId: string;
  scheduleId: string;
  taskId: string;
  assigneeId: string;
  assigneeName: string;
  task: string;
  dueAt: string;
  dueBy: string;
  status: ChoreDisplayStatus;
  actionable: boolean;
}

export interface ChoreApiSnapshot {
  generatedAt: string;
  timezone: string;
  today: ChoreApiItem[];
  upcoming: ChoreApiItem[];
  history: ChoreApiItem[];
}

export interface ChoreApiIdentity {
  userId: string;
  displayName: string;
}
