/* ==========================================================================
   LifeOS Settings Module
   User Preferences, Profession Persona, Appearance & Data Portability
   ========================================================================== */

import { state } from './state.js';
import { storage } from './storage.js';
import { onboarding, PROFESSIONS } from './onboarding.js';
import { sound } from './audio.js';
import { supabaseService } from './supabase.js';

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

    // Supabase inputs and status
    const supabaseUrlInput = document.getElementById('setting-supabase-url');
    const supabaseKeyInput = document.getElementById('setting-supabase-key');
    const supabaseBadge = document.getElementById('supabase-status-badge');
    const creds = supabaseService.getCredentials();

    if (supabaseUrlInput && creds.url) {
      supabaseUrlInput.value = creds.url;
    }
    if (supabaseKeyInput && creds.key) {
      supabaseKeyInput.value = creds.key;
    }
    if (supabaseBadge) {
      if (supabaseService.isConfigured()) {
        supabaseBadge.textContent = 'Configured';
        supabaseBadge.className = 'badge badge-success';
      } else {
        supabaseBadge.textContent = 'Not Connected';
        supabaseBadge.className = 'badge badge-neutral';
      }
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

    // Supabase Cloud Controls
    const btnSaveSupabase = document.getElementById('btn-save-supabase');
    const btnTestSupabase = document.getElementById('btn-test-supabase');
    const btnPushCloud = document.getElementById('btn-sync-to-cloud');
    const btnPullCloud = document.getElementById('btn-sync-from-cloud');
    const btnClearSupabase = document.getElementById('btn-clear-supabase');
    const supabaseUrlInput = document.getElementById('setting-supabase-url');
    const supabaseKeyInput = document.getElementById('setting-supabase-key');
    const supabaseBadge = document.getElementById('supabase-status-badge');
    const feedbackBox = document.getElementById('supabase-feedback-box');

    const showFeedback = (text, type = 'info') => {
      if (!feedbackBox) return;
      feedbackBox.style.display = 'block';
      feedbackBox.textContent = text;
      if (type === 'success') {
        feedbackBox.style.backgroundColor = 'var(--color-success-bg, #dcfce7)';
        feedbackBox.style.color = 'var(--color-success-text, #15803d)';
        feedbackBox.style.border = '1px solid var(--color-success-border, #bbf7d0)';
      } else if (type === 'error') {
        feedbackBox.style.backgroundColor = 'var(--color-danger-bg, #fee2e2)';
        feedbackBox.style.color = 'var(--color-danger-text, #b91c1c)';
        feedbackBox.style.border = '1px solid var(--color-danger-border, #fecaca)';
      } else {
        feedbackBox.style.backgroundColor = 'var(--color-info-bg, #e0f2fe)';
        feedbackBox.style.color = 'var(--color-info-text, #0369a1)';
        feedbackBox.style.border = '1px solid var(--color-info-border, #bae6fd)';
      }
    };

    if (btnSaveSupabase && supabaseUrlInput && supabaseKeyInput) {
      btnSaveSupabase.onclick = async () => {
        sound.playClick();
        const url = supabaseUrlInput.value.trim();
        const key = supabaseKeyInput.value.trim();

        if (!url || !key) {
          showFeedback('Please provide both a valid Project URL and Anon Key.', 'error');
          return;
        }

        showFeedback('Initializing Supabase client...', 'info');
        const ok = await supabaseService.saveConfig(url, key);
        if (ok) {
          sound.playComplete();
          if (supabaseBadge) {
            supabaseBadge.textContent = 'Configured';
            supabaseBadge.className = 'badge badge-success';
          }
          showFeedback('Supabase credentials saved successfully! Click "Test Connection" to verify access.', 'success');
        } else {
          showFeedback('Could not initialize Supabase. Check the URL and network connectivity.', 'error');
        }
      };
    }

    if (btnTestSupabase) {
      btnTestSupabase.onclick = async () => {
        sound.playClick();
        btnTestSupabase.disabled = true;
        btnTestSupabase.textContent = 'Testing...';
        showFeedback('Connecting to Supabase database...', 'info');

        const res = await supabaseService.testConnection();
        btnTestSupabase.disabled = false;
        btnTestSupabase.textContent = 'Test Connection';

        if (res.success) {
          sound.playComplete();
          if (supabaseBadge) {
            supabaseBadge.textContent = 'Connected';
            supabaseBadge.className = 'badge badge-success';
          }
          showFeedback(res.message, res.warning ? 'info' : 'success');
        } else {
          if (supabaseBadge) {
            supabaseBadge.textContent = 'Error';
            supabaseBadge.className = 'badge badge-danger';
          }
          showFeedback(res.message, 'error');
        }
      };
    }

    if (btnPushCloud) {
      btnPushCloud.onclick = async () => {
        sound.playClick();
        if (!supabaseService.isConfigured()) {
          showFeedback('Please save valid Supabase credentials first before pushing data.', 'error');
          return;
        }

        btnPushCloud.disabled = true;
        btnPushCloud.textContent = 'Pushing...';
        showFeedback('Syncing local tasks, habits, goals, and notes to Supabase...', 'info');

        const res = await supabaseService.pushAll(state.data);
        btnPushCloud.disabled = false;
        btnPushCloud.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Push to Cloud
        `;

        if (res.success) {
          sound.playComplete();
          showFeedback(res.message, 'success');
        } else {
          showFeedback(res.message, 'error');
        }
      };
    }

    if (btnPullCloud) {
      btnPullCloud.onclick = async () => {
        sound.playClick();
        if (!supabaseService.isConfigured()) {
          showFeedback('Please save valid Supabase credentials first before pulling data.', 'error');
          return;
        }

        if (!confirm('Pulling from cloud will merge remote items into your local workspace. Proceed?')) {
          return;
        }

        btnPullCloud.disabled = true;
        btnPullCloud.textContent = 'Pulling...';
        showFeedback('Fetching remote data from Supabase...', 'info');

        const res = await supabaseService.pullAll();
        btnPullCloud.disabled = false;
        btnPullCloud.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Pull from Cloud
        `;

        if (res.success && res.data) {
          sound.playComplete();
          // Merge non-empty pulled data
          if (res.data.tasks && res.data.tasks.length > 0) state.setKey('tasks', res.data.tasks);
          if (res.data.habits && res.data.habits.length > 0) state.setKey('habits', res.data.habits);
          if (res.data.goals && res.data.goals.length > 0) state.setKey('goals', res.data.goals);
          if (res.data.notes && res.data.notes.length > 0) state.setKey('notes', res.data.notes);

          showFeedback('Cloud data synchronized into local workspace successfully!', 'success');
        } else {
          showFeedback(res.message, 'error');
        }
      };
    }

    if (btnClearSupabase) {
      btnClearSupabase.onclick = () => {
        sound.playClick();
        if (confirm('Disconnect Supabase credentials? Your data will remain stored locally.')) {
          supabaseService.clearConfig();
          if (supabaseUrlInput) supabaseUrlInput.value = '';
          if (supabaseKeyInput) supabaseKeyInput.value = '';
          if (supabaseBadge) {
            supabaseBadge.textContent = 'Not Connected';
            supabaseBadge.className = 'badge badge-neutral';
          }
          showFeedback('Supabase credentials removed. Running in offline/local-first mode.', 'info');
        }
      };
    }
  }
};
