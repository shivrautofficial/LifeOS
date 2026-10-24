export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "personal" | "academic";
export type AcademicType = "assignment" | "project" | "exam" | "other";

export interface LifeTask {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  /** ISO calendar date (YYYY-MM-DD), interpreted in the user's local timezone. */
  dueDate: string;
  completed: boolean;
  createdAt: string;
  academicType?: AcademicType;
  subject?: string;
}

export type NewLifeTask = Omit<LifeTask, "id" | "createdAt" | "completed"> & {
  completed?: boolean;
};

export const TASK_STORAGE_KEY = "lifeos.tasks.v1";

export function isLifeTask(value: unknown): value is LifeTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<LifeTask>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (task.category === "personal" || task.category === "academic") &&
    (task.priority === "low" || task.priority === "medium" || task.priority === "high") &&
    typeof task.dueDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) &&
    typeof task.completed === "boolean" &&
    typeof task.createdAt === "string"
  );
}

export function createTask(input: NewLifeTask): LifeTask {
  return {
    ...input,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    completed: input.completed ?? false,
  };
}

/** Parse a YYYY-MM-DD string as a local date, avoiding UTC date shifts. */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatTaskDate(date: string): string {
  if (!date) return "No deadline";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalDate(date));
}

export function getDueStatus(
  task: Pick<LifeTask, "dueDate" | "completed">,
): "completed" | "overdue" | "today" | "upcoming" {
  if (task.completed) return "completed";
  const due = parseLocalDate(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "upcoming";
}
