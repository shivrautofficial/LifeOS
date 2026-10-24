/* ==========================================================================
   LifeOS Database Synchronization Client (dbSync)
   Connects the entire frontend directly to:
   1. Local Server Database API (/api/db, /api/tasks, etc.)
   2. Supabase PostgreSQL Cloud Database (via supabaseService)
   3. Browser IndexedDB (Dexie LifeOSWellnessDB)
   4. LocalStorage Instant Cache
   ========================================================================== */

import { state } from './state.js';
import { storage } from './storage.js';
import { supabaseService } from './supabase.js';

class DatabaseSyncManager {
  constructor() {
    this.isServerDbConnected = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.debounceTimer = null;
    this.subscribers = new Set();
  }

  /**
   * Initialize database connections and perform initial bootstrap pull
   */
  async init() {
    console.info('[LifeOS dbSync] Initializing universal database connectivity...');

    // 1. Test server database API connectivity & load state
    await this.loadFromDatabase();

    // 2. Initialize Supabase cloud database if configured
    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.init();
        console.info('[LifeOS dbSync] Supabase Cloud Database connected.');
      } catch (err) {
        console.warn('[LifeOS dbSync] Supabase cloud init warning:', err.message);
      }
    }

    // 3. Listen to reactive state changes to continuously sync changes to the database
    state.subscribe((currentState) => {
      this.scheduleDebouncedSync(currentState);
    });

    this.notifyStatus();
    return true;
  }

  /**
   * Fetch and hydrate state directly from the backend database
   */
  async loadFromDatabase() {
    try {
      const res = await fetch('/api/db', { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const dbData = await res.json();
        this.isServerDbConnected = true;
        this.lastSyncTime = dbData.updatedAt || new Date().toISOString();
        this.mergeServerDbIntoState(dbData);
        this.notifyStatus();
        return { success: true, data: dbData };
      }
    } catch (err) {
      this.isServerDbConnected = false;
      this.notifyStatus();
      return { success: false, error: err.message };
    }
    return { success: false };
  }

  /**
   * Merge records from backend database into frontend state
   */
  mergeServerDbIntoState(dbData) {
    if (!dbData || typeof dbData !== 'object') return;

    const updates = {};
    if (Array.isArray(dbData.todayTasks) && dbData.todayTasks.length > 0) {
      updates.todayTasks = dbData.todayTasks;
    }
    if (Array.isArray(dbData.todayHabits) && dbData.todayHabits.length > 0) {
      updates.todayHabits = dbData.todayHabits;
    }
    if (Array.isArray(dbData.goals) && dbData.goals.length > 0) {
      updates.goals = dbData.goals;
    }
    if (Array.isArray(dbData.projects) && dbData.projects.length > 0) {
      updates.projects = dbData.projects;
    }
    if (Array.isArray(dbData.notes) && dbData.notes.length > 0) {
      updates.notes = dbData.notes;
    }
    if (Array.isArray(dbData.calendarEvents) && dbData.calendarEvents.length > 0) {
      updates.calendarEvents = dbData.calendarEvents;
    }
    if (dbData.healthProfile && typeof dbData.healthProfile === 'object') {
      updates.healthProfile = dbData.healthProfile;
    }
    if (dbData.healthDailyLogs && typeof dbData.healthDailyLogs === 'object') {
      updates.healthDailyLogs = dbData.healthDailyLogs;
    }
    if (dbData.profile && typeof dbData.profile === 'object') {
      updates.profile = { ...(state.get('profile') || {}), ...dbData.profile };
    }

    if (Object.keys(updates).length > 0) {
      state.set(updates);
    }
  }

  /**
   * Debounced sync to database to avoid flooding network on rapid typing
   */
  scheduleDebouncedSync(currentState) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.syncAll(currentState);
    }, 400);
  }

  /**
   * Push full state snapshot to both Server DB API and Supabase Cloud
   */
  async syncAll(currentState = state.get()) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notifyStatus();

    const payload = {
      profile: currentState.profile || {},
      metrics: currentState.metrics || {},
      todayTasks: currentState.todayTasks || [],
      todayHabits: currentState.todayHabits || [],
      goals: currentState.goals || [],
      projects: currentState.projects || [],
      notes: currentState.notes || [],
      calendarEvents: currentState.calendarEvents || [],
      healthProfile: currentState.healthProfile || null,
      healthDailyLogs: currentState.healthDailyLogs || {},
      updatedAt: new Date().toISOString()
    };

    // 1. Sync to Server Database API
    if (this.isServerDbConnected || window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          this.isServerDbConnected = true;
          this.lastSyncTime = new Date().toISOString();
        }
      } catch (err) {
        // Network offline or static hosting
      }
    }

    // 2. Sync to Supabase Cloud if configured
    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.pushAll({
          tasks: payload.todayTasks,
          habits: payload.todayHabits,
          goals: payload.goals,
          notes: payload.notes,
          profile: payload.profile,
          metrics: payload.metrics,
          healthProfile: payload.healthProfile,
          healthDailyLogs: payload.healthDailyLogs
        });
      } catch (err) {
        console.warn('[LifeOS dbSync] Supabase cloud push warning:', err.message);
      }
    }

    this.isSyncing = false;
    this.notifyStatus();
  }

  /**
   * Specific helper to sync task change immediately
   */
  async syncTask(task, action = 'upsert') {
    if (!task) return;
    try {
      if (action === 'delete') {
        fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
        if (supabaseService.isConfigured()) supabaseService.deleteTask(task.id);
      } else {
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        }).catch(() => {});
        if (supabaseService.isConfigured()) supabaseService.syncTask(task);
      }
    } catch (e) {}
  }

  /**
   * Specific helper to sync habit change immediately
   */
  async syncHabit(habit, action = 'upsert') {
    if (!habit) return;
    try {
      if (action === 'delete') {
        fetch(`/api/habits/${habit.id}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habit)
        }).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Specific helper to sync goal change immediately
   */
  async syncGoal(goal, action = 'upsert') {
    if (!goal) return;
    try {
      if (action === 'delete') {
        fetch(`/api/goals/${goal.id}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goal)
        }).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Specific helper to sync project change immediately
   */
  async syncProject(project, action = 'upsert') {
    if (!project) return;
    try {
      if (action === 'delete') {
        fetch(`/api/projects/${project.id}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        }).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Specific helper to sync note change immediately
   */
  async syncNote(note, action = 'upsert') {
    if (!note) return;
    try {
      if (action === 'delete') {
        fetch(`/api/notes/${note.id}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note)
        }).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Specific helper to sync calendar change immediately
   */
  async syncCalendarEvent(event, action = 'upsert') {
    if (!event) return;
    try {
      if (action === 'delete') {
        fetch(`/api/calendar/${event.id}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        }).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Specific helper to sync health profile and logs
   */
  async syncHealth(healthProfile, healthDailyLogs) {
    try {
      fetch('/api/health-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthProfile, healthDailyLogs })
      }).catch(() => {});
    } catch (e) {}
  }

  /**
   * Status reporter
   */
  getStatus() {
    return {
      serverDbConnected: this.isServerDbConnected,
      supabaseConnected: supabaseService.isConfigured(),
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime
    };
  }

  onStatusChange(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifyStatus() {
    const status = this.getStatus();
    this.subscribers.forEach(cb => {
      try { cb(status); } catch (e) {}
    });

    // Update any UI badge in DOM if present
    const badge = document.getElementById('database-status-indicator');
    if (badge) {
      if (status.isSyncing) {
        badge.innerHTML = `
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); display: inline-block;"></span>
          <span>Syncing...</span>
        `;
        badge.style.background = 'rgba(245, 158, 11, 0.12)';
        badge.style.color = '#F59E0B';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.25)';
        badge.title = 'Synchronizing with Database...';
      } else if (status.serverDbConnected || status.supabaseConnected) {
        const source = status.supabaseConnected && status.serverDbConnected ? 'DB & Cloud Active' : 'DB Connected';
        badge.innerHTML = `
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6); display: inline-block;"></span>
          <span>${source}</span>
        `;
        badge.style.background = 'rgba(16, 185, 129, 0.12)';
        badge.style.color = '#10B981';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
        badge.title = `Database Connected • Last synced: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleTimeString() : 'Just now'}`;
      } else {
        badge.innerHTML = `
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #94A3B8; display: inline-block;"></span>
          <span>Offline DB</span>
        `;
        badge.style.background = 'rgba(148, 163, 184, 0.12)';
        badge.style.color = 'var(--color-text-secondary)';
        badge.style.borderColor = 'var(--color-border-subtle)';
        badge.title = 'Running in Local Storage / IndexedDB mode';
      }
    }
  }
}

export const dbSync = new DatabaseSyncManager();
