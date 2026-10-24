import Dexie from "dexie";

export const db = new Dexie("LifeOSWellnessDB");

db.version(1).stores({
  moodEntries: "id, date, mood, createdAt",
  sleepEntries: "id, date, createdAt",
  activityEntries: "id, date, activityType, createdAt",
  habits: "id, name, frequency, isActive, createdAt",
  habitCompletions: "id, habitId, date, completed, [habitId+date]",
  goals: "id, title, status, deadline, createdAt"
});

export async function clearAllData() {
  await db.transaction(
    "rw",
    [
      db.moodEntries,
      db.sleepEntries,
      db.activityEntries,
      db.habits,
      db.habitCompletions,
      db.goals
    ],
    async () => {
      await Promise.all([
        db.moodEntries.clear(),
        db.sleepEntries.clear(),
        db.activityEntries.clear(),
        db.habits.clear(),
        db.habitCompletions.clear(),
        db.goals.clear()
      ]);
    }
  );
}
