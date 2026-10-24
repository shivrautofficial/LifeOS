# LifeOS Wellness Database

A JavaScript database module for the LifeOS Health, Habits & Personal Goals feature.

## Technology

- Dexie.js
- IndexedDB
- JSON Schema documentation
- Node.js test runner
- fake-indexeddb for automated tests

## Data Tables

| Table | Purpose |
|---|---|
| moodEntries | Daily mood check-ins |
| sleepEntries | Sleep duration and notes |
| activityEntries | Exercise and activity logs |
| habits | User-created habits |
| habitCompletions | Daily habit completion |
| goals | Personal goals and progress |

## Project Structure

```text
Database/
├── package.json
├── README.md
├── schemas/
│   ├── mood.schema.json
│   ├── sleep.schema.json
│   ├── activity.schema.json
│   ├── habit.schema.json
│   ├── habit-completion.schema.json
│   └── goal.schema.json
├── src/
│   ├── db.js
│   ├── healthService.js
│   └── weeklyProgress.js
└── tests/
    └── db.test.js
```

## Installation

From this directory:

```bash
npm install
```

## Run Tests

```bash
npm test
```

## Available Operations

Import functions from `src/healthService.js` to save or retrieve:

- Mood check-ins
- Sleep records
- Activity records
- Habits and completions
- Personal goals and progress

Import `getWeeklyProgress` from `src/weeklyProgress.js` to calculate a summary for a date range.

Example:

```javascript
import { getWeeklyProgress } from "./src/weeklyProgress.js";

const report = await getWeeklyProgress(
  "2026-10-19",
  "2026-10-25"
);

console.log(report);
```

## Important Notes

- IndexedDB stores data in the browser.
- JSON Schema files document the expected record structure; they do not automatically validate database writes.
- Weekly summaries are calculated from saved records.
- The database module must be integrated with the main LifeOS app before the app's UI can use it.
- Test records are isolated using fake-indexeddb.
