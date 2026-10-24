/* ==========================================================================
   LifeOS Dashboard Module
   Dashboard View Orchestration, Pomodoro Timer & Profession Telemetry
   ========================================================================== */

import { state } from './state.js';
import { widgets } from './widgets.js';
import { sound } from './audio.js';

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
   * Update welcome header with user name and time-based greeting
   */
  renderHeader() {
    const greetingEl = document.getElementById('dashboard-greeting');
    const badgeEl = document.getElementById('dashboard-persona-badge');
    const profile = state.get('profile');

    if (greetingEl && profile) {
      const hour = new Date().getHours();
      let timeOfDay = 'Good evening';
      if (hour < 12) timeOfDay = 'Good morning';
      else if (hour < 17) timeOfDay = 'Good afternoon';

      greetingEl.textContent = `${timeOfDay}, ${profile.name} 👋`;
    }

    if (badgeEl && profile) {
      badgeEl.textContent = profile.roleTitle || 'Professional';
    }
  },

  /**
   * Update metric stats counters
   */
  renderMetrics() {
    const metrics = state.get('metrics');
    if (!metrics) return;

    const taskCountEl = document.getElementById('stat-active-tasks');
    const habitRateEl = document.getElementById('stat-habit-rate');
    const goalsEl = document.getElementById('stat-active-goals');
    const focusTimeEl = document.getElementById('stat-focus-time');

    const tasks = state.get('todayTasks') || [];
    const activeTasks = tasks.filter(t => !t.done).length;

    if (taskCountEl) taskCountEl.textContent = activeTasks;
    if (habitRateEl) habitRateEl.textContent = metrics.habitConsistencyRate ?? '94%';
    if (goalsEl) goalsEl.textContent = metrics.goalsProgress ?? '4 / 6';
    if (focusTimeEl) focusTimeEl.textContent = metrics.focusTimeToday ?? '2.5h';
  },

  /**
   * Render tasks and habits widget contents
   */
  renderWidgets() {
    const tasksContainer = document.getElementById('dashboard-tasks-container');
    const habitsContainer = document.getElementById('dashboard-habits-container');

    const tasks = state.get('todayTasks') || [];
    const habits = state.get('todayHabits') || [];

    if (tasksContainer) {
      tasksContainer.innerHTML = tasks.length > 0
        ? tasks.map(t => widgets.renderTaskItem(t)).join('')
        : '<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">No active tasks for today.</p>';
    }

    if (habitsContainer) {
      habitsContainer.innerHTML = habits.length > 0
        ? habits.map(h => widgets.renderHabitRow(h)).join('')
        : '<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">No habits defined yet.</p>';
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
      if (titleEl) titleEl.innerHTML = `💻 Engineering Command & Commit Telemetry`;
      if (badgeEl) badgeEl.textContent = 'CI/CD Live';

      // Generate simulated commit matrix
      let cells = '';
      for (let i = 0; i < 7 * 14; i++) {
        const lvl = (i % 5 === 0 || i % 7 === 0) ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
        const bg = lvl === 0 ? 'var(--color-border)' : lvl === 1 ? 'rgba(99, 102, 241, 0.3)' : lvl === 2 ? 'rgba(99, 102, 241, 0.65)' : 'var(--color-electric-indigo)';
        cells += `<div style="width: 12px; height: 12px; border-radius: 2px; background: ${bg};" title="Sprint activity on day ${i + 1}"></div>`;
      }

      container.innerHTML = `
        <div style="margin-bottom: var(--space-md);">
          <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary);">SPRINT COMMIT HEATMAP (PAST 14 WEEKS)</span>
          <div style="display: grid; grid-template-rows: repeat(7, 12px); grid-auto-flow: column; gap: 4px; overflow-x: auto; padding: 8px 0;">
            ${cells}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-sm);">
          <div class="card" style="padding: 10px 14px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Median API Latency</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-success);">38 ms</span>
          </div>
          <div class="card" style="padding: 10px 14px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Test Coverage</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-electric-indigo);">88.4%</span>
          </div>
          <div class="card" style="padding: 10px 14px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Uptime SLA</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-midnight-navy);">99.98%</span>
          </div>
        </div>
      `;
    } else if (prof === 'student') {
      if (titleEl) titleEl.innerHTML = `🎓 Academic Hub & Coursework Matrix`;
      if (badgeEl) badgeEl.textContent = 'GPA: 3.91';

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-sm);">
          <div class="card" style="padding: 14px;">
            <div style="font-weight: 700; font-size: var(--font-size-sm); margin-bottom: 4px;">Distributed Systems</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 8px;">Grade: A (85% Coursework)</div>
            ${widgets.renderProgressBar(85, 'var(--color-success)')}
          </div>
          <div class="card" style="padding: 14px;">
            <div style="font-weight: 700; font-size: var(--font-size-sm); margin-bottom: 4px;">Computer Networks</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 8px;">Grade: A- (78% Coursework)</div>
            ${widgets.renderProgressBar(78, 'var(--color-electric-indigo)')}
          </div>
          <div class="card" style="padding: 14px;">
            <div style="font-weight: 700; font-size: var(--font-size-sm); margin-bottom: 4px;">HCI & UX Architecture</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 8px;">Grade: A+ (94% Coursework)</div>
            ${widgets.renderProgressBar(94, 'var(--color-soft-violet)')}
          </div>
        </div>
      `;
    } else if (prof === 'founder') {
      if (titleEl) titleEl.innerHTML = `🚀 Venture Command & Growth Metrics`;
      if (badgeEl) badgeEl.textContent = 'Seed Stage';

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm); margin-bottom: var(--space-sm);">
          <div class="card" style="padding: 12px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">MRR</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-success);">$14,200</span>
          </div>
          <div class="card" style="padding: 12px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Runway</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-warning);">16 Months</span>
          </div>
          <div class="card" style="padding: 12px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">LTV / CAC</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-electric-indigo);">5.8x</span>
          </div>
        </div>
      `;
    } else {
      if (titleEl) titleEl.innerHTML = `⚡ Holistic Life & Focus Overview`;
      if (badgeEl) badgeEl.textContent = 'Equilibrium';

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm);">
          <div class="card" style="padding: 12px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Sleep Avg</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-electric-indigo);">7.8 hrs</span>
          </div>
          <div class="card" style="padding: 12px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Hydration</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-success);">6 / 8 Glasses</span>
          </div>
          <div class="card" style="padding: 12px;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Daily Movement</span>
            <span style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-warning);">9,400 steps</span>
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
      if (toggleBtn) {
        toggleBtn.textContent = 'Start Focus';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
      }
    };

    toggleBtn.onclick = () => {
      sound.playClick();
      if (isTimerRunning) {
        stopTimer();
      } else {
        isTimerRunning = true;
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
            alert('🎉 Focus session completed! Great work.');
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
        currentTimerSeconds = 25 * 60;
        updateDisplay();
      };
    }

    if (shortBtn) {
      shortBtn.onclick = () => {
        sound.playClick();
        stopTimer();
        currentTimerMode = 'short';
        currentTimerSeconds = 5 * 60;
        updateDisplay();
      };
    }

    if (longBtn) {
      longBtn.onclick = () => {
        sound.playClick();
        stopTimer();
        currentTimerMode = 'long';
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
