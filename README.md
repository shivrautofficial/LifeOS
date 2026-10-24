# LifeOS — One Life. One Dashboard.

A Unified, Privacy-First Personal Life Management System built with a modular, responsive frontend and local-first persistence.

## 🚀 Quick Start

The project includes a built-in, zero-dependency Node.js HTTP server. You can run it directly from either the root folder or the `Frontend` directory without needing external dependencies.

### Option 1: Run with npm

From the `Xoders` root folder:

```bash
npm start
```

or for development:

```bash
npm run dev
```

### Option 2: Run with Node.js directly

```bash
node server.js
```

### Option 3: Run from Frontend directory

```bash
cd Frontend
npm start
```

Once the server is running, open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📁 Project Structure

```text
Xoders/
├── Frontend/                 # LifeOS Single Page Web Application
│   ├── assets/               # SVG icons and visual assets
│   ├── css/                  # Design system tokens and styles
│   ├── js/                   # Modular client-side logic & state management
│   │   ├── app.js            # Main bootstrap entry point
│   │   ├── router.js         # Client-side hash router
│   │   ├── state.js          # Reactive local state store
│   │   ├── storage.js        # LocalStorage persistence & JSON export/import
│   │   ├── audio.js          # Ambient audio and UI sounds
│   │   ├── dashboard.js      # Dashboard widgets and telemetry
│   │   ├── tasks.js          # Task manager logic
│   │   ├── habits.js         # Habit tracking with streaks
│   │   ├── goals.js          # Goal milestones and progress
│   │   ├── projects.js       # Project workflows
│   │   ├── notes.js          # Markdown-ready notes
│   │   ├── calendar.js       # Upcoming agenda and events
│   │   └── settings.js       # User profile and theme settings
│   ├── pages/                # Modular HTML view templates
│   ├── index.html            # Main application shell
│   ├── package.json          # Frontend scripts
│   └── server.js             # Local static server
├── Workflow and Middle Workers/ # Reference components and types
├── package.json              # Root project package configuration
├── server.js                 # Zero-dependency local web server
└── README.md
```

---

## ✨ Features

- **Dashboard**: Unified hub with metrics, focus timer, active priorities, and recent activity.
- **Task Management**: Prioritized tasks with due dates, filtering, and completion statuses.
- **Calendar & Agenda**: Daily view of events and focus blocks.
- **Habit Tracker**: Daily habit check-ins with streaks and historical trends.
- **Goals & Projects**: Multi-stage progress tracking with target deadlines.
- **Notes**: Local note-taking with tagging and pinning.
- **Privacy-First**: All data is stored locally in your browser (`localStorage`) with full JSON export and restore support. Zero telemetry or external tracking.
- **Dark & Light Mode**: Built-in theme switcher with high-contrast accessibility tokens.
