/* ==========================================================================
   LifeOS Main Application Entry Point
   Module Bootstrapping, Event Binding, Theme Toggle & Sound Integration
   ========================================================================== */

import { state } from './state.js';
import { router } from './router.js';
import { onboarding } from './onboarding.js';
import { sound } from './audio.js';

/**
 * Initialize LifeOS Application
 */
function initLifeOS() {
  console.info('[LifeOS] Initializing One Life. One Dashboard...');

  const contentContainer = document.getElementById('app-content');
  const breadcrumbContainer = document.getElementById('header-breadcrumb');

  // Initialize Theme from State
  initTheme();

  // Initialize Audio Controls
  initAudioControls();

  // Initialize Client-Side Router
  if (contentContainer && breadcrumbContainer) {
    router.init(contentContainer, breadcrumbContainer);
  }

  // Update User Profile Widgets in Sidebar
  updateUserProfileDisplay();

  // Subscribe to state changes to keep profile in sync
  state.subscribe((currentState) => {
    updateUserProfileDisplay();
  });

  // Mobile Drawer Toggle
  const mobileToggle = document.getElementById('btn-mobile-menu');
  const sidebar = document.getElementById('app-sidebar');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sound.playClick();
      sidebar.classList.toggle('mobile-open');
    });

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (
        sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) &&
        !mobileToggle.contains(e.target)
      ) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }

  // Header Quick Action (Add / Jump to Tasks)
  const quickActionBtn = document.getElementById('btn-quick-action');
  if (quickActionBtn) {
    quickActionBtn.addEventListener('click', () => {
      sound.playClick();
      router.navigate('tasks');
    });
  }

  console.info('[LifeOS] Foundation established successfully.');
}

/**
 * Synchronize UI profile displays with current state
 */
function updateUserProfileDisplay() {
  const profile = state.get('profile');
  if (!profile) return;

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  if (nameEl) nameEl.textContent = profile.name || 'User';
  if (roleEl) roleEl.textContent = profile.roleTitle || 'Professional';
  if (avatarEl && profile.name) {
    avatarEl.textContent = profile.name.charAt(0).toUpperCase();
  }
}

/**
 * Initialize Theme Switcher (Dark / Light)
 */
function initTheme() {
  const profile = state.get('profile') || {};
  const currentTheme = profile.theme || 'light';
  applyTheme(currentTheme);

  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      sound.playClick();
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);

      state.setKey('profile', {
        ...state.get('profile'),
        theme: nextTheme
      });
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.innerHTML = theme === 'dark'
      ? `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`
      : `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
  }
}

/**
 * Audio FX & Sound Mute Toggle
 */
function initAudioControls() {
  const audioBtn = document.getElementById('btn-audio-toggle');
  const labelEl = document.getElementById('audio-toggle-label');

  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      if (labelEl) {
        labelEl.textContent = isMuted ? 'Muted' : 'Sound FX';
      }
      if (!isMuted) sound.playComplete();
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', initLifeOS);
