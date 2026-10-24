"use client";

import { useMemo, useState } from "react";
import { formatTaskDate, getDueStatus, LifeTask } from "../lib/taskTypes";

type AcademicTrackerProps = { tasks: LifeTask[]; onToggle: (id: string) => void; onEdit: (task: LifeTask) => void };

const filters = ["all", "assignment", "project", "exam", "other"] as const;
type AcademicFilter = (typeof filters)[number];

export default function AcademicTracker({ tasks, onToggle, onEdit }: AcademicTrackerProps) {
  const [filter, setFilter] = useState<AcademicFilter>("all");
  const academicTasks = useMemo(() => tasks.filter((task) => task.category === "academic"), [tasks]);
  const filteredTasks = useMemo(() => academicTasks
    .filter((task) => filter === "all" || (task.academicType ?? "other") === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [academicTasks, filter]);

  const completedCount = academicTasks.filter((task) => task.completed).length;
  const progress = academicTasks.length === 0 ? 0 : Math.round((completedCount / academicTasks.length) * 100);
  const overdueCount = academicTasks.filter((task) => getDueStatus(task) === "overdue").length;
  const upcomingExams = academicTasks.filter((task) => !task.completed && task.academicType === "exam").length;

  const subjects = useMemo(() => {
    const result = new Map<string, { total: number; done: number }>();
    academicTasks.forEach((task) => {
      const key = task.subject?.trim() || "Uncategorized";
      const entry = result.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (task.completed) entry.done += 1;
      result.set(key, entry);
    });
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [academicTasks]);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Study centre</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Academic tracker</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Keep assignments, projects and exams in one place.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Completion" value={`${progress}%`} detail={`${completedCount} of ${academicTasks.length} complete`} />
        <Metric label="Overdue" value={String(overdueCount)} detail="Needs attention" tone={overdueCount ? "rose" : "default"} />
        <Metric label="Upcoming exams" value={String(upcomingExams)} detail="Open exam deadlines" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 dark:text-white">Overall academic progress</h3><span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span></div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="Academic task completion" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>
        {subjects.length > 0 && <div className="mt-5 space-y-4"><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progress by subject</h4>{subjects.map(([subject, counts]) => {
          const percent = Math.round((counts.done / counts.total) * 100);
          return <div key={subject}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-700 dark:text-slate-300">{subject}</span><span className="shrink-0 text-slate-500">{counts.done}/{counts.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div></div>;
        })}</div>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Academic deadlines <span className="ml-1 text-sm font-normal text-slate-500">({academicTasks.length})</span></h3>
        <select aria-label="Filter academic tasks" value={filter} onChange={(event) => setFilter(event.target.value as AcademicFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{filters.map((value) => <option key={value} value={value}>{value === "all" ? "All types" : value}</option>)}</select>
      </div>

      {filteredTasks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><p className="font-semibold text-slate-800 dark:text-slate-200">No academic items yet</p><p className="mt-1 text-sm text-slate-500">Add an assignment, project or exam in the Task Manager tab.</p></div> :
        <div className="space-y-2">{filteredTasks.map((task) => {
          const status = getDueStatus(task);
          return <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start gap-3">
            <input aria-label={`Mark ${task.title} complete`} type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} className="mt-1 h-4 w-4 accent-indigo-600" />
            <div className="min-w-0 flex-1"><p className={`font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{task.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{task.subject} · {task.academicType} · {formatTaskDate(task.dueDate)}</p><p className={`mt-1 text-xs font-semibold ${status === "overdue" ? "text-rose-600 dark:text-rose-400" : status === "today" ? "text-amber-700 dark:text-amber-300" : "text-slate-400"}`}>{status === "overdue" ? "Overdue" : status === "today" ? "Due today" : status === "completed" ? "Completed" : "Upcoming"}</p></div>
            <button type="button" onClick={() => onEdit(task)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Edit</button>
          </div></article>;
        })}</div>}
    </section>
  );
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "rose" }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 text-3xl font-bold tracking-tight ${tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-950 dark:text-white"}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}
