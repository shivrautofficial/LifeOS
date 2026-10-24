import { db } from "./db.js";

export async function getWeeklyProgress(startDate, endDate) {
  const [moods, sleepEntries, activities, habits, completions, goals] =
    await Promise.all([
      db.moodEntries.where("date").between(startDate, endDate, true, true).toArray(),
      db.sleepEntries.where("date").between(startDate, endDate, true, true).toArray(),
      db.activityEntries.where("date").between(startDate, endDate, true, true).toArray(),
      db.habits.toArray(),
      db.habitCompletions.where("date").between(startDate, endDate, true, true).toArray(),
      db.goals.toArray()
    ]);

  const totalSleepMinutes = sleepEntries.reduce(
    (total, entry) => total + entry.durationMinutes,
    0
  );

  const totalExerciseMinutes = activities.reduce(
    (total, entry) => total + entry.durationMinutes,
    0
  );

  const completedHabits = completions.filter(
    (entry) => entry.completed
  ).length;

  const averageSleepMinutes = sleepEntries.length
    ? Math.round(totalSleepMinutes / sleepEntries.length)
    : 0;

  return {
    startDate,
    endDate,
    moodCheckIns: moods.length,
    averageSleepMinutes,
    totalExerciseMinutes,
    activeHabits: habits.filter((habit) => habit.isActive).length,
    completedHabits,
    totalHabitCheckIns: completions.length,
    goals: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      currentProgress: goal.currentProgress,
      targetValue: goal.targetValue,
      status: goal.status
    }))
  };
}
