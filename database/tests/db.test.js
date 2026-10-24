import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";

import { db } from "../src/db.js";
import {
  saveMood,
  saveSleep,
  saveActivity,
  createHabit,
  setHabitCompletion,
  createGoal,
  updateGoalProgress
} from "../src/healthService.js";
import { getWeeklyProgress } from "../src/weeklyProgress.js";

test("wellness records and weekly progress work", async () => {
  await db.delete();
  await db.open();

  const start = "2026-10-19";
  const end = "2026-10-25";

  await saveMood({ date: "2026-10-24", mood: "good" });
  await saveSleep({ date: "2026-10-24", durationMinutes: 480 });
  await saveSleep({ date: "2026-10-23", durationMinutes: 420 });

  await saveActivity({
    date: "2026-10-24",
    activityType: "Walking",
    durationMinutes: 30
  });

  const habit = await createHabit({ name: "Read daily" });
  await setHabitCompletion({
    habitId: habit.id,
    date: "2026-10-24",
    completed: true
  });

  const goal = await createGoal({
    title: "Read five books",
    targetValue: 5
  });
  await updateGoalProgress(goal.id, 2);

  const report = await getWeeklyProgress(start, end);

  assert.equal(report.moodCheckIns, 1);
  assert.equal(report.averageSleepMinutes, 450);
  assert.equal(report.totalExerciseMinutes, 30);
  assert.equal(report.activeHabits, 1);
  assert.equal(report.completedHabits, 1);
  assert.equal(report.totalHabitCheckIns, 1);
  assert.equal(report.goals.length, 1);
  assert.equal(report.goals[0].currentProgress, 2);

  await db.close();
});
