/* ==========================================================================
   LifeOS Tasks Module
   Task Lifecycle, Kanban Pipeline & Priority Matrix Engine
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { toast } from './toast.js';
import { dbSync } from './dbSync.js';

let filterQuery = '';
let activePriorityFilter = 'all';

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

    const filtered = tasks.filter(t => {
      const matchesQuery = !filterQuery || t.title.toLowerCase().includes(filterQuery) || t.priority.toLowerCase().includes(filterQuery);
      const matchesPriority = activePriorityFilter === 'all' || t.priority === activePriorityFilter;
      return matchesQuery && matchesPriority;
    });

    columns.forEach(col => {
      const container = document.getElementById(`list-${col}`);
      const countEl = document.getElementById(`count-${col}`);
      const colTasks = filtered.filter(t => (t.status || (t.done ? 'done' : 'todo')) === col);

      if (countEl) countEl.textContent = colTasks.length;
      if (!container) return;

      if (colTasks.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--color-text-muted); font-size: var(--font-size-xs); padding: 28px 12px; border: 1px dashed var(--color-border); border-radius: var(--radius-md);">
            No tasks in this stage
          </div>
        `;
        return;
      }

      container.innerHTML = colTasks.map(t => {
        const priorityColor = t.priority === 'urgent' ? 'var(--color-error)' : t.priority === 'high' ? 'var(--color-warning)' : 'var(--color-primary)';
        const priorityBadgeClass = t.priority === 'urgent' ? 'badge-error' : t.priority === 'high' ? 'badge-warning' : 'badge-indigo';
        const dueDate = t.dueDate || 'Today';

        return `
          <div class="list-item-glass animate-fade-in" style="padding: 12px; border-left: 3px solid ${priorityColor}; border-radius: var(--radius-md); transition: transform var(--transition-fast), box-shadow var(--transition-fast);" data-task-id="${t.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: var(--font-size-body); font-weight: var(--font-weight-medium); line-height: 1.35; ${t.done ? 'text-decoration: line-through; color: var(--color-text-muted);' : 'color: var(--color-text-main);'}">
                ${t.title}
              </span>
              <button class="btn btn-icon btn-sm" data-delete-task="${t.id}" title="Delete Task" style="width: 24px; height: 24px; color: var(--color-text-muted); flex-shrink: 0;" aria-label="Delete Task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs); gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge ${priorityBadgeClass}">${t.priority}</span>
                <span style="font-size: 11px; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 3px;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${dueDate}
                </span>
              </div>
              <select class="form-select" data-change-status="${t.id}" style="height: 28px; padding: 2px 8px; font-size: 11px; width: auto;" aria-label="Update task status">
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
    const filterInput = document.getElementById('tasks-search-filter');
    const priorityFilters = document.getElementById('tasks-priority-filters');

    if (priorityFilters) {
      priorityFilters.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
          sound.playClick();
          priorityFilters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activePriorityFilter = btn.dataset.filterPriority || 'all';
          this.renderKanban();
        };
      });
    }

    if (filterInput) {
      filterInput.oninput = (e) => {
        filterQuery = e.target.value.toLowerCase().trim();
        this.renderKanban();
      };
    }

    if (btnShowAdd && panel) {
      btnShowAdd.onclick = () => {
        sound.playClick();
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
          const titleInput = document.getElementById('input-new-task-title');
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
        const titleInput = document.getElementById('input-new-task-title');
        const prioritySelect = document.getElementById('select-new-task-priority');
        const statusSelect = document.getElementById('select-new-task-status');
        const dueSelect = document.getElementById('select-new-task-due');

        const title = titleInput ? titleInput.value.trim() : '';
        if (!title) {
          toast.warning('Please enter a deliverable title.');
          titleInput?.focus();
          return;
        }

        const tasks = state.get('todayTasks') || [];
        const newTask = {
          id: 't-' + Date.now(),
          title,
          priority: prioritySelect ? prioritySelect.value : 'medium',
          status: statusSelect ? statusSelect.value : 'todo',
          dueDate: dueSelect ? dueSelect.value : 'Today',
          done: statusSelect ? statusSelect.value === 'done' : false,
          category: 'work'
        };

        state.setKey('todayTasks', [newTask, ...tasks]);
        dbSync.syncTask(newTask, 'upsert');
        sound.playComplete();
        toast.success(`Deliverable "${title}" added.`);

        if (titleInput) titleInput.value = '';
        if (panel) panel.style.display = 'none';
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
          dbSync.syncTask(task, 'upsert');
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
        dbSync.syncTask({ id: taskId }, 'delete');
        this.renderKanban();
      };
    });
  }
};
