/* ==========================================================================
   LifeOS Calendar Module
   Calendar Blocks, Deep Focus Schedules & Time Management
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { supabaseService } from './supabase.js';

let unsubscribeState = null;

export const calendarModule = {
  /**
   * Initialize calendar module view
   */
  init() {
    this.renderWeekStrip();
    this.renderEvents();
    this.bindEvents();
    if (unsubscribeState) unsubscribeState();
    unsubscribeState = state.subscribe(() => {
      this.renderEvents();
    });
  },

  destroy() {
    if (unsubscribeState) {
      unsubscribeState();
      unsubscribeState = null;
    }
  },

  /**
   * Render 7-day sprint overview strip
   */
  renderWeekStrip() {
    const strip = document.getElementById('calendar-week-strip');
    if (!strip) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const todayIndex = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - todayIndex);

    strip.innerHTML = days.map((dayName, idx) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + idx);
      const isToday = idx === todayIndex;

      return `
        <div style="display: flex; flex-direction: column; align-items: center; padding: 10px 4px; border-radius: var(--radius-md); text-align: center; background: ${isToday ? 'var(--color-soft-indigo)' : 'var(--color-bg-subtle)'}; border: 1px solid ${isToday ? 'var(--color-primary)' : 'var(--color-border)'};">
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${isToday ? 'var(--color-primary)' : 'var(--color-text-muted)'};">${dayName}</span>
          <span style="font-size: 16px; font-weight: 700; color: ${isToday ? 'var(--color-primary)' : 'var(--color-text-main)'}; margin: 2px 0;">${dayDate.getDate()}</span>
          <span style="font-size: 10px; color: ${isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)'}; font-weight: 500;">${isToday ? 'Today' : 'Focus'}</span>
        </div>
      `;
    }).join('');
  },

  /**
   * Render list of scheduled calendar commitments
   */
  renderEvents() {
    const container = document.getElementById('calendar-events-container');
    const countEl = document.getElementById('calendar-blocks-count');
    if (!container) return;

    const events = state.get('calendarEvents') || [];
    if (countEl) countEl.textContent = `${events.length} scheduled`;

    if (events.length === 0) {
      container.innerHTML = `
        <div class="placeholder-state" style="padding: var(--space-6);">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
          </div>
          <h3 class="placeholder-title">No scheduled blocks</h3>
          <p class="placeholder-text">Click "Schedule Block" above to protect deep focus sprints and deliverables.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(e => {
      const tagBorderColor = {
        'Deep Work': 'var(--color-primary)',
        'Review': 'var(--color-warning)',
        'Sprint': '#8B5CF6',
        'Milestone': 'var(--color-success)'
      }[e.tag] || 'var(--color-primary)';

      const tagBadgeClass = {
        'Deep Work': 'badge-indigo',
        'Review': 'badge-warning',
        'Sprint': 'badge-indigo',
        'Milestone': 'badge-success'
      }[e.tag] || 'badge-neutral';

      return `
        <div class="list-item-glass animate-fade-in" style="padding: 12px 16px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; border-left: 3px solid ${tagBorderColor}; border-radius: var(--radius-md); transition: transform var(--transition-fast), box-shadow var(--transition-fast);">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${tagBadgeClass}" style="font-size: 11px;">${e.tag || 'Focus Block'}</span>
              <span style="font-size: 12px; color: var(--color-text-muted);">⏰ ${e.time}</span>
              <span style="font-size: 12px; color: var(--color-text-secondary); font-weight: 500;">• ${e.date}</span>
            </div>
            <div style="font-weight: 600; font-size: var(--font-size-body); color: var(--color-text-main); margin-top: 4px;">${e.title}</div>
          </div>
          <button class="btn btn-icon btn-sm" data-delete-event="${e.id}" title="Remove Block" style="width: 28px; height: 28px; color: var(--color-text-muted);" aria-label="Remove block">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      `;
    }).join('');

    this.bindDeletes();
  },

  bindDeletes() {
    document.querySelectorAll('[data-delete-event]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteEvent;
        const events = (state.get('calendarEvents') || []).filter(e => e.id !== id);
        sound.playClick();
        state.setKey('calendarEvents', events);
        if (supabaseService.isConfigured()) {
          supabaseService.deleteEvent(id).catch(err => console.warn(err));
        }
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
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
          const titleInput = document.getElementById('input-new-event-title');
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
        const titleInput = document.getElementById('input-new-event-title');
        const timeInput = document.getElementById('input-new-event-time');
        const dateInput = document.getElementById('input-new-event-date');
        const tagSelect = document.getElementById('select-new-event-tag');

        const title = titleInput.value.trim();
        if (!title) return;

        const events = state.get('calendarEvents') || [];
        const newEvent = {
          id: 'e-' + Date.now(),
          title,
          time: timeInput?.value.trim() || '10:00 AM - 11:30 AM',
          date: dateInput?.value.trim() || 'Today',
          tag: tagSelect?.value || 'Deep Work'
        };

        events.push(newEvent);
        sound.playComplete();
        state.setKey('calendarEvents', events);
        if (supabaseService.isConfigured()) {
          supabaseService.syncEvent(newEvent).catch(err => console.warn(err));
        }

        titleInput.value = '';
        if (panel) panel.style.display = 'none';
        this.renderEvents();
      };
    }
  }
};
