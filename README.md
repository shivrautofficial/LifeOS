# LifeOS — One Life. One Dashboard.

A Unified, Privacy-First Personal Life Management System built with modern Vanilla HTML5, CSS3, ES6+ JavaScript, and local-first persistence. Fully optimized for zero-config deployment on **Vercel** (`.vercel.app`).

---

## 📁 Repository Structure

The project has been organized with a clean, modular structure where all logic, styles, pages, assets, services, and schemas reside in dedicated folders rather than being scattered in open space:

```text
LifeOS/
├── api/                      # Vercel Serverless Functions
│   └── health.js             # Telemetry & API health endpoint
├── assets/                   # SVG icons and visual brand assets
├── css/                      # Design system tokens and styles
│   ├── base.css              # Typography, reset, animations & scrollbars
│   ├── components.css        # Cards, modals, buttons, badges, tables
│   ├── dashboard.css         # Bento grid layout and widget styles
│   ├── layout.css            # Sidebar, topbar, mobile nav, page view shells
│   ├── responsive.css        # Mobile & tablet media queries
│   └── variables.css         # HSL color palettes (dark & light mode tokens)
├── database/                 # IndexedDB Wellness, Habits & Goal Models
│   ├── schemas/              # JSON Schemas (activity, goal, habit, mood, sleep)
│   ├── src/                  # Database logic & health services (Dexie.js)
│   ├── tests/                # Automated Node.js unit tests
│   ├── package.json
│   └── README.md
├── docs/                     # Architectural & design system specifications
│   └── FRONTEND_CONTEXT.md   # Design tokens, color system, and UI architecture
├── js/                       # Modular client-side logic & state management
│   ├── app.js                # Application bootstrapper
│   ├── audio.js              # Web Audio sound engine (earcons & alerts)
│   ├── calendar.js           # Calendar & scheduling controller
│   ├── dashboard.js          # Dashboard view controller & quick stats
│   ├── goals.js              # Goals & milestone tracking
│   ├── habits.js             # Habit tracker & streak logic
│   ├── notes.js              # Notes & tags manager
│   ├── onboarding.js         # First-time user welcome flow
│   ├── projects.js           # Project portfolio controller
│   ├── router.js             # Dynamic view router & template loader
│   ├── settings.js           # Theme, backup, export/import manager
│   ├── state.js              # Reactive state container
│   ├── storage.js            # Unified localStorage & IndexedDB persistence
│   ├── tasks.js              # Task manager & priority queue
│   └── widgets.js            # Focus timer, clock & quick actions
├── pages/                    # Modular HTML view templates
│   ├── calendar.html         # Calendar & schedule view
│   ├── dashboard.html        # Bento dashboard view
│   ├── goals.html            # Goals & milestones view
│   ├── habits.html           # Habit tracker view
│   ├── insights.html         # Analytics & productivity charts
│   ├── notes.html            # Notes view
│   ├── projects.html         # Projects & roadmap view
│   ├── settings.html         # Preferences & data management view
│   └── tasks.html            # Task board & list view
├── server/                   # Local development server
│   └── server.js             # Zero-dependency HTTP server (Node.js)
├── index.html                # Main application entry point
├── package.json              # Project scripts & npm metadata
├── vercel.json               # Vercel deployment & security headers config
├── .gitignore                # Git repository exclusions
├── LICENSE                   # GNU General Public License v3.0
└── README.md                 # Project documentation
```

---

## ⚡ Deploying to Vercel (`.vercel.app`)

LifeOS is configured for native, zero-configuration deployment on Vercel:

### Option A: Via GitHub (Recommended)
1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your **LifeOS** repository.
4. Keep the default settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./`
   - **Build Command**: *(leave empty)*
   - **Output Directory**: *(leave empty)*
5. Click **Deploy**. Your app will be live on `https://your-project.vercel.app` in seconds!

### Option B: Via Vercel CLI
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy directly from the project root
vercel

# Deploy to production
vercel --prod
```

### Verified Vercel Features Included
- **Zero-Config Static Serving**: `index.html` at the root serves the application shell instantly.
- **Serverless API Function**: `/api/health` returns JSON telemetry confirming Vercel deployment health.
- **Security Headers**: Automatic `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, and `Referrer-Policy`.
- **Static Asset Caching**: Optimized caching headers for `/css`, `/js`, and `/assets` with stale-while-revalidate.

---

## 🚀 Local Development

The project includes a built-in, zero-dependency Node.js HTTP server. You can run it directly without installing external web servers.

### Run with npm:
```bash
npm start
# or: npm run dev
```

### Run directly with Node.js:
```bash
node server/server.js
```

### Run with Python 3:
```bash
python3 -m http.server 3000
```

Once running, open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Testing

Run automated tests for the wellness database module:

```bash
npm test
```

---

## ✨ Core Features

- **Bento Dashboard**: Unified hub with metrics, focus timer, active priorities, and recent activity.
- **Task Management**: Prioritized tasks with due dates, filtering, and completion statuses.
- **Calendar & Agenda**: Daily view of events and focus blocks.
- **Habit Tracker**: Daily habit check-ins with streaks and historical trends.
- **Goals & Projects**: Multi-stage progress tracking with target deadlines.
- **Notes & Knowledge**: Local note-taking with tagging and pinning.
- **Web Audio Sound Effects**: Ambient audio and tactile earcons for productivity focus blocks.
- **Privacy-First**: All data is stored locally in your browser (`localStorage` & `IndexedDB`) with full JSON export and restore support. Zero external trackers.
- **Dark & Light Mode**: Built-in theme switcher with curated, high-contrast HSL design tokens.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
