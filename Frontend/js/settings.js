/* ==========================================================================
   LifeOS Settings Module
   User Preferences, Profession Persona & Data Portability
   ========================================================================== */

import { state } from './state.js';
import { storage } from './storage.js';
import { onboarding, PROFESSIONS } from './onboarding.js';

export const settingsModule = {
  /**
   * Initialize settings module view
   */
  init() {
    this.populateCurrentValues();
    this.bindEvents();
  },

  /**
   * Pre-fill inputs with current state
   */
  populateCurrentValues() {
    const profile = state.get('profile');
    const nameInput = document.getElementById('setting-user-name');
    const professionSelect = document.getElementById('setting-profession');

    if (nameInput && profile?.name) {
      nameInput.value = profile.name;
    }

    if (professionSelect && profile?.profession) {
      professionSelect.value = profile.profession;
    }
  },

  /**
   * Bind settings actions
   */
  bindEvents() {
    const btnSave = document.getElementById('btn-save-settings');
    const nameInput = document.getElementById('setting-user-name');
    const professionSelect = document.getElementById('setting-profession');
    const btnExport = document.getElementById('btn-export-backup');
    const fileImport = document.getElementById('setting-file-import');
    const btnReset = document.getElementById('btn-reset-storage');

    if (btnSave && nameInput && professionSelect) {
      btnSave.addEventListener('click', () => {
        const newName = nameInput.value.trim() || 'User';
        const newProfessionKey = professionSelect.value;
        const prof = PROFESSIONS[newProfessionKey] || PROFESSIONS.general;

        state.set({
          profile: {
            name: newName,
            profession: prof.id,
            roleTitle: prof.title,
            onboarded: true
          }
        });

        alert('Settings saved successfully!');
      });
    }

    // Export JSON Backup
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const jsonStr = storage.exportData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Import JSON Backup
    if (fileImport) {
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const success = storage.importData(evt.target.result);
            if (success) {
              alert('LifeOS data imported successfully. Reloading view...');
              window.location.reload();
            } else {
              alert('Failed to import data: invalid JSON structure.');
            }
          };
          reader.readAsText(file);
        }
      });
    }

    // Reset Storage
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all LifeOS data back to baseline defaults?')) {
          storage.clear();
          state.reset();
          alert('LifeOS reset to initial baseline.');
          window.location.hash = '#dashboard';
          window.location.reload();
        }
      });
    }
  }
};
