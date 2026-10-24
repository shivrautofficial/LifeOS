/* ==========================================================================
   LifeOS Tasks Module
   Task Lifecycle, Kanban Pipeline & Priority Matrix Engine
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';

export const tasksModule = {
  /**
   * Initialize task module view
   */
  init() {
    this.renderKanban();
    this.bindEvents();
  },

  /**
   * Render all 4 Kanban columns from state
   */
  renderKanban() {
    const tasks = state.get('todayTasks') || [];
    const columns = ['todo', 'in_progress', 'review', 'done'];

    columns.forEach(col => {
      const container = document.getElementById(`list-${col}`);
      const countEl = document.getElementById(`count-${col}`);
      const colTasks = tasks.filter(t => (t.status || (t.done ? 'done' : 'todo')) === col);

      if (countEl) countEl.textContent = colTasks.length;
      if (!container) return;

      container.innerHTML = colTasks.map(t => {
        const priorityColor = t.priority === 'urgent' ? 'var(--color-error)' : t.priority === 'high' ? 'var(--color-warning)' : 'var(--color-electric-indigo)';
        return `
          <div class="card" style="padding: 12px; background: var(--color-white-surface); border-left: 3px solid ${priorityColor};" data-task-id="${t.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); ${t.done ? 'text-decoration: line-through; color: var(--color-text-muted);' : ''}">${t.title}</span>
              <button class="btn btn-sm btn-icon" data-delete-task="${t.id}" title="Delete" style="color: var(--color-text-muted); width: 22px; height: 22px;">✕</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs);">
              <span class="badge ${t.priority === 'urgent' ? 'badge-error' : t.priority === 'high' ? 'badge-warning' : 'badge-indigo'}">${t.priority}</span>
              <select class="form-select" data-change-status="${t.id}" style="padding: 2px 6px; font-size: 11px; width: auto;">
                <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
                <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="review" ${t.status === 'review' ? 'selected' : ''}>In Review</option>
                <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
              </select>
            </div>
          </div>
        `;
      }).join('');
    });

    this.bindCardInteractions();
  },

  /**
   * Bind event handlers
   */
  bindEvents() {
    const btnShowAdd = document.getElementById('btn-show-add-task');
    const panel = document.getElementById('add-task-panel');
    const btnCancel = document.getElementById('btn-cancel-add-task');
    const btnSubmit = document.getElementById('btn-submit-new-task');

    if (btnShowAdd && panel) {
      btnShowAdd.onclick = () => {
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
        const titleInput = document.getElementById('input-new-task-title');
        const prioritySelect = document.getElementById('select-new-task-priority');
        const statusSelect = document.getElementById('select-new-task-status');

        const title = titleInput.value.trim();
        if (!title) return;

        const tasks = state.get('todayTasks') || [];
        const newTask = {
          id: 't-' + Date.now(),
          title,
          priority: prioritySelect.value,
          status: statusSelect.value,
          done: statusSelect.value === 'done',
          category: 'work'
        };

        tasks.unshift(newTask);
        sound.playComplete();
        state.setKey('todayTasks', tasks);

        titleInput.value = '';
        panel.style.display = 'none';
        this.renderKanban();
      };
    }
  },

  /**
   * Bind status dropdown and delete triggers on rendered cards
   */
  bindCardInteractions() {
    document.querySelectorAll('[data-change-status]').forEach(select => {
      select.onchange = (e) => {
        const taskId = e.target.dataset.changeStatus;
        const newStatus = e.target.value;
        const tasks = state.get('todayTasks') || [];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.status = newStatus;
          task.done = newStatus === 'done';
          sound.playClick();
          state.setKey('todayTasks', tasks);
          this.renderKanban();
        }
      };
    });

    document.querySelectorAll('[data-delete-task]').forEach(btn => {
      btn.onclick = (e) => {
        const taskId = e.target.dataset.deleteTask;
        const tasks = (state.get('todayTasks') || []).filter(t => t.id !== taskId);
        sound.playClick();
        state.setKey('todayTasks', tasks);
        this.renderKanban();
      };
    });
  }
};
