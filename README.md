# LifeOS — One Life. One Dashboard.

A Unified, Privacy-First Personal Life Management System built with a modular, responsive frontend and local-first persistence.

---

## 📁 Repository Structure

```text
Xoders/
├── Database/                 # IndexedDB Wellness, Habits & Goal Models
│   ├── schemas/              # JSON Schemas (activity, goal, habit, mood, sleep)
│   ├── src/                  # Database logic & health services (Dexie.js)
│   ├── tests/                # Automated Node.js unit tests
│   ├── package.json
│   └── README.md
├── Frontend/                 # LifeOS Single Page Web Application
│   ├── assets/               # SVG icons and visual assets
│   ├── css/                  # Design system tokens and styles
│   ├── js/                   # Modular client-side logic & state management
│   ├── pages/                # Modular HTML view templates
│   ├── index.html            # Main application shell
│   ├── package.json          # Frontend scripts
│   └── server.js             # Standalone local runner
├── Server/                   # Node.js HTTP & REST API Service
│   ├── package.json
│   └── server.js             # Zero-dependency HTTP and API server
├── Workflow/                 # Productivity & Academic Tracker Component
│   ├── app/                  # Application layout and styling
│   ├── components/           # UI components (TaskManager, AcademicTracker, CalendarView)
│   ├── lib/                  # Shared state hooks and TypeScript types
│   ├── index.html            # Standalone runner
│   ├── package.json
│   ├── server.js             # Dedicated workflow runner (port 3001)
│   └── README.md
├── .dockerignore              # Docker build exclusions
├── .gitignore                # Git repository exclusions
├── Dockerfile                # Production container deployment
├── LICENSE                   # GNU General Public License v3.0
├── package.json              # Root project package configuration
├── Procfile                  # PaaS deployment entry point (Heroku, Render)
├── README.md                 # Project documentation
├── render.yaml               # Render cloud deployment configuration
├── server.js                 # Unified production entry point
└── vercel.json               # Vercel deployment configuration
```

---

## 🚀 Quick Start

The project includes a built-in, zero-dependency Node.js HTTP server. You can run it directly from the root folder without needing external dependencies.

### Option 1: Run with npm

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

Once running, open [http://localhost:3000](http://localhost:3000) in your web browser.

### Option 3: Run Workflow & Academic Tracker MVP

```bash
npm run workflow
# or: cd Workflow && npm start
```

Access the standalone Academic Management tool on [http://localhost:3001](http://localhost:3001).

---

## 🧪 Testing

Run automated tests for the wellness database module:

```bash
npm test
```

---

## 🚢 Deployment

### Deploy with Docker

```bash
# Build the container
docker build -t lifeos .

# Run the container
docker run -p 3000:3000 lifeos
```

### Deploy to Vercel

The included `vercel.json` automatically configures Vercel to serve the `Frontend` Single Page Application. Import the repository in your Vercel dashboard and click **Deploy**.

### Deploy to Render

The repository includes a ready-to-use `render.yaml` blueprint. Connect your Git repository to Render and create a Web Service using the existing blueprint.

---

## ✨ Features

- **Dashboard**: Unified hub with metrics, focus timer, active priorities, and recent activity.
- **Task Management**: Prioritized tasks with due dates, filtering, and completion statuses.
- **Calendar & Agenda**: Daily view of events and focus blocks.
- **Habit Tracker**: Daily habit check-ins with streaks and historical trends.
- **Goals & Projects**: Multi-stage progress tracking with target deadlines.
- **Notes**: Local note-taking with tagging and pinning.
- **Privacy-First**: All data is stored locally in your browser (`localStorage` & `IndexedDB`) with full JSON export and restore support. Zero telemetry.
- **Dark & Light Mode**: Built-in theme switcher with high-contrast accessibility tokens.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
