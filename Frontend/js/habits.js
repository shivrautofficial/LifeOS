/* ==========================================================================
   LifeOS Habits Module
   Habit Engine, 7-Day Streaks & Ritual Consistency
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';

export const habitsModule = {
  /**
   * Initialize habits module view
   */
  init() {
    this.renderHabits();
    this.bindEvents();
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

    if (habits.length === 0) {
      container.innerHTML = `<div class="placeholder-state"><h3 class="placeholder-title">No habits created</h3><p class="placeholder-text">Click "New Habit" above to create your first compounding daily ritual.</p></div>`;
      return;
    }

    container.innerHTML = habits.map(h => {
      const history = h.history || [false, false, false, false, false, false, false];
      const weekCircles = history.map((done, idx) => `
        <button class="btn btn-sm ${done ? 'btn-primary' : 'btn-secondary'}" 
                data-habit-toggle="${h.id}" 
                data-day="${idx}" 
                style="width: 32px; height: 32px; padding: 0; border-radius: var(--radius-full); ${idx === todayIndex ? 'border: 2px solid var(--color-electric-indigo);' : ''}">
          ${daysShort[idx]}
        </button>
      `).join('');

      return `
        <div class="card" style="padding: 16px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-md);">
          <div>
            <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-midnight-navy);">${h.title}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-warning); font-weight: 600; margin-top: 2px;">
              🔥 ${h.streak || 0} day streak <span style="color: var(--color-text-secondary); margin-left: 6px;">(best: ${h.bestStreak || h.streak || 0})</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 6px;">
              ${weekCircles}
            </div>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete-habit="${h.id}" title="Delete Habit" style="margin-left: 8px;">✕</button>
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
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
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

        titleInput.value = '';
        panel.style.display = 'none';
        this.renderHabits();
      };
    }
  }
};
