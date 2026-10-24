"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AcademicType,
  formatTaskDate,
  getDueStatus,
  LifeTask,
  NewLifeTask,
  TaskCategory,
  TaskPriority,
} from "../lib/taskTypes";

type TaskManagerProps = {
  tasks: LifeTask[];
  onAdd: (task: NewLifeTask) => void;
  onUpdate: (id: string, updates: Partial<Omit<LifeTask, "id" | "createdAt">>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  editTaskId?: string | null;
  onEditHandled?: () => void;
};

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const buttonClass = "rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-indigo-500/20";

export default function TaskManager({ tasks, onAdd, onUpdate, onToggle, onDelete, editTaskId, onEditHandled }: TaskManagerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("academic");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [academicType, setAcademicType] = useState<AcademicType>("assignment");
  const [subject, setSubject] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visibleTasks = useMemo(
    () => tasks
      .filter((task) => filter === "all" || (filter === "active" ? !task.completed : task.completed))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [tasks, filter],
  );

  function resetForm() {
    setTitle(""); setDescription(""); setCategory("academic"); setPriority("medium");
    setDueDate(""); setAcademicType("assignment"); setSubject(""); setEditingId(null); setError("");
  }

  function startEdit(task: LifeTask) {
    setEditingId(task.id); setTitle(task.title); setDescription(task.description ?? "");
    setCategory(task.category); setPriority(task.priority); setDueDate(task.dueDate);
    setAcademicType(task.academicType ?? "assignment"); setSubject(task.subject ?? ""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!editTaskId) return;
    const task = tasks.find((item) => item.id === editTaskId);
    if (!task) return;
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setAcademicType(task.academicType ?? "assignment");
    setSubject(task.subject ?? "");
    setError("");
    onEditHandled?.();
  }, [editTaskId, tasks, onEditHandled]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError("Enter a task title."); return; }
    if (!dueDate) { setError("Choose a deadline."); return; }
    if (category === "academic" && !subject.trim()) { setError("Add a subject for this academic task."); return; }

    const payload: NewLifeTask = {
      title: cleanTitle,
      description: description.trim() || undefined,
      category,
      priority,
      dueDate,
      academicType: category === "academic" ? academicType : undefined,
      subject: category === "academic" ? subject.trim() : undefined,
    };
    if (editingId) onUpdate(editingId, payload);
    else onAdd(payload);
    resetForm();
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Productivity</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Task manager</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Capture the work. Set the deadline. Finish what matters.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">{editingId ? "Edit task" : "Create a task"}</h3>
          {editingId && <button type="button" onClick={resetForm} className={`${buttonClass} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>Cancel edit</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">
            Task title *
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Submit calculus assignment" maxLength={140} required />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Category
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)}>
              <option value="academic">Academic</option><option value="personal">Personal</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Priority
            <select className={fieldClass} value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Deadline *
            <input className={fieldClass} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
          </label>
          {category === "academic" && <>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              Academic item type
              <select className={fieldClass} value={academicType} onChange={(event) => setAcademicType(event.target.value as AcademicType)}>
                <option value="assignment">Assignment</option><option value="project">Project</option><option value="exam">Exam</option><option value="other">Other</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              Subject / course *
              <input className={fieldClass} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Engineering Mathematics" maxLength={100} required />
            </label>
          </>}
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">
            Notes <span className="font-normal text-slate-400">(optional)</span>
            <textarea className={fieldClass} value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={1000} placeholder="What needs to be done?" />
          </label>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
        <div><button className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`} type="submit">{editingId ? "Save changes" : "Add task"}</button></div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Your tasks <span className="ml-1 text-sm font-normal text-slate-500">({tasks.length})</span></h3>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" aria-label="Filter tasks">
          {(["all", "active", "completed"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`${buttonClass} capitalize ${filter === value ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"}`}>{value}</button>)}
        </div>
      </div>

      <div className="space-y-3">
        {visibleTasks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><p className="font-semibold text-slate-800 dark:text-slate-200">Nothing here yet</p><p className="mt-1 text-sm text-slate-500">Add a task above to get your plan moving.</p></div> :
          visibleTasks.map((task) => {
            const status = getDueStatus(task);
            const priorityClass = task.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : task.priority === "medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
            return <article key={task.id} className={`rounded-2xl border p-4 transition ${task.completed ? "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50" : status === "overdue" ? "border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`}>
              <div className="flex items-start gap-3">
                <input aria-label={`Mark ${task.title} complete`} type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} className="mt-1 h-4 w-4 accent-indigo-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{task.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${priorityClass}`}>{task.priority}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{task.category}</span>
                  </div>
                  {task.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{task.description}</p>}
                  <p className={`mt-2 text-sm ${status === "overdue" ? "font-semibold text-rose-600 dark:text-rose-400" : status === "today" ? "font-semibold text-amber-700 dark:text-amber-300" : "text-slate-500"}`}>
                    {status === "overdue" ? "Overdue · " : status === "today" ? "Due today · " : status === "completed" ? "Completed · " : "Due · "}{formatTaskDate(task.dueDate)}
                    {task.category === "academic" && task.subject ? ` · ${task.subject}` : ""}
                    {task.category === "academic" && task.academicType ? ` · ${task.academicType}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button type="button" onClick={() => startEdit(task)} aria-label={`Edit ${task.title}`} className={`${buttonClass} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>Edit</button>
                  <button type="button" onClick={() => { if (window.confirm(`Delete "${task.title}"?`)) onDelete(task.id); }} aria-label={`Delete ${task.title}`} className={`${buttonClass} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950`}>Delete</button>
                </div>
              </div>
            </article>;
          })}
      </div>
    </section>
  );
}
