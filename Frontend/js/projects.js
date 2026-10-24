/* ==========================================================================
   LifeOS Projects Module
   Project Scopes, Roadmaps & Delivery Management
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { widgets } from './widgets.js';

export const projectsModule = {
  /**
   * Initialize projects module view
   */
  init() {
    this.renderProjects();
    this.bindEvents();
  },

  renderProjects() {
    const container = document.getElementById('projects-list-container');
    if (!container) return;

    const projects = state.get('projects') || [];

    if (projects.length === 0) {
      container.innerHTML = `<div class="placeholder-state"><h3 class="placeholder-title">No projects active</h3><p class="placeholder-text">Click "New Initiative" above to structure high-impact projects.</p></div>`;
      return;
    }

    container.innerHTML = projects.map(p => `
      <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="badge ${p.status === 'Active' ? 'badge-indigo' : 'badge-neutral'}" style="margin-bottom: 6px;">${p.status || 'Active'}</span>
            <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-midnight-navy);">${p.title}</div>
          </div>
          <button class="btn btn-sm btn-icon" data-delete-project="${p.id}" title="Delete Project">✕</button>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 4px;">
          <span>Target: ${p.deadline || 'Ongoing'}</span>
          <span style="font-weight: 700; color: var(--color-electric-indigo);">${p.progress || 0}%</span>
        </div>
        ${widgets.renderProgressBar(p.progress || 0)}
      </div>
    `).join('');

    this.bindDeletes();
  },

  bindDeletes() {
    document.querySelectorAll('[data-delete-project]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteProject;
        const projects = (state.get('projects') || []).filter(p => p.id !== id);
        sound.playClick();
        state.setKey('projects', projects);
        this.renderProjects();
      };
    });
  },

  bindEvents() {
    const btnShow = document.getElementById('btn-show-add-project');
    const panel = document.getElementById('add-project-panel');
    const btnCancel = document.getElementById('btn-cancel-add-project');
    const btnSubmit = document.getElementById('btn-submit-new-project');

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
        const titleInput = document.getElementById('input-new-project-title');
        const deadInput = document.getElementById('input-new-project-deadline');
        const progInput = document.getElementById('input-new-project-progress');

        const title = titleInput.value.trim();
        if (!title) return;

        const projects = state.get('projects') || [];
        projects.push({
          id: 'p-' + Date.now(),
          title,
          status: 'Active',
          deadline: deadInput.value.trim() || 'Next Month',
          progress: parseInt(progInput.value, 10) || 10
        });

        sound.playComplete();
        state.setKey('projects', projects);

        titleInput.value = '';
        panel.style.display = 'none';
        this.renderProjects();
      };
    }
  }
};
