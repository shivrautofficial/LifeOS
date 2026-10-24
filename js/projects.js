/* ==========================================================================
   LifeOS Projects Module
   Project Scopes, Roadmaps & Delivery Management
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { widgets } from './widgets.js';
<<<<<<< HEAD
import { dbSync } from './dbSync.js';
=======
import { supabaseService } from './supabase.js';

let unsubscribeState = null;
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0

export const projectsModule = {
  /**
   * Initialize projects module view
   */
  init() {
    this.renderProjects();
    this.bindEvents();
    if (unsubscribeState) unsubscribeState();
    unsubscribeState = state.subscribe(() => {
      this.renderProjects();
    });
  },

  destroy() {
    if (unsubscribeState) {
      unsubscribeState();
      unsubscribeState = null;
    }
  },

  renderProjects() {
    const container = document.getElementById('projects-list-container');
    if (!container) return;

    const projects = state.get('projects') || [];

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="placeholder-state" style="grid-column: 1 / -1;">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 class="placeholder-title">No projects active</h3>
          <p class="placeholder-text">Click "New Initiative" above to structure high-impact projects and roadmaps.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = projects.map(p => {
      const statusBadge = p.status === 'Active'
        ? '<span class="badge badge-indigo">Active</span>'
        : p.status === 'Completed'
          ? '<span class="badge badge-success">Completed</span>'
          : '<span class="badge badge-warning">In Review</span>';

      return `
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; border-radius: var(--radius-lg);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="margin-bottom: 6px;">${statusBadge}</div>
              <div style="font-weight: 600; font-size: var(--font-size-card-title); color: var(--color-text-main); line-height: 1.35;">${p.title}</div>
            </div>
            <button class="btn btn-icon btn-sm" data-delete-project="${p.id}" title="Delete Project" style="width: 28px; height: 28px; color: var(--color-text-muted); flex-shrink: 0;" aria-label="Delete Project">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: auto;">
            <span>Target: <strong style="color: var(--color-text-main); font-weight: 500;">${p.deadline || 'Ongoing'}</strong></span>
            <span style="font-weight: 700; color: var(--color-primary); font-variant-numeric: tabular-nums;">${p.progress || 0}%</span>
          </div>
          ${widgets.renderProgressBar(p.progress || 0, p.progress >= 80 ? 'var(--color-success)' : 'var(--color-primary)')}
        </div>
      `;
    }).join('');

    this.bindDeletes();
  },

  bindDeletes() {
    document.querySelectorAll('[data-delete-project]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteProject;
        const projects = (state.get('projects') || []).filter(p => p.id !== id);
        sound.playClick();
        state.setKey('projects', projects);
<<<<<<< HEAD
        dbSync.syncProject({ id }, 'delete');
=======
        if (supabaseService.isConfigured()) {
          supabaseService.deleteProject(id).catch(err => console.warn(err));
        }
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0
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
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
          const titleInput = document.getElementById('input-new-project-title');
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
        const titleInput = document.getElementById('input-new-project-title');
        const deadInput = document.getElementById('input-new-project-deadline');
        const progInput = document.getElementById('input-new-project-progress');

        const title = titleInput.value.trim();
        if (!title) return;

<<<<<<< HEAD
        const newProj = {
=======
        const projects = state.get('projects') || [];
        const newProject = {
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0
          id: 'p-' + Date.now(),
          title,
          status: 'Active',
          deadline: deadInput?.value.trim() || 'Next Month',
          progress: parseInt(progInput.value, 10) || 10
        };
<<<<<<< HEAD

        const projects = state.get('projects') || [];
        projects.push(newProj);
=======
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0

        projects.push(newProject);
        sound.playComplete();
        state.setKey('projects', projects);
<<<<<<< HEAD
        dbSync.syncProject(newProj, 'upsert');
=======
        if (supabaseService.isConfigured()) {
          supabaseService.syncProject(newProject).catch(err => console.warn(err));
        }
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0

        titleInput.value = '';
        if (panel) panel.style.display = 'none';
        this.renderProjects();
      };
    }
  }
};
