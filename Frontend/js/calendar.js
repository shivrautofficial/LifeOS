/* ==========================================================================
   LifeOS Calendar Module
   Calendar Blocks, Deep Focus Schedules & Time Management
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';

export const calendarModule = {
  /**
   * Initialize calendar module view
   */
  init() {
    this.renderEvents();
    this.bindEvents();
  },

  renderEvents() {
    const container = document.getElementById('calendar-events-container');
    if (!container) return;

    const events = state.get('calendarEvents') || [];

    if (events.length === 0) {
      container.innerHTML = `<div class="placeholder-state"><h3 class="placeholder-title">No scheduled blocks</h3><p class="placeholder-text">Click "Schedule Block" above to protect deep focus time.</p></div>`;
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="card" style="padding: 14px 18px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; border-left: 3px solid var(--color-electric-indigo);">
        <div>
          <span class="badge badge-indigo" style="margin-bottom: 4px;">${e.tag || 'Focus Block'}</span>
          <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-midnight-navy);">${e.title}</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px;">⏰ ${e.time} • 📅 ${e.date}</div>
        </div>
        <button class="btn btn-sm btn-icon" data-delete-event="${e.id}" title="Remove Block">✕</button>
      </div>
    `).join('');

    this.bindDeletes();
  },

  bindDeletes() {
    document.querySelectorAll('[data-delete-event]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteEvent;
        const events = (state.get('calendarEvents') || []).filter(e => e.id !== id);
        sound.playClick();
        state.setKey('calendarEvents', events);
        this.renderEvents();
      };
    });
  },

  bindEvents() {
    const btnShow = document.getElementById('btn-show-add-event');
    const panel = document.getElementById('add-event-panel');
    const btnCancel = document.getElementById('btn-cancel-add-event');
    const btnSubmit = document.getElementById('btn-submit-new-event');

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
        const titleInput = document.getElementById('input-new-event-title');
        const timeInput = document.getElementById('input-new-event-time');
        const dateInput = document.getElementById('input-new-event-date');

        const title = titleInput.value.trim();
        if (!title) return;

        const events = state.get('calendarEvents') || [];
        events.push({
          id: 'e-' + Date.now(),
          title,
          time: timeInput.value.trim() || '10:00 AM - 11:00 AM',
          date: dateInput.value.trim() || 'Today',
          tag: 'Deep Work'
        });

        sound.playComplete();
        state.setKey('calendarEvents', events);

        titleInput.value = '';
        panel.style.display = 'none';
        this.renderEvents();
      };
    }
  }
};
