export type ItemStatus = 'inbox' | 'scheduled';
export type ItemType = 'event' | 'task';
export type AssigneeValue = string | 'both' | 'whoever';
export type TaskTargetPeriod = 'week' | 'month' | 'six_months' | 'year';

export interface CalendarItem {
  itemId: string;
  status: ItemStatus;
  type: ItemType | null;
  title: string;
  assignee: AssigneeValue | null;
  startAt: Date | null;
  dueAt: Date | null;
  targetPeriod: TaskTargetPeriod | null;
  memo: string;
  isCompleted: boolean;
  recurrence: null;
  createdBy: string;
  inputDurationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TITLE_MAX_LENGTH = 200;
export const MEMO_MAX_LENGTH = 1000;

export type InboxItemDraft = {
  title: string;
  createdBy: string;
  inputDurationMs: number | null;
};

export type ScheduledEventDraft = {
  type: 'event';
  title: string;
  assignee: AssigneeValue;
  startAt: Date;
  memo?: string;
};

export type ScheduledTaskDraft = {
  type: 'task';
  title: string;
  assignee: AssigneeValue;
  dueAt: Date | null;
  targetPeriod: TaskTargetPeriod | null;
  memo?: string;
};

export type ScheduledItemDraft = ScheduledEventDraft | ScheduledTaskDraft;
