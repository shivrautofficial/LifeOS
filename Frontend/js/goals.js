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

    if (goals.length === 0) {
      container.innerHTML = `<div class="placeholder-state"><h3 class="placeholder-title">No goals defined</h3><p class="placeholder-text">Create your first strategic milestone to align daily tasks with your long-term vision.</p></div>`;
      return;
    }

    container.innerHTML = goals.map(g => `
      <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="badge badge-indigo" style="margin-bottom: 6px;">${g.category || 'General'}</span>
            <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-midnight-navy);">${g.title}</div>
          </div>
          <button class="btn btn-sm btn-icon" data-delete-goal="${g.id}" title="Delete Goal" style="color: var(--color-text-muted);">✕</button>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 4px;">
          <span>Target: ${g.targetDate || '2026'}</span>
          <span style="font-weight: 700; color: var(--color-electric-indigo);">${g.progress || 0}%</span>
        </div>
        ${widgets.renderProgressBar(g.progress || 0, g.progress >= 80 ? 'var(--color-success)' : 'var(--color-electric-indigo)')}
      </div>
    `).join('');

    this.bindDeletes();
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
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
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
        const progInput = document.getElementById('input-new-goal-progress');

        const title = titleInput.value.trim();
        if (!title) return;

        const goals = state.get('goals') || [];
        goals.push({
          id: 'g-' + Date.now(),
          title,
          category: catInput.value.trim() || 'Focus',
          progress: parseInt(progInput.value, 10) || 0,
          targetDate: 'Q4 2026'
        });

        sound.playComplete();
        state.setKey('goals', goals);

        titleInput.value = '';
        panel.style.display = 'none';
        this.renderGoals();
      };
    }
  }
};
