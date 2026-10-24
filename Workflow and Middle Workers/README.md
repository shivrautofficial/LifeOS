# LifeOS — Productivity & Academic Management MVP

A local-first starter for the LifeOS hackathon project. It includes task management, an upcoming agenda, academic assignment/project/exam tracking, simple progress summaries, and browser-local persistence.

## Features

- Create, edit, complete, and delete tasks
- Priorities: low, medium, high
- Deadlines with overdue and due-today indicators
- Academic categories: assignment, project, exam, other
- Subject/course labels and progress by subject
- Agenda grouped by overdue, today, tomorrow, and date
- Dashboard summary of open/completed/overdue tasks
- Browser `localStorage` persistence across page refreshes
- Export your tasks as a JSON file
- Sample data for fast demos

## Requirements

- Node.js 20.9 or newer (Node 22 recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To create a production build:

```bash
npm run typecheck
npm run build
npm start
```

## File map

```text
app/
  globals.css             Tailwind base styles and global CSS
  layout.tsx              App metadata and root layout
  page.tsx                LifeOS dashboard and navigation
components/
  TaskManager.tsx         Create/edit/complete/delete task UI
  CalendarView.tsx        Simple upcoming agenda
  AcademicTracker.tsx     Academic progress and deadlines
lib/
  taskTypes.ts            Shared task model, date helpers, validation
  useTasks.ts             Shared localStorage state and actions
package.json
README.md
```

## Storage and privacy notes

This MVP stores tasks in the current browser profile under the key `lifeos.tasks.v1`. It does not send task data to an application API and has no account system or cloud synchronization. Data is not automatically shared across browsers/devices. Clearing browser site data can delete these tasks, so use **Export JSON** to keep a backup.

This is a browser-local MVP, not a complete security boundary. Anyone with access to the same unlocked browser profile may be able to access the data. For sensitive use, consider device-level security and a desktop build with an encrypted local database. Do not add analytics, remote AI APIs, or third-party integrations without reviewing their data flow and updating the privacy statement.

## Suggested smoke test

1. Open Task Manager and add an academic assignment with a subject and deadline.
2. Confirm it appears in Overview, Upcoming Agenda, and Academic Tracker.
3. Edit the task and change its deadline.
4. Mark it complete. Confirm progress updates.
5. Refresh the page and verify that the task remains.
6. Export JSON and check that it contains the task you created.
7. Try a past due date to confirm the overdue indicator appears.

## Team integration notes

- All views use `LifeTask` from `lib/taskTypes.ts`.
- `useTasks()` is the shared state/persistence hook for this standalone starter.
- If your team's main app already has a shared store or database, adapt `useTasks.ts` to use that source of truth rather than creating a second task store.
- Keep the calendar intentionally simple: it's an agenda, not a drag-and-drop calendar.

## License

MIT. See `LICENSE`.
