# LifeOS Frontend Architecture & UX Context Guide

> **Purpose:** This document is a complete architectural snapshot and UX guide for AI agents and developers. Provide this file to an AI to give it complete context to redesign, overhaul, or refine the user interface and user experience without breaking existing routing or state management.

---

## 1. Tech Stack & Architecture Overview
- **Type:** Vanilla Client-Side Single Page Application (SPA).
- **Languages:** Pure HTML5, Modular CSS3 (Custom Properties / Design Tokens), Modern ES6 JavaScript Modules (`type="module"`).
- **Frameworks:** None (Zero dependencies, lightweight, runs natively on static hosts or `serve`).
- **Dev Server:** Port `3000` via `npm run dev` (`npx serve . -p 3000`).

---

## 2. Directory Structure Map

```text
Frontend/
├── index.html              # Shell template: sidebar, sticky header, modal, ambient background canvas
├── package.json            # Dev server run scripts
├── FRONTEND_CONTEXT.md     # AI context & UX modification guide
│
├── css/                    # Modular Design System (Vanilla CSS)
│   ├── variables.css       # Design tokens: palette, dark/light theme, typography, shadows, transitions
│   ├── base.css            # CSS reset, typography base, body mesh/ambient canvas animations
│   ├── layout.css          # App layout: CSS grid/flex for sidebar, header, main viewport
│   ├── components.css      # Reusable UI primitives: buttons, cards, badges, inputs, modals, tooltips
│   ├── dashboard.css       # Dashboard widget grids, KPI cards, streaks, focus timer UI
│   └── responsive.css      # Breakpoints (1024px, 768px, 480px) & mobile drawer behavior
│
├── pages/                  # Route Views (HTML fragments dynamically injected into #app-content)
│   ├── dashboard.html      # Main telemetry overview, focus timer, daily goals, quick agenda
│   ├── tasks.html          # Task board & list with filters (Today, Priority, Categories)
│   ├── calendar.html       # Schedule overview, time-blocked events, agenda
│   ├── goals.html          # Quarterly/annual goal tracking with visual progress
│   ├── habits.html         # Daily check-ins, consistency streaks, 7-day completion matrix
│   ├── projects.html       # Active project cards, milestones, status pills
│   ├── notes.html          # Fast Markdown-style scratchpad & tagged pinned notes
│   ├── insights.html       # Analytics & productivity telemetry graphs/stats
│   └── settings.html       # Persona settings, dark/light mode toggle, JSON data backup/restore
│
├── js/                     # Application Logic & Reactivity
│   ├── app.js              # Entry bootstrap: shortcuts (⌘K), global events, theme init
│   ├── router.js           # Hash router: loads `pages/*.html` into `<main id="app-content">`
│   ├── state.js            # Central reactive store (`state.get`, `state.set`, `state.subscribe`)
│   ├── storage.js          # LocalStorage persistence (`lifeos_state`) & JSON export/import
│   ├── audio.js            # Web Audio API sound synthesis for focus mode and interactions
│   ├── onboarding.js       # First-run modal flow & persona selection
│   ├── widgets.js          # Reusable widget helpers & metrics calculations
│   ├── api.js              # Connector for backend / local workers
│   └── [route].js          # Route-specific controllers:
│       ├── dashboard.js    # Binds timer, task check-off, habit streak counters
│       ├── tasks.js        # Add, filter, complete, delete tasks
│       ├── calendar.js     # Calendar view rendering & event scheduling
│       ├── goals.js        # Goal progress sliders and completion
│       ├── habits.js       # Daily streak toggles & 7-day grid rendering
│       ├── projects.js     # Project status updates & progress bars
│       ├── notes.js        # Note creation, search, pin/archive
│       └── settings.js     # Profile updates, sound FX toggles, storage purge
│
└── assets/
    └── icons/              # Modular SVG vector icons for navigation & tools
```

---

## 3. How the UI/UX System Works

### A. The Page Lifecycle & Router
1. The user navigates via hash link: `<a href="#tasks">` or `location.hash = '#tasks'`.
2. `js/router.js` intercepts hash changes (`window.addEventListener('hashchange', ...)`).
3. `router.js` fetches `pages/<route>.html` via `fetch()`.
4. The HTML string is injected into `<main id="app-content">` inside `index.html`.
5. The router triggers `routeModule.init()` to attach event listeners and bind reactive state.
6. When leaving, `routeModule.destroy()` cleans up timers/observers.

### B. Reactive Data Flow
- **Single Source of Truth:** `js/state.js` holds user profile, tasks, habits, goals, notes, timer state.
- **Persistence:** Whenever `state.set(key, val)` is called, state auto-saves to LocalStorage via `js/storage.js`.
- **UI Updates:** Modules listen via `state.subscribe(key, callback)`.

### C. Design Tokens & Theming
- The whole visual style is governed by CSS variables in `css/variables.css`.
- Light & dark themes are toggled by changing `data-theme="dark"` or `data-theme="light"` on `document.documentElement`.
- Core colors:
  - Primary: `#6366F1` (Electric Indigo)
  - Background Dark: `#0B0F17` / Light: `#F6F7FB`
  - Glass Surface: `rgba(255, 255, 255, 0.04)` (Dark) / `rgba(255, 255, 255, 0.85)` (Light)

---

## 4. Cheat-Sheet for Modifying the UX

| What you want to change | Files to modify | Notes |
| :--- | :--- | :--- |
| **Color palette, fonts, spacing, shadows** | `css/variables.css` | Edit `:root` and `[data-theme="dark"]` tokens. |
| **Global shell (Sidebar, Header, Ambient FX)**| `index.html`, `css/layout.css` | Keep element IDs intact (`#app-content`, `#global-search-input`, etc.). |
| **Buttons, Cards, Badges, Modals, Inputs** | `css/components.css` | Standard classes used across all `pages/*.html`. |
| **Specific Page Layout (e.g., Tasks, Habits)** | `pages/<page>.html`, `css/dashboard.css` | Pure HTML templates; keep data attributes and action IDs. |
| **Interactivity & UI logic for a page** | `js/<page>.js` | Handles rendering, clicks, and state dispatching. |
| **Mobile responsiveness & Drawer** | `css/responsive.css` | Handles breakpoints under `1024px`, `768px`, and `480px`. |

---

## 5. Ready-To-Use Prompt for AI Agents

> *Copy and paste the block below into any AI prompt when requesting UX redesigns:*

```markdown
You are an expert Frontend Architect & UI/UX Designer modifying the LifeOS application.

Project Tech Stack:
- Vanilla HTML5 + Modular CSS (Variables/Tokens) + Vanilla ES6 JavaScript (No frameworks).
- Single-page application using client-side hash routing (`#dashboard`, `#tasks`, `#calendar`, `#goals`, `#habits`, `#projects`, `#notes`, `#insights`, `#settings`).
- Root template: `index.html`. Injected page fragments: `pages/*.html`.
- Global styles: `css/variables.css`, `css/base.css`, `css/layout.css`, `css/components.css`, `css/responsive.css`.
- State & Router: `js/router.js`, `js/state.js`, `js/app.js`, and module controllers `js/<page>.js`.

Rules for modifying the UX:
1. Preserve functional IDs & Data attributes: Do not rename IDs like `#app-content`, `#global-search-input`, `#btn-theme-toggle`, or data routes `data-route="..."`.
2. Maintain the Design System: Prefer updating design tokens in `css/variables.css` and shared components in `css/components.css` rather than writing ad-hoc inline styles.
3. Keep Page Templates Modular: Each page in `pages/*.html` is an HTML fragment without `<html>` or `<body>` tags.
4. Ensure State Sync: If adding interactive UI elements, bind them via the corresponding `js/<page>.js` and use `state.get()` / `state.set()`.
5. Deliver High-Aesthetic UX: Use sleek typography, refined contrast, glassmorphism surfaces, subtle micro-interactions, and accessible spacing.
```
