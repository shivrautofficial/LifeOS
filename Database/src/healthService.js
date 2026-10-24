import { db } from "./db.js";

function createId() {
  return crypto.randomUUID();
}

function getTimestamps() {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now
  };
}

// MOOD
export async function saveMood({ date, mood, note = "" }) {
  const existing = await db.moodEntries.where("date").equals(date).first();
  const timestamps = getTimestamps();

  const entry = {
    id: existing?.id ?? createId(),
    date,
    mood,
    note,
    createdAt: existing?.createdAt ?? timestamps.createdAt,
    updatedAt: timestamps.updatedAt
  };

  await db.moodEntries.put(entry);
  return entry;
}

export async function getMoodsByDate(date) {
  return db.moodEntries.where("date").equals(date).toArray();
}

// SLEEP
export async function saveSleep({ date, durationMinutes, notes = "" }) {
  const entry = {
    id: createId(),
    date,
    durationMinutes,
    notes,
    ...getTimestamps()
  };

  await db.sleepEntries.add(entry);
  return entry;
}

export async function getSleepByDate(date) {
  return db.sleepEntries.where("date").equals(date).toArray();
}

// ACTIVITY
export async function saveActivity({
  date,
  activityType,
  durationMinutes,
  notes = ""
}) {
  const entry = {
    id: createId(),
    date,
    activityType,
    durationMinutes,
    notes,
    createdAt: new Date().toISOString()
  };

  await db.activityEntries.add(entry);
  return entry;
}

export async function getActivitiesByDate(date) {
  return db.activityEntries.where("date").equals(date).toArray();
}

// HABITS
export async function createHabit({
  name,
  description = "",
  frequency = "daily"
}) {
  const habit = {
    id: createId(),
    name,
    description,
    frequency,
    createdAt: new Date().toISOString(),
    isActive: true
  };

  await db.habits.add(habit);
  return habit;
}

export async function getActiveHabits() {
  return (await db.habits.toArray()).filter((habit) => habit.isActive === true);
}

export async function setHabitCompletion({ habitId, date, completed }) {
  const existing = await db.habitCompletions
    .where("[habitId+date]")
    .equals([habitId, date])
    .first();

  const entry = {
    id: existing?.id ?? createId(),
    habitId,
    date,
    completed
  };

  await db.habitCompletions.put(entry);
  return entry;
}

// GOALS
export async function createGoal({
  title,
  description = "",
  targetValue,
  startDate,
  deadline
}) {
  const goal = {
    id: createId(),
    title,
    description,
    ...(targetValue !== undefined && { targetValue }),
    currentProgress: 0,
    ...(startDate && { startDate }),
    ...(deadline && { deadline }),
    status: "not_started",
    createdAt: new Date().toISOString()
  };

  await db.goals.add(goal);
  return goal;
}

export async function updateGoalProgress(id, currentProgress) {
  const goal = await db.goals.get(id);

  if (!goal) {
    throw new Error("Goal not found");
  }

  const updatedGoal = {
    ...goal,
    currentProgress,
    status:
      goal.targetValue !== undefined &&
      currentProgress >= goal.targetValue
        ? "completed"
        : "in_progress"
  };

  await db.goals.put(updatedGoal);
  return updatedGoal;
}

export async function getGoals() {
  return db.goals.toArray();
}
