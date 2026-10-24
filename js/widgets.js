/* ==========================================================================
   LifeOS Widgets Module
   Shared Widget Rendering and Component Builders
   ========================================================================== */

export const widgets = {
  /**
   * Render a task list item element
   * @param {object} task
   * @returns {string} HTML string
   */
  renderTaskItem(task) {
    const priorityBadge = {
      urgent: '<span class="badge badge-error">Urgent</span>',
      high: '<span class="badge badge-warning">High</span>',
      medium: '<span class="badge badge-indigo">Medium</span>',
      low: '<span class="badge badge-neutral">Low</span>'
    }[task.priority] || '<span class="badge badge-neutral">Normal</span>';

    return `
      <div class="list-item-glass" style="padding: 10px 14px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; min-width: 0;">
          <input type="checkbox" ${task.done ? 'checked' : ''} data-task-id="${task.id}" aria-label="Mark task done">
          <span style="font-size: var(--font-size-body); font-weight: var(--font-weight-medium); line-height: 1.35; ${task.done ? 'text-decoration: line-through; color: var(--color-text-muted);' : 'color: var(--color-text-main);'}">
            ${task.title}
          </span>
        </label>
        <div style="flex-shrink: 0;">
          ${priorityBadge}
        </div>
      </div>
    `;
  },

  /**
   * Render a habit streak row
   * @param {object} habit
   * @returns {string} HTML string
   */
  renderHabitRow(habit) {
    return `
      <div class="list-item-glass" style="padding: 10px 14px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: var(--font-size-body); font-weight: var(--font-weight-medium); color: var(--color-text-main);">${habit.title}</span>
          <span style="font-size: var(--font-size-xs); color: var(--color-warning); font-weight: var(--font-weight-semibold);">
            🔥 ${habit.streak || 0}d streak
          </span>
        </div>
        <button class="btn btn-sm ${habit.done ? 'btn-primary' : 'btn-secondary'}" data-habit-id="${habit.id}">
          ${habit.done ? 'Completed' : 'Check In'}
        </button>
      </div>
    `;
  },

  /**
   * Render a calendar block item
   * @param {object} event
   * @returns {string} HTML string
   */
  renderScheduleItem(event) {
    return `
      <div class="list-item-glass" style="padding: 10px 14px; border-left: 3px solid var(--color-primary); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
          <span style="font-size: var(--font-size-meta); font-weight: var(--font-weight-semibold); color: var(--color-text-main);">${event.title}</span>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${event.time}</span>
        </div>
        <span class="badge badge-indigo" style="font-size: 11px;">${event.tag || 'Focus Block'}</span>
      </div>
    `;
  },

  /**
   * Render progress bar indicator
   * @param {number} percentage
   * @param {string} [color]
   * @returns {string} HTML string
   */
  renderProgressBar(percentage, color = 'var(--color-primary)') {
    const clamped = Math.min(100, Math.max(0, percentage));
    return `
      <div class="progress-track">
        <div class="progress-fill" style="width: ${clamped}%; background-color: ${color};"></div>
      </div>
    `;
  }
};
