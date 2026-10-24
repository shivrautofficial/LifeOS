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
      container.innerHTML = `<div class="placeholder-state"><h3 class="placeholder-title">No notes captured</h3><p class="placeholder-text">Click "Capture Note" above to save your first idea.</p></div>`;
      return;
    }

    container.innerHTML = notes.map(n => `
      <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-midnight-navy);">${n.title}</div>
          <button class="btn btn-sm btn-icon" data-delete-note="${n.id}" title="Delete Note">✕</button>
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; white-space: pre-wrap;">${n.content}</p>
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: auto;">
          ${(n.tags || []).map(t => `<span class="badge badge-indigo">#${t}</span>`).join('')}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">Updated ${n.updatedAt || 'Recently'}</div>
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
        panel.style.display = 'none';
        this.renderNotes();
      };
    }
  }
};
