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
      high: '<span class="badge badge-warning">High</span>',
      urgent: '<span class="badge badge-error">Urgent</span>',
      medium: '<span class="badge badge-indigo">Medium</span>',
      low: '<span class="badge badge-neutral">Low</span>'
    }[task.priority] || '<span class="badge badge-neutral">Normal</span>';

    return `
      <div class="card" style="padding: 12px 16px; margin-bottom: 8px; flex-direction: row; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" ${task.done ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-electric-indigo); cursor: pointer;" data-task-id="${task.id}">
          <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); ${task.done ? 'text-decoration: line-through; color: var(--color-text-muted);' : ''}">${task.title}</span>
        </div>
        <div>
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
      <div class="card" style="padding: 12px 16px; margin-bottom: 8px; flex-direction: row; align-items: center; justify-content: space-between;">
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${habit.title}</span>
          <span style="font-size: var(--font-size-xs); color: var(--color-warning);">🔥 ${habit.streak} day streak</span>
        </div>
        <button class="btn btn-sm ${habit.done ? 'btn-primary' : 'btn-secondary'}" data-habit-id="${habit.id}">
          ${habit.done ? 'Completed' : 'Check In'}
        </button>
      </div>
    `;
  },

  /**
   * Render progress bar indicator
   * @param {number} percentage
   * @param {string} [color]
   * @returns {string} HTML string
   */
  renderProgressBar(percentage, color = 'var(--color-electric-indigo)') {
    const clamped = Math.min(100, Math.max(0, percentage));
    return `
      <div style="width: 100%; height: 6px; background-color: var(--color-border); border-radius: var(--radius-full); overflow: hidden;">
        <div style="width: ${clamped}%; height: 100%; background-color: ${color}; border-radius: var(--radius-full); transition: width 0.3s ease;"></div>
      </div>
    `;
  }
};
