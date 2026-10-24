/* ==========================================================================
   LifeOS Dashboard Module
   Dashboard View Orchestration, Pomodoro Timer & Multi-Profession Telemetry
   ========================================================================== */

import { state } from './state.js';
import { widgets } from './widgets.js';
import { sound } from './audio.js';
import { toast } from './toast.js';
import { supabaseService } from './supabase.js';

let timerInterval = null;
let currentTimerSeconds = 25 * 60;
let isTimerRunning = false;
let currentTimerMode = 'focus'; // focus, short, long

export const dashboardModule = {
  /**
   * Initialize and render dashboard view
   */
  init() {
    this.renderHeader();
    this.renderMetrics();
    this.renderWidgets();
    this.renderProfessionWorkspace();
    this.initPomodoro();
    this.bindEvents();
  },

  /**
   * Update welcome header with user name, time-based greeting, and current date
   */
  renderHeader() {
    const greetingEl = document.getElementById('dashboard-greeting');
    const badgeEl = document.getElementById('dashboard-persona-badge');
    const dateEl = document.getElementById('dashboard-date-text');
    const profile = state.get('profile');

    if (greetingEl && profile) {
      const hour = new Date().getHours();
      let timeOfDay = 'Good evening';
      if (hour < 12) timeOfDay = 'Good morning';
      else if (hour < 17) timeOfDay = 'Good afternoon';

      greetingEl.textContent = `${timeOfDay}, ${profile.name || 'Professional'}`;
    }

    if (badgeEl && profile) {
      badgeEl.textContent = profile.roleTitle || 'Professional';
    }

    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      dateEl.textContent = new Intl.DateTimeFormat('en-US', options).format(new Date());
    }

    const syncTextEl = document.getElementById('dashboard-sync-text');
    const syncDotEl = document.getElementById('dashboard-sync-dot');
    if (syncTextEl) {
      if (supabaseService.isConfigured()) {
        syncTextEl.textContent = 'Cloud Synced (Supabase)';
        if (syncDotEl) {
          syncDotEl.classList.add('active');
          syncDotEl.style.backgroundColor = 'var(--color-success)';
        }
      } else {
        syncTextEl.textContent = 'Local-First Active';
        if (syncDotEl) {
          syncDotEl.classList.add('active');
          syncDotEl.style.backgroundColor = 'var(--color-primary)';
        }
      }
    }
  },

  /**
   * Update metric stats counters from real state
   */
  renderMetrics() {
    const metrics = state.get('metrics') || {};
    const taskCountEl = document.getElementById('stat-active-tasks');
    const tasksDeltaEl = document.getElementById('stat-tasks-delta');
    const habitRateEl = document.getElementById('stat-habit-rate');
    const goalsEl = document.getElementById('stat-active-goals');
    const focusTimeEl = document.getElementById('stat-focus-time');

    const tasks = state.get('todayTasks') || [];
    const activeTasks = tasks.filter(t => !t.done).length;

    if (taskCountEl) taskCountEl.textContent = activeTasks;
    if (tasksDeltaEl) tasksDeltaEl.textContent = `${activeTasks} remaining today`;
    if (habitRateEl) habitRateEl.textContent = metrics.habitConsistencyRate ?? '94%';
    if (goalsEl) goalsEl.textContent = metrics.goalsProgress ?? '4 / 6';
    if (focusTimeEl) focusTimeEl.textContent = metrics.focusTimeToday ?? '2.5h';
  },

  /**
   * Render tasks, habits, and schedule widget contents
   */
  renderWidgets() {
    const tasksContainer = document.getElementById('dashboard-tasks-container');
    const habitsContainer = document.getElementById('dashboard-habits-container');
    const scheduleContainer = document.getElementById('dashboard-schedule-container');

    const tasks = state.get('todayTasks') || [];
    const habits = state.get('todayHabits') || [];
    const events = state.get('calendarEvents') || [];

    if (tasksContainer) {
      tasksContainer.innerHTML = tasks.length > 0
        ? tasks.slice(0, 5).map(t => widgets.renderTaskItem(t)).join('')
        : '<p style="color: var(--color-text-secondary); font-size: var(--font-size-body); padding: 12px 0;">No active tasks remaining. Great job!</p>';
    }

    if (habitsContainer) {
      habitsContainer.innerHTML = habits.length > 0
        ? habits.map(h => widgets.renderHabitRow(h)).join('')
        : '<p style="color: var(--color-text-secondary); font-size: var(--font-size-body); padding: 12px 0;">No habits configured yet.</p>';
    }

    if (scheduleContainer) {
      scheduleContainer.innerHTML = events.length > 0
        ? events.slice(0, 3).map(e => widgets.renderScheduleItem(e)).join('')
        : '<p style="color: var(--color-text-secondary); font-size: var(--font-size-body); padding: 12px 0;">No schedule blocks today.</p>';
    }
  },

  /**
   * Render dynamic telemetry workspace based on active profession persona
   */
  renderProfessionWorkspace() {
    const container = document.getElementById('profession-workspace-content');
    const titleEl = document.getElementById('prof-workspace-title');
    const badgeEl = document.getElementById('prof-workspace-badge');
    const profile = state.get('profile') || {};
    const prof = profile.profession || 'engineer';

    if (!container) return;

    if (prof === 'engineer') {
      if (titleEl) titleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Engineering Command & Sprint Telemetry`;
      if (badgeEl) badgeEl.textContent = 'CI/CD Live';

      // Generate simulated commit matrix
      let cells = '';
      for (let i = 0; i < 7 * 14; i++) {
        const lvl = (i % 5 === 0 || i % 7 === 0) ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
        const bg = lvl === 0 ? 'var(--color-border)' : lvl === 1 ? 'rgba(99, 102, 241, 0.3)' : lvl === 2 ? 'rgba(99, 102, 241, 0.65)' : 'var(--color-primary)';
        cells += `<div style="width: 12px; height: 12px; border-radius: 2px; background: ${bg};" title="Sprint activity block ${i + 1}"></div>`;
      }

      container.innerHTML = `
        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.6875rem; font-weight: var(--font-weight-semibold); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Sprint Heatmap (14 Weeks)</span>
            <span style="font-size: 0.6875rem; color: var(--color-text-secondary);">42 commits / sprint</span>
          </div>
          <div style="display: grid; grid-template-rows: repeat(7, 12px); grid-auto-flow: column; gap: 4px; overflow-x: auto; padding: 4px 0;">
            ${cells}
          </div>
        </div>
        <div class="telemetry-kpi-grid">
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Median API Latency</span>
            <span class="telemetry-tile-value" style="color: var(--color-success);">38 ms</span>
          </div>
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Test Coverage</span>
            <span class="telemetry-tile-value" style="color: var(--color-primary);">88.4%</span>
          </div>
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Production SLA</span>
            <span class="telemetry-tile-value" style="color: var(--color-text-main);">99.98%</span>
          </div>
        </div>
      `;
    } else if (prof === 'student') {
      if (titleEl) titleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Academic Hub & Coursework Matrix`;
      if (badgeEl) badgeEl.textContent = 'Cumulative GPA: 3.91';

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3);">
          <div class="telemetry-tile" style="padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 13px; color: var(--color-text-main);">Distributed Systems</span>
              <span class="badge badge-success" style="font-size: 11px;">Grade: A</span>
            </div>
            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px;">85% Syllabus Mastered</div>
            ${widgets.renderProgressBar(85, 'var(--color-success)')}
          </div>
          <div class="telemetry-tile" style="padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 13px; color: var(--color-text-main);">Computer Networks</span>
              <span class="badge badge-indigo" style="font-size: 11px;">Grade: A-</span>
            </div>
            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px;">78% Syllabus Mastered</div>
            ${widgets.renderProgressBar(78, 'var(--color-primary)')}
          </div>
          <div class="telemetry-tile" style="padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 13px; color: var(--color-text-main);">HCI & Systems UX</span>
              <span class="badge badge-success" style="font-size: 11px;">Grade: A+</span>
            </div>
            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px;">94% Syllabus Mastered</div>
            ${widgets.renderProgressBar(94, 'var(--color-soft-violet)')}
          </div>
        </div>
      `;
    } else if (prof === 'founder') {
      if (titleEl) titleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Venture Command & Growth Metrics`;
      if (badgeEl) badgeEl.textContent = 'Seed Stage';

      container.innerHTML = `
        <div class="telemetry-kpi-grid">
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Monthly Recurring Revenue</span>
            <span class="telemetry-tile-value" style="color: var(--color-success);">$14,200</span>
          </div>
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Capital Runway</span>
            <span class="telemetry-tile-value" style="color: var(--color-warning);">16 Months</span>
          </div>
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Unit Economics (LTV / CAC)</span>
            <span class="telemetry-tile-value" style="color: var(--color-primary);">5.8x</span>
          </div>
        </div>
      `;
    } else {
      if (titleEl) titleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Holistic Wellbeing & Daily Equilibrium`;
      if (badgeEl) badgeEl.textContent = 'Equilibrium';

      container.innerHTML = `
        <div class="telemetry-kpi-grid">
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Sleep Average</span>
            <span class="telemetry-tile-value" style="color: var(--color-primary);">7.8 hrs</span>
          </div>
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Hydration Target</span>
            <span class="telemetry-tile-value" style="color: var(--color-success);">6 / 8 Glasses</span>
          </div>
          <div class="telemetry-tile">
            <span class="telemetry-tile-label">Daily Movement</span>
            <span class="telemetry-tile-value" style="color: var(--color-warning);">9,400 steps</span>
          </div>
        </div>
      `;
    }
  },

  /**
   * Pomodoro & Focus Timer Logic
   */
  initPomodoro() {
    const digitsEl = document.getElementById('timer-digits');
    const pomodoroCard = document.querySelector('.pomodoro-card');
    const toggleBtn = document.getElementById('btn-timer-toggle');
    const resetBtn = document.getElementById('btn-timer-reset');
    const focusBtn = document.getElementById('btn-timer-focus');
    const shortBtn = document.getElementById('btn-timer-short');
    const longBtn = document.getElementById('btn-timer-long');

    if (!toggleBtn) return;

    const updateDisplay = () => {
      const min = Math.floor(currentTimerSeconds / 60);
      const sec = currentTimerSeconds % 60;
      if (digitsEl) digitsEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const stopTimer = () => {
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (pomodoroCard) pomodoroCard.classList.remove('running');
      if (toggleBtn) {
        toggleBtn.textContent = 'Start Focus';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
      }
    };

    const setModeActive = (activeBtn) => {
      [focusBtn, shortBtn, longBtn].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    toggleBtn.onclick = () => {
      sound.playClick();
      if (isTimerRunning) {
        stopTimer();
      } else {
        isTimerRunning = true;
        if (pomodoroCard) pomodoroCard.classList.add('running');
        toggleBtn.textContent = 'Pause';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');

        timerInterval = setInterval(() => {
          if (currentTimerSeconds > 0) {
            currentTimerSeconds--;
            updateDisplay();
          } else {
            stopTimer();
            sound.playComplete();
            toast.success('🎉 Deep focus sprint completed! Take a short restorative break.');
          }
        }, 1000);
      }
    };

    if (resetBtn) {
      resetBtn.onclick = () => {
        sound.playClick();
        stopTimer();
        currentTimerSeconds = currentTimerMode === 'focus' ? 25 * 60 : currentTimerMode === 'short' ? 5 * 60 : 15 * 60;
        updateDisplay();
      };
    }

    if (focusBtn) {
      focusBtn.onclick = () => {
        sound.playClick();
        stopTimer();
        currentTimerMode = 'focus';
        setModeActive(focusBtn);
        currentTimerSeconds = 25 * 60;
        updateDisplay();
      };
    }

    if (shortBtn) {
      shortBtn.onclick = () => {
        sound.playClick();
        stopTimer();
        currentTimerMode = 'short';
        setModeActive(shortBtn);
        currentTimerSeconds = 5 * 60;
        updateDisplay();
      };
    }

    if (longBtn) {
      longBtn.onclick = () => {
        sound.playClick();
        stopTimer();
        currentTimerMode = 'long';
        setModeActive(longBtn);
        currentTimerSeconds = 15 * 60;
        updateDisplay();
      };
    }
  },

  /**
   * Bind interactive widget clicks
   */
  bindEvents() {
    const tasksContainer = document.getElementById('dashboard-tasks-container');
    if (tasksContainer) {
      tasksContainer.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.addEventListener('change', (e) => {
          const taskId = e.target.dataset.taskId;
          const tasks = state.get('todayTasks') || [];
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            task.done = e.target.checked;
            task.status = task.done ? 'done' : 'todo';
            sound.playComplete();
            state.setKey('todayTasks', tasks);
            this.renderWidgets();
            this.renderMetrics();
          }
        });
      });
    }

    const habitsContainer = document.getElementById('dashboard-habits-container');
    if (habitsContainer) {
      habitsContainer.querySelectorAll('button[data-habit-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const habitId = e.currentTarget.dataset.habitId;
          const habits = state.get('todayHabits') || [];
          const habit = habits.find(h => h.id === habitId);
          if (habit) {
            habit.done = !habit.done;
            habit.streak = habit.done ? habit.streak + 1 : Math.max(0, habit.streak - 1);
            sound.playComplete();
            state.setKey('todayHabits', habits);
            this.renderWidgets();
          }
        });
      });
    }
  }
};
