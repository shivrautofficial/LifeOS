/* ==========================================================================
   LifeOS Settings & Account Management Module
   User Profile, Verified Channels, Security, Cloud Sync & Data Ownership
   ========================================================================== */

import { state } from './state.js';
import { storage } from './storage.js';
import { onboarding, PROFESSIONS } from './onboarding.js';
import { sound } from './audio.js';
import { syncBackgroundVideos } from './app.js';
import { supabaseService } from './supabase.js';
import { dbSync } from './dbSync.js';
import { authService } from './auth.js';
import { authModal } from './authModal.js';
import { toast } from './toast.js';

export const settingsModule = {
  /**
   * Initialize settings module view
   */
  init() {
    this.populateCurrentValues();
    this.bindEvents();
  },

  /**
   * Pre-fill inputs with current state and authentication profile
   */
  populateCurrentValues() {
    const profile = authService.getProfile() || state.get('profile') || {};
    const user = authService.getUser();

    // Account Identity
    const avatarEl = document.getElementById('settings-user-avatar');
    const accountIdEl = document.getElementById('settings-account-id-label');
    const authStatusBadge = document.getElementById('settings-auth-status-badge');
    const btnOpenAuth = document.getElementById('btn-settings-open-auth');

    const nameInput = document.getElementById('setting-user-name');
    const usernameInput = document.getElementById('setting-username');
    const professionSelect = document.getElementById('setting-profession');
    const customRoleWrap = document.getElementById('setting-custom-role-wrap');
    const customRoleInput = document.getElementById('setting-custom-role');
    const timezoneSelect = document.getElementById('setting-timezone');
    const avatarInput = document.getElementById('setting-avatar-url');

    const emailDisplay = document.getElementById('settings-email-display');
    const emailBadge = document.getElementById('settings-email-status-badge');
    const phoneDisplay = document.getElementById('settings-phone-display');
    const phoneBadge = document.getElementById('settings-phone-status-badge');

    // Populate user profile
    const displayName = profile.display_name || profile.name || user?.email?.split('@')[0] || 'User';
    if (nameInput) nameInput.value = displayName;
    if (usernameInput) usernameInput.value = profile.username || '';
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

    if (professionSelect) {
      professionSelect.value = profile.profession || 'engineer';
      if (customRoleWrap) {
        customRoleWrap.style.display = (profile.profession === 'custom') ? 'block' : 'none';
      }
    }
    if (customRoleInput) {
      customRoleInput.value = profile.role_title || profile.roleTitle || 'Software Engineer';
    }
    if (timezoneSelect && profile.timezone) {
      timezoneSelect.value = profile.timezone;
    }
    if (avatarInput && profile.avatar_url) {
      avatarInput.value = profile.avatar_url;
    }

    // Populate auth status
    if (user) {
      if (accountIdEl) accountIdEl.textContent = `User ID: ${user.id.slice(0, 8)}...${user.id.slice(-4)}`;
      if (authStatusBadge) {
        authStatusBadge.textContent = 'Authenticated (Cloud)';
        authStatusBadge.className = 'badge badge-success';
      }
      if (btnOpenAuth) btnOpenAuth.style.display = 'none';

      // Verified Email Status
      if (emailDisplay) emailDisplay.textContent = user.email || 'None';
      if (emailBadge) {
        const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
        emailBadge.textContent = isEmailVerified ? 'Verified' : 'Pending Verification';
        emailBadge.className = isEmailVerified ? 'badge badge-success' : 'badge badge-warning';
      }

      // Verified Phone Status
      if (phoneDisplay) phoneDisplay.textContent = user.phone || 'None';
      if (phoneBadge) {
        const isPhoneVerified = Boolean(user.phone_confirmed_at);
        phoneBadge.textContent = isPhoneVerified ? 'Verified' : (user.phone ? 'Pending' : 'Not Linked');
        phoneBadge.className = isPhoneVerified ? 'badge badge-success' : 'badge badge-neutral';
      }
    } else {
      if (accountIdEl) accountIdEl.textContent = 'Local Guest Session • Unauthenticated';
      if (authStatusBadge) {
        authStatusBadge.textContent = 'Local Mode';
        authStatusBadge.className = 'badge badge-neutral';
      }
      if (btnOpenAuth) btnOpenAuth.style.display = 'inline-flex';
      if (emailDisplay) emailDisplay.textContent = 'Not logged in';
      if (phoneDisplay) phoneDisplay.textContent = 'Not logged in';
    }

    // Appearance Theme buttons
    const themeLightBtn = document.getElementById('setting-theme-light');
    const themeDarkBtn = document.getElementById('setting-theme-dark');
    const currentTheme = profile.theme || document.documentElement.getAttribute('data-theme') || 'dark';
    if (themeLightBtn && themeDarkBtn) {
      themeLightBtn.classList.toggle('active', currentTheme === 'light');
      themeDarkBtn.classList.toggle('active', currentTheme === 'dark');
    }

    // Supabase inputs and status
    const supabaseUrlInput = document.getElementById('setting-supabase-url');
    const supabaseKeyInput = document.getElementById('setting-supabase-key');
    const supabaseBadge = document.getElementById('supabase-status-badge');
    const realtimeBadge = document.getElementById('supabase-realtime-badge');
    const creds = supabaseService.getCredentials();

    if (supabaseUrlInput && creds.url) supabaseUrlInput.value = creds.url;
    if (supabaseKeyInput && creds.key) supabaseKeyInput.value = creds.key;

    if (supabaseBadge) {
      if (supabaseService.isConfigured()) {
        supabaseBadge.textContent = 'Configured';
        supabaseBadge.className = 'badge badge-success';
      } else {
        supabaseBadge.textContent = 'Not Connected';
        supabaseBadge.className = 'badge badge-neutral';
      }
    }

    // Database Engine Status
    const serverDbBadge = document.getElementById('server-db-status-badge');
    const dbTimestamp = document.getElementById('db-sync-timestamp');
    const status = dbSync.getStatus();

    if (serverDbBadge) {
      if (status.serverDbConnected) {
        serverDbBadge.textContent = 'Active & Connected';
        serverDbBadge.className = 'badge badge-success';
      } else {
        serverDbBadge.textContent = 'Offline Fallback Active';
        serverDbBadge.className = 'badge badge-warning';
      }
    }

    if (dbTimestamp && status.lastSyncTime) {
      dbTimestamp.textContent = `Last synced: ${new Date(status.lastSyncTime).toLocaleTimeString()}`;
    }

    if (realtimeBadge) {
      if (supabaseService.realtimeChannel) {
        realtimeBadge.textContent = 'Real-time Active';
        realtimeBadge.className = 'badge badge-success';
      } else {
        realtimeBadge.textContent = 'Real-time Off';
        realtimeBadge.className = 'badge badge-neutral';
      }
    }
  },

  /**
   * Bind settings actions & events
   */
  bindEvents() {
    const btnSave = document.getElementById('btn-save-settings');
    const nameInput = document.getElementById('setting-user-name');
    const usernameInput = document.getElementById('setting-username');
    const professionSelect = document.getElementById('setting-profession');
    const customRoleWrap = document.getElementById('setting-custom-role-wrap');
    const customRoleInput = document.getElementById('setting-custom-role');
    const timezoneSelect = document.getElementById('setting-timezone');
    const avatarInput = document.getElementById('setting-avatar-url');

    const btnOpenAuth = document.getElementById('btn-settings-open-auth');
    const btnUpdatePassword = document.getElementById('btn-update-password');
    const btnSignoutCurrent = document.getElementById('btn-signout-current');
    const btnSignoutAll = document.getElementById('btn-signout-all');

    const themeLightBtn = document.getElementById('setting-theme-light');
    const themeDarkBtn = document.getElementById('setting-theme-dark');
    const btnRelaunchOnboarding = document.getElementById('btn-relaunch-onboarding');

    const btnExport = document.getElementById('btn-export-backup');
    const fileImport = document.getElementById('setting-file-import');
    const btnResetStorage = document.getElementById('btn-reset-storage');
    const btnDeleteAccount = document.getElementById('btn-delete-account');

    // Toggle custom role visibility
    if (professionSelect && customRoleWrap) {
      professionSelect.onchange = () => {
        customRoleWrap.style.display = professionSelect.value === 'custom' ? 'block' : 'none';
      };
    }

    // Save Profile & Identity
    if (btnSave && nameInput && professionSelect) {
      btnSave.onclick = async () => {
        sound.playClick();
        btnSave.disabled = true;
        btnSave.textContent = 'Saving...';

        const newName = nameInput.value.trim() || 'User';
        const newUsername = usernameInput?.value.trim().toLowerCase() || '';
        const newProfessionKey = professionSelect.value;
        const customTitle = customRoleInput?.value.trim() || '';
        const prof = PROFESSIONS[newProfessionKey] || PROFESSIONS.general;
        const finalRole = (newProfessionKey === 'custom' && customTitle) ? customTitle : prof.title;
        const timezone = timezoneSelect?.value || 'UTC';
        const avatarUrl = avatarInput?.value.trim() || null;

        const profileData = {
          display_name: newName,
          username: newUsername || undefined,
          profession: prof.id,
          role_title: finalRole,
          timezone,
          avatar_url: avatarUrl,
          onboarded: true
        };

        const res = await authService.updateProfile(profileData);
        btnSave.disabled = false;
        btnSave.textContent = 'Save Profile';

        if (res.success) {
          sound.playComplete();
          toast.success('Profile and preferences updated successfully!');
          this.populateCurrentValues();
        } else {
          toast.error(res.error || 'Failed to update profile.');
        }
      };
    }

    // Open Auth Modal
    if (btnOpenAuth) {
      btnOpenAuth.onclick = () => {
        authModal.open('signin');
      };
    }

    // Update Password
    if (btnUpdatePassword) {
      btnUpdatePassword.onclick = async () => {
        const p1 = document.getElementById('setting-new-password')?.value;
        const p2 = document.getElementById('setting-confirm-password')?.value;

        if (!p1 || p1.length < 6) {
          toast.warning('Password must be at least 6 characters long.');
          return;
        }

        if (p1 !== p2) {
          toast.warning('New passwords do not match.');
          return;
        }

        btnUpdatePassword.disabled = true;
        btnUpdatePassword.textContent = 'Updating...';

        const res = await authService.updatePassword(p1);
        btnUpdatePassword.disabled = false;
        btnUpdatePassword.textContent = 'Update Password';

        if (res.success) {
          sound.playComplete();
          toast.success('Your password has been changed successfully.');
          document.getElementById('setting-new-password').value = '';
          document.getElementById('setting-confirm-password').value = '';
        } else {
          toast.error(res.error || 'Could not update password. Please re-authenticate.');
        }
      };
    }

    // Sign Out Current Device
    if (btnSignoutCurrent) {
      btnSignoutCurrent.onclick = async () => {
        if (confirm('Sign out from this device? Your saved cloud data will remain safe and sound.')) {
          sound.playClick();
          await authService.signOut({ scope: 'local' });
          this.populateCurrentValues();
        }
      };
    }

    // Sign Out All Devices
    if (btnSignoutAll) {
      btnSignoutAll.onclick = async () => {
        if (confirm('Sign out from all devices? This will invalidate all active sessions across phones and laptops.')) {
          sound.playClick();
          await authService.signOut({ scope: 'global' });
          this.populateCurrentValues();
        }
      };
    }

    // Theme Switchers
    const applyThemeSetting = (theme) => {
      sound.playClick();
      document.documentElement.setAttribute('data-theme', theme);
      authService.updateProfile({ theme });
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

    // Re-launch Onboarding
    if (btnRelaunchOnboarding) {
      btnRelaunchOnboarding.onclick = () => {
        sound.playClick();
        onboarding.openModal();
      };
    }

    // Export Complete JSON Archive
    if (btnExport) {
      btnExport.onclick = async () => {
        sound.playClick();
        btnExport.disabled = true;
        btnExport.textContent = 'Generating archive...';

        const archive = await authService.exportUserData();
        const jsonStr = JSON.stringify(archive, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifeos-backup-${archive.user?.id || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        btnExport.disabled = false;
        btnExport.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Export Complete Data (JSON)
        `;
        toast.success('Your complete personal data archive has been exported.');
      };
    }

    // Import JSON Backup
    if (fileImport) {
      fileImport.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            try {
              const parsed = JSON.parse(evt.target.result);
              if (parsed.data) {
                // Structured LifeOS archive
                if (parsed.data.tasks) state.setKey('todayTasks', parsed.data.tasks);
                if (parsed.data.habits) state.setKey('todayHabits', parsed.data.habits);
                if (parsed.data.goals) state.setKey('goals', parsed.data.goals);
                if (parsed.data.projects) state.setKey('projects', parsed.data.projects);
                if (parsed.data.calendarEvents) state.setKey('calendarEvents', parsed.data.calendarEvents);
                if (parsed.data.notes) state.setKey('notes', parsed.data.notes);
                if (parsed.user?.profile) state.setKey('profile', parsed.user.profile);
              } else {
                storage.importData(parsed);
              }

              // Also sync to cloud if authenticated
              if (authService.isAuthenticated()) {
                await supabaseService.pushAll(state.get());
              }

              sound.playComplete();
              toast.success('Data imported successfully! Updating workspace...');
              setTimeout(() => window.location.reload(), 600);
            } catch (err) {
              toast.error('Invalid backup file. Could not parse JSON.');
            }
          };
          reader.readAsText(file);
        }
      };
    }

    // Reset Local Storage
    if (btnResetStorage) {
      btnResetStorage.onclick = () => {
        if (confirm('Reset local storage on this browser? Your cloud database records will NOT be deleted.')) {
          storage.clear();
          state.reset();
          toast.info('Local storage reset.');
          setTimeout(() => window.location.reload(), 500);
        }
      };
    }

    // Delete Account Danger Zone
    if (btnDeleteAccount) {
      btnDeleteAccount.onclick = async () => {
        const input = window.prompt(
          'WARNING: You are about to permanently delete your LifeOS account and all associated tasks, habits, calendar, and notes across all servers.\n\nType "DELETE ACCOUNT" to proceed:'
        );
        if (input === 'DELETE ACCOUNT') {
          sound.playClick();
          btnDeleteAccount.disabled = true;
          btnDeleteAccount.textContent = 'Deleting account...';

          const res = await authService.deleteAccount('DELETE ACCOUNT');
          if (res.success) {
            toast.success('Your LifeOS account and all associated data have been deleted.');
            setTimeout(() => {
              window.location.hash = '#dashboard';
              window.location.reload();
            }, 600);
          } else {
            btnDeleteAccount.disabled = false;
            btnDeleteAccount.textContent = 'Delete LifeOS Account';
            toast.error(res.error || 'Failed to delete account.');
          }
        } else if (input !== null) {
          toast.warning('Account deletion cancelled: confirmation text did not match.');
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
          // Re-initialize auth
          await authService.init();
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
        showFeedback('Syncing local workspace to Supabase Cloud...', 'info');

        const res = await supabaseService.pushAll(state.get());
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

        const userId = authService.getUserId();
        if (!userId) {
          showFeedback('Please sign in first to pull your account-specific data from cloud.', 'error');
          return;
        }

        btnPullCloud.disabled = true;
        btnPullCloud.textContent = 'Pulling...';
        showFeedback('Fetching remote data from Supabase...', 'info');

        const res = await supabaseService.pullUserData(userId);
        btnPullCloud.disabled = false;
        btnPullCloud.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Pull from Cloud
        `;

        if (res.success) {
          sound.playComplete();
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

    // Database sync controls
    const btnForceDbSync = document.getElementById('btn-force-db-sync');
    const btnReloadDbState = document.getElementById('btn-reload-db-state');
    const dbTimestamp = document.getElementById('db-sync-timestamp');

    if (btnForceDbSync) {
      btnForceDbSync.onclick = async () => {
        sound.playClick();
        btnForceDbSync.disabled = true;
        btnForceDbSync.textContent = 'Syncing...';
        await dbSync.syncAll(state.get());
        btnForceDbSync.disabled = false;
        btnForceDbSync.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" aria-hidden="true">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
          Sync Database Now
        `;
        sound.playComplete();
        if (dbTimestamp) {
          dbTimestamp.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
        }
        toast.success('Database synchronized successfully!');
      };
    }

    if (btnReloadDbState) {
      btnReloadDbState.onclick = async () => {
        sound.playClick();
        btnReloadDbState.disabled = true;
        btnReloadDbState.textContent = 'Reloading...';
        const res = await dbSync.loadFromDatabase();
        btnReloadDbState.disabled = false;
        btnReloadDbState.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Reload From Database
        `;
        if (res.success) {
          sound.playComplete();
          if (dbTimestamp) {
            dbTimestamp.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
          }
          toast.success('State successfully reloaded from database!');
        } else {
          toast.info('Database offline; current local state preserved.');
        }
      };
    }
  }
};
