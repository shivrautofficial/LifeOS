/* ==========================================================================
   LifeOS Goals Module
   Goal Objectives, Key Results & Milestone Tracking
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { widgets } from './widgets.js';

export const goalsModule = {
  /**
   * Initialize goals module view
   */
  init() {
    this.renderGoals();
    this.bindEvents();
  },

  /**
   * Render goal cards
   */
  renderGoals() {
    const container = document.getElementById('goals-list-page-container');
    if (!container) return;

    const goals = state.get('goals') || [];

    // Update Summary KPI Strip
    const totalEl = document.getElementById('stat-total-goals');
    const avgEl = document.getElementById('stat-avg-goal-progress');
    const onTrackEl = document.getElementById('stat-on-track-goals');

    if (totalEl) totalEl.textContent = goals.length;
    if (avgEl) {
      const avg = goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length) : 0;
      avgEl.textContent = `${avg}%`;
    }
    if (onTrackEl) {
      const onTrack = goals.filter(g => (g.progress || 0) >= 70).length;
      onTrackEl.textContent = onTrack;
    }

    if (goals.length === 0) {
      container.innerHTML = `
        <div class="placeholder-state" style="grid-column: 1 / -1;">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h3 class="placeholder-title">No goals defined</h3>
          <p class="placeholder-text">Create your first strategic milestone to align daily sprints with your long-term vision.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = goals.map(g => {
      const prog = g.progress || 0;
      const isDone = prog >= 100;
      const categoryBadge = {
        'Career': 'badge-indigo',
        'Learning': 'badge-indigo',
        'Health': 'badge-success',
        'Finance': 'badge-warning'
      }[g.category] || 'badge-neutral';

      return `
        <div class="card animate-fade-in" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; border-radius: var(--radius-lg); transition: transform var(--transition-fast), box-shadow var(--transition-fast);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="badge ${categoryBadge}" style="margin-bottom: 6px; font-size: 11px;">${g.category || 'General'}</span>
              <div style="font-weight: 600; font-size: var(--font-size-card-title); color: var(--color-text-main); line-height: 1.35;">${g.title}</div>
            </div>
            <button class="btn btn-icon btn-sm" data-delete-goal="${g.id}" title="Delete Goal" style="width: 28px; height: 28px; color: var(--color-text-muted); flex-shrink: 0;" aria-label="Delete Goal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: auto;">
            <span>Target: <strong style="color: var(--color-text-main); font-weight: 500;">${g.targetDate || '2026'}</strong></span>
            <span style="font-weight: 700; color: ${isDone ? 'var(--color-success)' : 'var(--color-primary)'}; font-variant-numeric: tabular-nums;">${prog}%</span>
          </div>
          ${widgets.renderProgressBar(prog, isDone ? 'var(--color-success)' : 'var(--color-primary)')}
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
            <button class="btn btn-secondary btn-sm" data-bump-goal="${g.id}" style="font-size: 11px; padding: 2px 8px;" ${isDone ? 'disabled' : ''}>+10% Progress</button>
            <button class="btn btn-outline btn-sm" data-complete-goal="${g.id}" style="font-size: 11px; padding: 2px 8px;">${isDone ? 'Reset' : 'Complete'}</button>
          </div>
        </div>
      `;
    }).join('');

    this.bindGoalActions();
    this.bindDeletes();
  },

  bindGoalActions() {
    document.querySelectorAll('[data-bump-goal]').forEach(btn => {
      btn.onclick = () => {
        const goalId = btn.dataset.bumpGoal;
        const goals = state.get('goals') || [];
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          goal.progress = Math.min(100, (goal.progress || 0) + 10);
          sound.playClick();
          state.setKey('goals', goals);
          this.renderGoals();
        }
      };
    });

    document.querySelectorAll('[data-complete-goal]').forEach(btn => {
      btn.onclick = () => {
        const goalId = btn.dataset.completeGoal;
        const goals = state.get('goals') || [];
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          goal.progress = (goal.progress || 0) >= 100 ? 0 : 100;
          sound.playComplete();
          state.setKey('goals', goals);
          this.renderGoals();
        }
      };
    });
  },

  bindDeletes() {
    document.querySelectorAll('[data-delete-goal]').forEach(btn => {
      btn.onclick = () => {
        const goalId = btn.dataset.deleteGoal;
        const goals = (state.get('goals') || []).filter(g => g.id !== goalId);
        sound.playClick();
        state.setKey('goals', goals);
        this.renderGoals();
      };
    });
  },

  bindEvents() {
    const btnShow = document.getElementById('btn-show-add-goal');
    const panel = document.getElementById('add-goal-panel');
    const btnCancel = document.getElementById('btn-cancel-add-goal');
    const btnSubmit = document.getElementById('btn-submit-new-goal');

    if (btnShow && panel) {
      btnShow.onclick = () => {
        sound.playClick();
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
          const titleInput = document.getElementById('input-new-goal-title');
          if (titleInput) titleInput.focus();
        }
      };
    }

    if (btnCancel && panel) {
      btnCancel.onclick = () => {
        sound.playClick();
        panel.style.display = 'none';
      };
    }

    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const titleInput = document.getElementById('input-new-goal-title');
        const catInput = document.getElementById('input-new-goal-category');
        const dateInput = document.getElementById('input-new-goal-date');
        const progInput = document.getElementById('input-new-goal-progress');

        const title = titleInput.value.trim();
        if (!title) return;

        const goals = state.get('goals') || [];
        goals.push({
          id: 'g-' + Date.now(),
          title,
          category: catInput.value.trim() || 'Focus',
          targetDate: dateInput?.value.trim() || 'Q4 2026',
          progress: parseInt(progInput.value, 10) || 0
        });

        sound.playComplete();
        state.setKey('goals', goals);

        titleInput.value = '';
        if (panel) panel.style.display = 'none';
        this.renderGoals();
      };
    }
  }
};
