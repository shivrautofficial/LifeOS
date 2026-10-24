"use client";

import { useMemo, useState } from "react";
import TaskManager from "../components/TaskManager";
import CalendarView from "../components/CalendarView";
import AcademicTracker from "../components/AcademicTracker";
import { useTasks } from "../lib/useTasks";
import { LifeTask, formatTaskDate, getDueStatus } from "../lib/taskTypes";

type Tab = "overview" | "tasks" | "calendar" | "academic";

export default function LifeOSPage() {
  const {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    loadSampleData,
    exportTasksJSON,
  } = useTasks();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Compute metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const open = total - completed;
    const overdue = tasks.filter((t) => !t.completed && getDueStatus(t) === "overdue").length;
    const today = tasks.filter((t) => !t.completed && getDueStatus(t) === "today").length;
    const academic = tasks.filter((t) => t.category === "academic");
    const academicCompleted = academic.filter((t) => t.completed).length;
    const academicOverdue = academic.filter((t) => !t.completed && getDueStatus(t) === "overdue").length;
    const exams = academic.filter((t) => !t.completed && t.academicType === "exam").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      open,
      overdue,
      today,
      academicCount: academic.length,
      academicCompleted,
      academicOverdue,
      exams,
      rate,
    };
  }, [tasks]);

  const recentUpcoming = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  const handleEditFromAcademic = (task: LifeTask) => {
    setEditingTaskId(task.id);
    setActiveTab("tasks");
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Loading LifeOS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 transition-colors duration-200 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${isDarkMode ? "dark" : ""}`}>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-950 dark:text-white text-base">LifeOS</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  MVP
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Productivity & Academic Management
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <nav className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "overview"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "tasks"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Tasks
              {metrics.open > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                  {metrics.open}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "calendar"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Agenda
              {metrics.overdue > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {metrics.overdue}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("academic")}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "academic"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Academic
              {metrics.exams > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {metrics.exams}
                </span>
              )}
            </button>
          </nav>

          {/* Quick utility controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportTasksJSON}
              title="Export tasks as JSON file"
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Export JSON
            </button>
            <button
              onClick={toggleDarkMode}
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Hero / Welcome */}
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:from-slate-900 dark:to-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Productivity Dashboard
                  </span>
                  <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    Welcome to LifeOS
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                    Your local-first academic & task dashboard. Stored securely in your browser profile, always fast and distraction-free.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                  >
                    + Add New Task
                  </button>
                  <button
                    onClick={loadSampleData}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Reset Demo Data
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Completion Rate</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{metrics.rate}%</p>
                  <span className="text-xs text-slate-500">{metrics.completed} of {metrics.total} done</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${metrics.rate}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overdue Tasks</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className={`text-3xl font-bold tracking-tight ${metrics.overdue > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-950 dark:text-white"}`}>
                    {metrics.overdue}
                  </p>
                  <span className="text-xs text-slate-500">Needs prompt action</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {metrics.overdue > 0 ? "Resolve past-due items in Agenda" : "No overdue tasks right now!"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Due Today</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {metrics.today}
                  </p>
                  <span className="text-xs text-slate-500">Active deadlines</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">Focus on what must get done before end of day</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Academic Focus</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                    {metrics.academicCount}
                  </p>
                  <span className="text-xs text-slate-500">{metrics.exams} upcoming exams</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {metrics.academicCompleted} assignments/projects completed
                </p>
              </div>
            </div>

            {/* Two column preview section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Upcoming Deadlines Widget */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Upcoming Deadlines</h3>
                    <p className="text-xs text-slate-500">Top urgent tasks needing your attention</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("calendar")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View All →
                  </button>
                </div>

                <div className="mt-4 space-y-2.5">
                  {recentUpcoming.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No open upcoming tasks!</p>
                  ) : (
                    recentUpcoming.map((task) => {
                      const status = getDueStatus(task);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id)}
                              className="h-4 w-4 accent-indigo-600"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {task.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatTaskDate(task.dueDate)} · {task.category === "academic" ? task.subject ?? "Academic" : "Personal"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              status === "overdue"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : status === "today"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="space-y-4">
                <div
                  onClick={() => setActiveTab("tasks")}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Task Manager</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Create, organize, prioritize, and manage tasks across personal and academic work.
                      </p>
                    </div>
                    <span className="text-lg">📋</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("academic")}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Academic Tracker</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Track assignments, projects, exams, and completion rate breakdown by subject.
                      </p>
                    </div>
                    <span className="text-lg">🎓</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("calendar")}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Upcoming Agenda</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Clean chronological timeline grouped by Overdue, Today, Tomorrow, and upcoming dates.
                      </p>
                    </div>
                    <span className="text-lg">📅</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <TaskManager
              tasks={tasks}
              onAdd={addTask}
              onUpdate={updateTask}
              onToggle={toggleTask}
              onDelete={deleteTask}
              editTaskId={editingTaskId}
              onEditHandled={() => setEditingTaskId(null)}
            />
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CalendarView tasks={tasks} onToggle={toggleTask} />
          </div>
        )}

        {activeTab === "academic" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <AcademicTracker
              tasks={tasks}
              onToggle={toggleTask}
              onEdit={handleEditFromAcademic}
            />
          </div>
        )}
      </main>
    </div>
  );
}
