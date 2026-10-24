/* ==========================================================================
   LifeOS State Module
   Centralized Reactive Application State & Event Dispatching
   ========================================================================== */

import { storage } from './storage.js';

const INITIAL_STATE = {
  profile: {
    name: 'User',
    roleTitle: 'Software Engineer',
    profession: 'engineer',
    theme: 'dark',
    onboarded: true
  },
  metrics: {
    activeTasksCount: 8,
    habitConsistencyRate: '94%',
    goalsProgress: '4 / 6',
    focusTimeToday: '2.5h'
  },
  timer: {
    mode: 'focus', // focus, shortBreak, longBreak
    timeLeft: 25 * 60,
    isRunning: false,
    sessionsCompleted: 4
  },
  todayTasks: [
    { id: 't-1', title: 'Complete LifeOS foundation and file architecture', priority: 'high', done: true, status: 'done', category: 'work' },
    { id: 't-2', title: 'Establish shared design system tokens and variables', priority: 'high', done: true, status: 'done', category: 'work' },
    { id: 't-3', title: 'Verify client-side routing across all 9 pages', priority: 'medium', done: false, status: 'in_progress', category: 'work' },
    { id: 't-4', title: 'Refine multi-profession telemetry widgets', priority: 'medium', done: false, status: 'todo', category: 'tech' },
    { id: 't-5', title: 'Test local JSON data export and restore', priority: 'urgent', done: false, status: 'todo', category: 'security' }
  ],
  todayHabits: [
    { id: 'h-1', title: 'Deep Work Session (2h)', streak: 14, bestStreak: 28, done: true, history: [true, true, true, true, true, true, true] },
    { id: 'h-2', title: 'Technical Reading / Architecture Papers', streak: 9, bestStreak: 16, done: true, history: [true, true, false, true, true, true, true] },
    { id: 'h-3', title: 'Physical Movement & Mobility', streak: 6, bestStreak: 12, done: false, history: [true, false, true, true, true, true, false] },
    { id: 'h-4', title: 'Daily Problem Solving / LeetCode', streak: 21, bestStreak: 30, done: true, history: [true, true, true, true, true, true, true] }
  ],
  goals: [
    { id: 'g-1', title: 'Ship LifeOS Hackathon MVP', category: 'Career', progress: 90, targetDate: 'Oct 2026' },
    { id: 'g-2', title: 'Read 24 Technical & Mindset Books', category: 'Learning', progress: 75, targetDate: 'Dec 2026' },
    { id: 'g-3', title: 'Achieve 100 Consecutive Days of Exercise', category: 'Health', progress: 60, targetDate: 'Nov 2026' },
    { id: 'g-4', title: 'Build 6 Months Emergency Runway', category: 'Finance', progress: 85, targetDate: 'Q4 2026' }
  ],
  projects: [
    { id: 'p-1', title: 'LifeOS Unified Dashboard', status: 'Active', progress: 85, deadline: 'Tomorrow' },
    { id: 'p-2', title: 'Distributed Systems Microservices Study', status: 'In Review', progress: 65, deadline: 'Nov 12' },
    { id: 'p-3', title: 'Personal Brand & Tech Writing', status: 'Ongoing', progress: 40, deadline: 'Dec 31' }
  ],
  notes: [
    { id: 'n-1', title: 'LifeOS Architectural Philosophy', content: 'One Life. One Dashboard. Completely privacy-first with local-first persistence, zero telemetry, and instantaneous client-side navigation.', tags: ['architecture', 'privacy'], pinned: true, updatedAt: 'Just now' },
    { id: 'n-2', title: 'Design System Identity', content: 'Midnight Navy (#111827) + Electric Indigo (#6366F1) + Soft Lavender (#EEF2FF). Minimal, fast, and accessible.', tags: ['design', 'tokens'], pinned: true, updatedAt: 'Yesterday' }
  ],
  calendarEvents: [
    { id: 'e-1', title: 'Focus Sprint: LifeOS Integration', time: '09:00 AM - 11:30 AM', date: 'Today', tag: 'Deep Work' },
    { id: 'e-2', title: 'System Architecture Review', time: '02:00 PM - 03:00 PM', date: 'Today', tag: 'Review' },
    { id: 'e-3', title: 'Hackathon Submission Deadline', time: '06:00 PM', date: 'Tomorrow', tag: 'Milestone' }
  ],
  activeRoute: 'dashboard'
};


class StateStore {
  constructor() {
    const saved = storage.get('app_state', null);
    if (saved && saved.profile && saved.profile.name === 'Sarthak') {
      saved.profile.name = 'User';
      storage.set('app_state', saved);
    }
    this.state = saved ? { ...INITIAL_STATE, ...saved } : INITIAL_STATE;
    if (this.state.profile && this.state.profile.name === 'Sarthak') {
      this.state.profile.name = 'User';
    }
    this.subscribers = new Set();
  }

  /**
   * Get complete current state snapshot or specific key
   * @param {string} [key]
   * @returns {*}
   */
  get(key) {
    return key ? this.state[key] : { ...this.state };
  }

  /**
   * Update state and notify subscribers
   * @param {object} partialState
   */
  set(partialState) {
    this.state = { ...this.state, ...partialState };
    storage.set('app_state', this.state);
    this.notify();
  }

  /**
   * Update specific nested key
   * @param {string} key
   * @param {*} value
   */
  setKey(key, value) {
    this.state[key] = value;
    storage.set('app_state', this.state);
    this.notify();
  }

  /**
   * Subscribe to state change notifications
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Broadcast state update to all subscribers
   */
  notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.state);
      } catch (err) {
        console.error('[LifeOS State] Subscriber notification error:', err);
      }
    });
  }

  /**
   * Reset state to baseline initial state
   */
  reset() {
    this.state = { ...INITIAL_STATE };
    storage.set('app_state', this.state);
    this.notify();
  }
}

export const state = new StateStore();
