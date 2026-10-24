"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LifeTask,
  NewLifeTask,
  TASK_STORAGE_KEY,
  createTask,
  isLifeTask,
} from "./taskTypes";

function getIsoDate(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialSampleTasks(): LifeTask[] {
  return [
    {
      id: "sample-1",
      title: "Submit Calculus III Problem Set 4",
      description: "Complete problems 12 to 24 on multiple integrals and Green's Theorem.",
      category: "academic",
      priority: "high",
      dueDate: getIsoDate(-1), // Overdue
      completed: false,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      academicType: "assignment",
      subject: "Mathematics",
    },
    {
      id: "sample-2",
      title: "Physics Lab Report: Optics & Diffraction",
      description: "Analyze interferometer data and include uncertainty propagation tables.",
      category: "academic",
      priority: "medium",
      dueDate: getIsoDate(0), // Due today
      completed: false,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      academicType: "assignment",
      subject: "Physics",
    },
    {
      id: "sample-3",
      title: "Midterm Exam: Data Structures & Algorithms",
      description: "Review graph traversal, Dijkstra, balanced BSTs, and dynamic programming.",
      category: "academic",
      priority: "high",
      dueDate: getIsoDate(1), // Tomorrow
      completed: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      academicType: "exam",
      subject: "Computer Science",
    },
    {
      id: "sample-4",
      title: "LifeOS MVP Team Presentation & Demo",
      description: "Prepare slides, test local persistence, and rehearse presentation flow.",
      category: "academic",
      priority: "high",
      dueDate: getIsoDate(3),
      completed: false,
      createdAt: new Date().toISOString(),
      academicType: "project",
      subject: "Software Engineering",
    },
    {
      id: "sample-5",
      title: "Weekly Grocery & Meal Prep",
      description: "Stock up on fresh fruits, oats, vegetables, and snacks for hackathon week.",
      category: "personal",
      priority: "medium",
      dueDate: getIsoDate(0),
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "sample-6",
      title: "Schedule Routine Dental Cleaning",
      description: "Call campus health clinic to confirm appointment slot.",
      category: "personal",
      priority: "low",
      dueDate: getIsoDate(4),
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "sample-7",
      title: "Read Chapter 4: Virtual Memory Management",
      description: "Paging, segmentation, and page replacement policies.",
      category: "academic",
      priority: "low",
      dueDate: getIsoDate(-2),
      completed: true,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      academicType: "assignment",
      subject: "Computer Science",
    },
  ];
}

function persistToStorage(tasks: LifeTask[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks to localStorage:", error);
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TASK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isLifeTask);
          if (valid.length > 0) {
            setTasks(valid);
            setIsLoaded(true);
            return;
          }
        }
      }
      // If empty or invalid, initialize with demo tasks
      const initial = createInitialSampleTasks();
      setTasks(initial);
      persistToStorage(initial);
    } catch (e) {
      console.warn("Could not load tasks from localStorage, initializing samples:", e);
      const initial = createInitialSampleTasks();
      setTasks(initial);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addTask = useCallback((input: NewLifeTask): LifeTask => {
    const newTask = createTask(input);
    setTasks((prev) => {
      const updated = [newTask, ...prev];
      persistToStorage(updated);
      return updated;
    });
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Omit<LifeTask, "id" | "createdAt">>) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      persistToStorage(updated);
      return updated;
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      persistToStorage(updated);
      return updated;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      persistToStorage(updated);
      return updated;
    });
  }, []);

  const loadSampleData = useCallback(() => {
    const samples = createInitialSampleTasks();
    setTasks(samples);
    persistToStorage(samples);
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    persistToStorage([]);
  }, []);

  const exportTasksJSON = useCallback(() => {
    try {
      const dataStr = JSON.stringify(tasks, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeos-tasks-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export tasks JSON:", error);
    }
  }, [tasks]);

  const importTasksJSON = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) return false;
      const valid = parsed.filter(isLifeTask);
      if (valid.length === 0) return false;
      setTasks(valid);
      persistToStorage(valid);
      return true;
    } catch (e) {
      console.error("Failed to import tasks:", e);
      return false;
    }
  }, []);

  return {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    loadSampleData,
    clearTasks,
    exportTasksJSON,
    importTasksJSON,
  };
}
