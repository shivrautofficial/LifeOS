"use client";

import { useMemo, useState } from "react";
import { formatTaskDate, getDueStatus, LifeTask, parseLocalDate } from "../lib/taskTypes";

type CalendarViewProps = { tasks: LifeTask[]; onToggle: (id: string) => void };
type EventFilter = "all" | "academic" | "personal";

const buttonClass = "rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-indigo-500/20";

function dateGroup(task: LifeTask): string {
  const status = getDueStatus(task);
  if (status === "overdue") return "Overdue";
  if (status === "today") return "Today";
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = parseLocalDate(task.dueDate);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === tomorrow.getTime()) return "Tomorrow";
  return formatTaskDate(task.dueDate);
}

export default function CalendarView({ tasks, onToggle }: CalendarViewProps) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const activeEvents = useMemo(() => tasks
    .filter((task) => !task.completed)
    .filter((task) => filter === "all" || task.category === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [tasks, filter]);

  const groups = useMemo(() => {
    const result = new Map<string, LifeTask[]>();
    for (const task of activeEvents) {
      const label = dateGroup(task);
      const existing = result.get(label) ?? [];
      existing.push(task);
      result.set(label, existing);
    }
    // Overdue is shown first; the rest follows the due date order of the source array.
    return [...result.entries()].sort(([a], [b]) => {
      if (a === "Overdue") return -1;
      if (b === "Overdue") return 1;
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "Tomorrow") return -1;
      if (b === "Tomorrow") return 1;
      return (result.get(a)?.[0]?.dueDate ?? "").localeCompare(result.get(b)?.[0]?.dueDate ?? "");
    });
  }, [activeEvents]);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Plan ahead</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Upcoming agenda</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">A simple timeline of deadlines—no complicated calendar controls.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{activeEvents.length} open {activeEvents.length === 1 ? "item" : "items"}</p>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" aria-label="Filter agenda">
          {(["all", "academic", "personal"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`${buttonClass} capitalize ${filter === value ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"}`}>{value === "all" ? "Everything" : value}</button>)}
        </div>
      </div>

      {groups.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><p className="font-semibold text-slate-800 dark:text-slate-200">Your agenda is clear</p><p className="mt-1 text-sm text-slate-500">Add a task with a deadline and it will appear here.</p></div> :
        <div className="space-y-5">
          {groups.map(([label, items]) => <section key={label} aria-label={label}>
            <div className="mb-2 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${label === "Overdue" ? "bg-rose-500" : label === "Today" ? "bg-amber-500" : "bg-indigo-500"}`} /><h3 className={`text-sm font-bold ${label === "Overdue" ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}>{label}</h3><span className="text-xs text-slate-400">{items.length}</span></div>
            <div className="space-y-2 border-l border-slate-200 pl-4 dark:border-slate-800">
              {items.map((task) => <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start gap-3">
                  <input aria-label={`Mark ${task.title} complete`} type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} className="mt-1 h-4 w-4 accent-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTaskDate(task.dueDate)} · {task.category === "academic" ? `${task.subject ?? "Academic"} · ${task.academicType ?? "task"}` : "Personal"}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${task.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : task.priority === "medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}>{task.priority}</span>
                </div>
              </article>)}
            </div>
          </section>)}
        </div>}
    </section>
  );
}
