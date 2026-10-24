/* ==========================================================================
   LifeOS Habits Module
   Habit Engine, 7-Day Streaks & Ritual Consistency
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { supabaseService } from './supabase.js';

let unsubscribeState = null;

export const habitsModule = {
  /**
   * Initialize habits module view
   */
  init() {
    this.renderHabits();
    this.bindEvents();
    if (unsubscribeState) unsubscribeState();
    unsubscribeState = state.subscribe(() => {
      this.renderHabits();
    });
  },

  destroy() {
    if (unsubscribeState) {
      unsubscribeState();
      unsubscribeState = null;
    }
  },

  /**
   * Render habits with 7-day checkboxes
   */
  renderHabits() {
    const container = document.getElementById('habits-list-page-container');
    if (!container) return;

    const habits = state.get('todayHabits') || [];
    const daysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIndex = (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun

    // Update KPI Strip
    const totalEl = document.getElementById('stat-total-habits');
    const consistencyEl = document.getElementById('stat-habit-consistency');
    const doneTodayEl = document.getElementById('stat-habits-done-today');

    if (totalEl) totalEl.textContent = habits.length;
    if (doneTodayEl) {
      const doneCount = habits.filter(h => h.done || (h.history && h.history[todayIndex])).length;
      doneTodayEl.textContent = `${doneCount} / ${habits.length}`;
    }
    if (consistencyEl) {
      let totalSlots = 0;
      let completedSlots = 0;
      habits.forEach(h => {
        const hist = h.history || [];
        totalSlots += hist.length || 7;
        completedSlots += hist.filter(Boolean).length;
      });
      const pct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 90;
      consistencyEl.textContent = `${pct}%`;
    }

    if (habits.length === 0) {
      container.innerHTML = `
        <div class="placeholder-state">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <h3 class="placeholder-title">No habits created</h3>
          <p class="placeholder-text">Click "New Habit" above to create your first compounding daily ritual.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = habits.map(h => {
      const history = h.history || [false, false, false, false, false, false, false];
      const weekCircles = history.map((done, idx) => `
        <button class="btn btn-sm ${done ? 'btn-primary' : 'btn-secondary'}" 
                data-habit-toggle="${h.id}" 
                data-day="${idx}" 
                title="${daysShort[idx]} - Click to toggle"
                style="width: 32px; height: 32px; padding: 0; font-size: 11px; font-weight: 600; border-radius: var(--radius-full); transition: transform var(--transition-fast), background var(--transition-fast); ${idx === todayIndex ? 'box-shadow: 0 0 0 2px var(--color-primary);' : ''}">
          ${daysShort[idx]}
        </button>
      `).join('');

      return `
        <div class="card animate-fade-in" style="padding: 14px 18px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); border-radius: var(--radius-lg); transition: transform var(--transition-fast), box-shadow var(--transition-fast);">
          <div>
            <div style="font-weight: 600; font-size: var(--font-size-card-title); color: var(--color-text-main);">${h.title}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-warning); font-weight: 600; margin-top: 3px; display: flex; align-items: center; gap: 6px;">
              <span>🔥 ${h.streak || 0} day streak</span>
              <span style="color: var(--color-text-muted); font-weight: 400;">(best: ${h.bestStreak || h.streak || 0})</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; gap: 5px;" aria-label="7-day completion strip">
              ${weekCircles}
            </div>
            <button class="btn btn-icon btn-sm" data-delete-habit="${h.id}" title="Delete Habit" style="width: 28px; height: 28px; color: var(--color-text-muted); margin-left: 4px;" aria-label="Delete habit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.bindDayClicks();
  },

  /**
   * Bind day checkbox toggles
   */
  bindDayClicks() {
    document.querySelectorAll('[data-habit-toggle]').forEach(btn => {
      btn.onclick = () => {
        const habitId = btn.dataset.habitToggle;
        const dayIdx = parseInt(btn.dataset.day, 10);
        const habits = state.get('todayHabits') || [];
        const habit = habits.find(h => h.id === habitId);

        if (habit) {
          if (!habit.history) habit.history = [false, false, false, false, false, false, false];
          habit.history[dayIdx] = !habit.history[dayIdx];

          // Recalculate streak
          let streak = 0;
          for (let i = habit.history.length - 1; i >= 0; i--) {
            if (habit.history[i]) streak++;
            else break;
          }
          habit.streak = streak;
          habit.done = habit.history[(new Date().getDay() + 6) % 7];

          sound.playComplete();
          state.setKey('todayHabits', habits);
          if (supabaseService.isConfigured()) {
            supabaseService.syncHabit(habit).catch(err => console.warn(err));
          }
          this.renderHabits();
        }
      };
    });

    document.querySelectorAll('[data-delete-habit]').forEach(btn => {
      btn.onclick = () => {
        const habitId = btn.dataset.deleteHabit;
        const habits = (state.get('todayHabits') || []).filter(h => h.id !== habitId);
        sound.playClick();
        state.setKey('todayHabits', habits);
        if (supabaseService.isConfigured()) {
          supabaseService.deleteHabit(habitId).catch(err => console.warn(err));
        }
        this.renderHabits();
      };
    });
  },

  /**
   * Bind add habit panel triggers
   */
  bindEvents() {
    const btnShow = document.getElementById('btn-show-add-habit');
    const panel = document.getElementById('add-habit-panel');
    const btnCancel = document.getElementById('btn-cancel-add-habit');
    const btnSubmit = document.getElementById('btn-submit-new-habit');
    const titleInput = document.getElementById('input-new-habit-title');

    if (btnShow && panel) {
      btnShow.onclick = () => {
        sound.playClick();
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen && titleInput) titleInput.focus();
      };
    }

    if (btnCancel && panel) {
      btnCancel.onclick = () => {
        sound.playClick();
        panel.style.display = 'none';
      };
    }

    if (btnSubmit && titleInput) {
      btnSubmit.onclick = () => {
        const title = titleInput.value.trim();
        if (!title) return;

        const habits = state.get('todayHabits') || [];
        const newHabit = {
          id: 'h-' + Date.now(),
          title,
          streak: 1,
          bestStreak: 1,
          done: true,
          history: [false, false, false, false, false, false, true]
        };

        habits.push(newHabit);
        sound.playComplete();
        state.setKey('todayHabits', habits);
        if (supabaseService.isConfigured()) {
          supabaseService.syncHabit(newHabit).catch(err => console.warn(err));
        }

        titleInput.value = '';
        if (panel) panel.style.display = 'none';
        this.renderHabits();
      };
    }
  }
};
