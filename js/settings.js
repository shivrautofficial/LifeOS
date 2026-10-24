/* ==========================================================================
   LifeOS Settings Module
   User Preferences, Profession Persona, Appearance & Data Portability
   ========================================================================== */

import { state } from './state.js';
import { storage } from './storage.js';
import { onboarding, PROFESSIONS } from './onboarding.js';
import { sound } from './audio.js';
import { syncBackgroundVideos } from './app.js';

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
    const profile = state.get('profile') || {};
    const nameInput = document.getElementById('setting-user-name');
    const professionSelect = document.getElementById('setting-profession');
    const customRoleWrap = document.getElementById('setting-custom-role-wrap');
    const customRoleInput = document.getElementById('setting-custom-role');
    const themeLightBtn = document.getElementById('setting-theme-light');
    const themeDarkBtn = document.getElementById('setting-theme-dark');

    if (nameInput && profile.name) {
      nameInput.value = profile.name;
    }

    if (professionSelect && profile.profession) {
      professionSelect.value = profile.profession;
      if (customRoleWrap) {
        customRoleWrap.style.display = profile.profession === 'custom' ? 'block' : 'none';
      }
      if (customRoleInput && profile.roleTitle) {
        customRoleInput.value = profile.roleTitle;
      }
    }

    const currentTheme = profile.theme || document.documentElement.getAttribute('data-theme') || 'light';
    if (themeLightBtn && themeDarkBtn) {
      themeLightBtn.classList.toggle('active', currentTheme === 'light');
      themeDarkBtn.classList.toggle('active', currentTheme === 'dark');
    }
  },

  /**
   * Bind settings actions
   */
  bindEvents() {
    const btnSave = document.getElementById('btn-save-settings');
    const nameInput = document.getElementById('setting-user-name');
    const professionSelect = document.getElementById('setting-profession');
    const customRoleWrap = document.getElementById('setting-custom-role-wrap');
    const customRoleInput = document.getElementById('setting-custom-role');

    const themeLightBtn = document.getElementById('setting-theme-light');
    const themeDarkBtn = document.getElementById('setting-theme-dark');
    const btnRelaunchOnboarding = document.getElementById('btn-relaunch-onboarding');

    const btnExport = document.getElementById('btn-export-backup');
    const fileImport = document.getElementById('setting-file-import');
    const btnReset = document.getElementById('btn-reset-storage');

    // Toggle custom role visibility
    if (professionSelect && customRoleWrap) {
      professionSelect.onchange = () => {
        customRoleWrap.style.display = professionSelect.value === 'custom' ? 'block' : 'none';
      };
    }

    // Save Settings
    if (btnSave && nameInput && professionSelect) {
      btnSave.onclick = () => {
        sound.playComplete();
        const newName = nameInput.value.trim() || 'User';
        const newProfessionKey = professionSelect.value;
        const customTitle = customRoleInput?.value.trim() || '';
        const prof = PROFESSIONS[newProfessionKey] || PROFESSIONS.general;
        const finalRole = (newProfessionKey === 'custom' && customTitle) ? customTitle : prof.title;

        state.set({
          profile: {
            ...state.get('profile'),
            name: newName,
            profession: prof.id,
            roleTitle: finalRole,
            onboarded: true
          }
        });

        alert('Settings saved successfully!');
      };
    }

    // Theme Switchers inside Settings
    const applyThemeSetting = (theme) => {
      sound.playClick();
      document.documentElement.setAttribute('data-theme', theme);
      state.setKey('profile', {
        ...state.get('profile'),
        theme
      });
      if (themeLightBtn && themeDarkBtn) {
        themeLightBtn.classList.toggle('active', theme === 'light');
        themeDarkBtn.classList.toggle('active', theme === 'dark');
      }
      const headerThemeIcon = document.getElementById('theme-icon');
      if (headerThemeIcon) {
        headerThemeIcon.innerHTML = theme === 'dark'
          ? `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`
          : `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
      }
      syncBackgroundVideos(theme);
    };

    if (themeLightBtn) themeLightBtn.onclick = () => applyThemeSetting('light');
    if (themeDarkBtn) themeDarkBtn.onclick = () => applyThemeSetting('dark');

    // Re-launch Onboarding Modal
    if (btnRelaunchOnboarding) {
      btnRelaunchOnboarding.onclick = () => {
        sound.playClick();
        onboarding.openModal();
      };
    }

    // Export JSON Backup
    if (btnExport) {
      btnExport.onclick = () => {
        sound.playClick();
        const jsonStr = storage.exportData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    // Import JSON Backup
    if (fileImport) {
      fileImport.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const success = storage.importData(evt.target.result);
            if (success) {
              sound.playComplete();
              alert('LifeOS data imported successfully. Reloading view...');
              window.location.reload();
            } else {
              alert('Failed to import data: invalid JSON structure.');
            }
          };
          reader.readAsText(file);
        }
      };
    }

    // Reset Storage
    if (btnReset) {
      btnReset.onclick = () => {
        if (confirm('Are you sure you want to reset all LifeOS data back to baseline defaults? This cannot be undone.')) {
          storage.clear();
          state.reset();
          alert('LifeOS has been reset to baseline defaults.');
          window.location.hash = '#dashboard';
          window.location.reload();
        }
      };
    }
  }
};
