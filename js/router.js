/* ==========================================================================
   LifeOS Router Module
   Client-Side Hash-Based Routing, Page Loading & Lifecycle Dispatch
   ========================================================================== */

import { state } from './state.js';
import { dashboardModule } from './dashboard.js';
import { tasksModule } from './tasks.js';
import { calendarModule } from './calendar.js';
import { goalsModule } from './goals.js';
import { habitsModule } from './habits.js';
import { projectsModule } from './projects.js';
import { notesModule } from './notes.js';
import { settingsModule } from './settings.js';
import { insightsModule } from './insights.js';

export const ROUTES = {
  dashboard: {
    title: 'Dashboard',
    file: 'pages/dashboard.html',
    module: dashboardModule
  },
  tasks: {
    title: 'Tasks',
    file: 'pages/tasks.html',
    module: tasksModule
  },
  calendar: {
    title: 'Calendar',
    file: 'pages/calendar.html',
    module: calendarModule
  },
  goals: {
    title: 'Goals',
    file: 'pages/goals.html',
    module: goalsModule
  },
  habits: {
    title: 'Habits',
    file: 'pages/habits.html',
    module: habitsModule
  },
  projects: {
    title: 'Projects',
    file: 'pages/projects.html',
    module: projectsModule
  },
  notes: {
    title: 'Notes',
    file: 'pages/notes.html',
    module: notesModule
  },
  insights: {
    title: 'Insights',
    file: 'pages/insights.html',
    module: insightsModule
  },
  settings: {
    title: 'Settings',
    file: 'pages/settings.html',
    module: settingsModule
  }
};

class Router {
  constructor() {
    this.contentEl = null;
    this.breadcrumbEl = null;
    this.templateCache = new Map();
  }

  /**
   * Initialize router and bind hashchange listener
   * @param {HTMLElement} contentContainer
   * @param {HTMLElement} breadcrumbContainer
   */
  init(contentContainer, breadcrumbContainer) {
    this.contentEl = contentContainer;
    this.breadcrumbEl = breadcrumbContainer;

    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  /**
   * Parse active route from URL hash
   * @returns {string} route key
   */
  getCurrentRoute() {
    const rawHash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
    return ROUTES[rawHash] ? rawHash : 'dashboard';
  }

  /**
   * Navigate to a route programmatically
   * @param {string} routeKey
   */
  navigate(routeKey) {
    if (ROUTES[routeKey]) {
      window.location.hash = `#${routeKey}`;
    }
  }

  /**
   * Handle route change event
   */
  async handleRoute() {
    const routeKey = this.getCurrentRoute();
    const route = ROUTES[routeKey];
    state.setKey('activeRoute', routeKey);

    // Clean up previous module lifecycle resources (e.g. Chart.js instances)
    if (this.currentModule && typeof this.currentModule.destroy === 'function') {
      try {
        this.currentModule.destroy();
      } catch (err) {
        console.warn('[LifeOS Router] Previous module cleanup warning:', err);
      }
    }
    this.currentModule = route.module;

    // Update Header Breadcrumb & Document Title
    if (this.breadcrumbEl) {
      this.breadcrumbEl.textContent = route.title;
    }
    document.title = `${route.title} • LifeOS — One Life. One Dashboard.`;

    // Update Active Navigation Item in Sidebar
    this.updateActiveNav(routeKey);

    // Load and render page content
    await this.loadPageContent(route);

    // Close mobile drawer if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Run module lifecycle hook
    if (route.module && typeof route.module.init === 'function') {
      try {
        route.module.init();
      } catch (err) {
        console.error(`[LifeOS Router] Error initializing module for route "${routeKey}":`, err);
      }
    }
  }

  /**
   * Update active class on sidebar navigation links
   * @param {string} routeKey
   */
  updateActiveNav(routeKey) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkRoute = href.replace(/^#\/?/, '').toLowerCase().trim();
      link.classList.toggle('active', linkRoute === routeKey);
    });
  }

  /**
   * Fetch and mount page HTML
   * @param {object} route
   */
  async loadPageContent(route) {
    if (!this.contentEl) return;

    if (this.templateCache.has(route.file)) {
      this.contentEl.innerHTML = this.templateCache.get(route.file);
      return;
    }

    try {
      let response = await fetch(route.file);
      if (!response.ok && !route.file.startsWith('/')) {
        response = await fetch(`/${route.file}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      this.templateCache.set(route.file, html);
      this.contentEl.innerHTML = html;
    } catch (err) {
      console.warn(`[LifeOS Router] Could not fetch ${route.file} via network. Rendering template placeholder.`, err);
      this.renderFallbackPage(route);
    }
  }

  /**
   * Fallback renderer when file:// protocol restricts direct fetch
   * @param {object} route
   */
  renderFallbackPage(route) {
    this.contentEl.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">${route.title}</h1>
            <p class="page-description">LifeOS Module • ${route.title} Foundation</p>
          </div>
        </div>
        <div class="placeholder-state">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h2 class="placeholder-title">${route.title} Module Loaded</h2>
          <p class="placeholder-text">The official foundation for ${route.title} is active. Future tasks will implement full module functionality.</p>
          <button class="btn btn-primary" onclick="location.hash='#dashboard'">Return to Dashboard</button>
        </div>
      </div>
    `;
  }
}

export const router = new Router();
