/* ==========================================================================
   LifeOS Notes Module
   Second Brain Knowledge Hub, Thoughts & Markdown Notes
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';

export const notesModule = {
  /**
   * Initialize notes module view
   */
  init() {
    this.renderNotes();
    this.bindEvents();
  },

  renderNotes() {
    const container = document.getElementById('notes-list-container');
    if (!container) return;

    const notes = state.get('notes') || [];

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="placeholder-state" style="grid-column: 1 / -1;">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>
            </svg>
          </div>
          <h3 class="placeholder-title">No notes captured</h3>
          <p class="placeholder-text">Click "Capture Note" above to preserve thoughts, research, and documentation.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(n => `
      <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px; border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="font-weight: 600; font-size: var(--font-size-card-title); color: var(--color-text-main); line-height: 1.35;">${n.title}</div>
          <button class="btn btn-icon btn-sm" data-delete-note="${n.id}" title="Delete Note" style="width: 28px; height: 28px; color: var(--color-text-muted); flex-shrink: 0;" aria-label="Delete Note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <p style="font-size: var(--font-size-body); color: var(--color-text-secondary); line-height: 1.55; white-space: pre-wrap; margin: 0;">${n.content}</p>
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: auto; padding-top: 6px;">
          ${(n.tags || []).map(t => `<span class="badge badge-indigo" style="font-size: 11px;">#${t}</span>`).join('')}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); border-top: 1px solid var(--color-border-subtle); padding-top: 8px;">Updated ${n.updatedAt || 'Recently'}</div>
      </div>
    `).join('');

    this.bindDeletes();
  },

  bindDeletes() {
    document.querySelectorAll('[data-delete-note]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteNote;
        const notes = (state.get('notes') || []).filter(n => n.id !== id);
        sound.playClick();
        state.setKey('notes', notes);
        this.renderNotes();
      };
    });
  },

  bindEvents() {
    const btnShow = document.getElementById('btn-show-add-note');
    const panel = document.getElementById('add-note-panel');
    const btnCancel = document.getElementById('btn-cancel-add-note');
    const btnSubmit = document.getElementById('btn-submit-new-note');

    if (btnShow && panel) {
      btnShow.onclick = () => {
        sound.playClick();
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
          const titleInput = document.getElementById('input-new-note-title');
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
        const titleInput = document.getElementById('input-new-note-title');
        const contentInput = document.getElementById('input-new-note-content');
        const tagsInput = document.getElementById('input-new-note-tags');

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if (!title || !content) return;

        const tags = tagsInput.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);

        const notes = state.get('notes') || [];
        notes.unshift({
          id: 'n-' + Date.now(),
          title,
          content,
          tags: tags.length ? tags : ['general'],
          updatedAt: 'Just now'
        });

        sound.playComplete();
        state.setKey('notes', notes);

        titleInput.value = '';
        contentInput.value = '';
        tagsInput.value = '';
        if (panel) panel.style.display = 'none';
        this.renderNotes();
      };
    }
  }
};
