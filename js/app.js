/* ==========================================================================
   LifeOS Main Application Entry Point
   Module Bootstrapping, Event Binding, Theme Toggle & Sound Integration
   ========================================================================== */

import { state } from './state.js';
import { router } from './router.js';
import { onboarding } from './onboarding.js';
import { sound } from './audio.js';
import { supabaseService } from './supabase.js';
import { authService } from './auth.js';
import { authModal } from './authModal.js';
import { toast } from './toast.js';

window.toast = toast;
window.authService = authService;
window.authModal = authModal;

/**
 * Initialize LifeOS Application
 */
async function initLifeOS() {
  console.info('[LifeOS] Initializing One Life. One Dashboard...');

  // Initialize Authentication & Cloud Database Services
  authModal.init();
  authService.init().catch(err => console.warn('[LifeOS Auth] Init error:', err));

  const contentContainer = document.getElementById('app-content');
  const breadcrumbContainer = document.getElementById('header-breadcrumb');

  // Initialize Theme from State (Default Dark)
  initTheme();

  // Initialize Background Video Streamers
  initBackgroundVideos();

  // Initialize Pointer-Responsive Desktop Ambient Spotlight
  initAmbientSpotlight();

  // Initialize Audio Controls
  initAudioControls();

  // Initialize Client-Side Router
  if (contentContainer && breadcrumbContainer) {
    router.init(contentContainer, breadcrumbContainer);
  }

  // Update User Profile Widgets in Sidebar & Header
  updateUserProfileDisplay();
  updateSidebarMetrics();

  // Initialize Onboarding Modal if needed
  onboarding.initModal();

  // Subscribe to state changes to keep profile & badges in sync
  state.subscribe(() => {
    updateUserProfileDisplay();
    updateSidebarMetrics();
  });

  // Mobile Drawer Toggle & Backdrop
  const mobileToggle = document.getElementById('btn-mobile-menu');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const closeMobileSidebar = () => {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  };

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sound.playClick();
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closeMobileSidebar();
      });
    }
  }

  // Universal Quick-Add Modal Engine
  initQuickAddModal();

  // Global Quick Jump / Search Bar (⌘K / Ctrl+K)
  initGlobalSearch();

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
 * Update Sidebar Badges from active state
 */
function updateSidebarMetrics() {
  const taskCountEl = document.getElementById('sidebar-task-count');
  if (taskCountEl) {
    const tasks = state.get('todayTasks') || [];
    const pending = tasks.filter(t => !t.done).length;
    taskCountEl.textContent = pending;
  }
}

/**
 * Universal Quick Add Modal Engine
 */
function initQuickAddModal() {
  const modal = document.getElementById('quick-add-modal');
  const closeBtn = document.getElementById('btn-close-quick-add');
  const cancelBtn = document.getElementById('btn-cancel-quick-add');
  const submitBtn = document.getElementById('btn-submit-quick-add');
  const tabsContainer = document.getElementById('quick-add-tabs');
  const quickActionBtn = document.getElementById('btn-quick-action');

  let activeTab = 'task'; // task, event, goal, note

  const showTab = (tabName) => {
    activeTab = tabName;
    if (tabsContainer) {
      tabsContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
      });
    }

    const views = ['task', 'event', 'goal', 'note'];
    views.forEach(v => {
      const el = document.getElementById(`qa-form-${v}`);
      if (el) el.style.display = (v === tabName) ? 'block' : 'none';
    });

    setTimeout(() => {
      if (tabName === 'task') document.getElementById('qa-task-title')?.focus();
      else if (tabName === 'event') document.getElementById('qa-event-title')?.focus();
      else if (tabName === 'goal') document.getElementById('qa-goal-title')?.focus();
      else if (tabName === 'note') document.getElementById('qa-note-title')?.focus();
    }, 50);
  };

  const openModal = (tabName = 'task') => {
    sound.playClick();
    showTab(tabName);
    if (modal) modal.classList.add('active');
  };

  const closeModal = () => {
    if (modal) modal.classList.remove('active');
  };

  window.openQuickAddModal = openModal;

  if (quickActionBtn) {
    quickActionBtn.onclick = () => openModal('task');
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeModal();
    }
  });

  if (tabsContainer) {
    tabsContainer.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        sound.playClick();
        const tab = btn.getAttribute('data-tab');
        if (tab) showTab(tab);
      };
    });
  }

  if (submitBtn) {
    submitBtn.onclick = () => {
      if (activeTab === 'task') {
        const titleInput = document.getElementById('qa-task-title');
        const title = titleInput?.value.trim();
        if (!title) {
          toast.warning('Please enter a deliverable title.');
          titleInput?.focus();
          return;
        }
        const priority = document.getElementById('qa-task-priority')?.value || 'high';
        const due = document.getElementById('qa-task-due')?.value || 'Today';

        const tasks = state.get('todayTasks') || [];
        const newTask = {
          id: 't-' + Date.now(),
          title,
          priority,
          due,
          done: false,
          status: 'todo',
          category: 'work'
        };

        state.setKey('todayTasks', [newTask, ...tasks]);
        if (supabaseService.isConfigured()) {
          supabaseService.syncTask(newTask).catch(err => console.warn(err));
        }

        sound.playComplete();
        toast.success(`Deliverable "${title}" added to active pipeline.`);
        if (titleInput) titleInput.value = '';
        closeModal();

      } else if (activeTab === 'event') {
        const titleInput = document.getElementById('qa-event-title');
        const title = titleInput?.value.trim();
        if (!title) {
          toast.warning('Please enter an event or block title.');
          titleInput?.focus();
          return;
        }
        const time = document.getElementById('qa-event-time')?.value.trim() || '10:00 AM - 11:30 AM';
        const tag = document.getElementById('qa-event-tag')?.value || 'Deep Work';

        const events = state.get('calendarEvents') || [];
        const newEvent = {
          id: 'e-' + Date.now(),
          title,
          time,
          date: 'Today',
          tag
        };

        state.setKey('calendarEvents', [...events, newEvent]);
        if (supabaseService.isConfigured()) {
          supabaseService.syncEvent(newEvent).catch(err => console.warn(err));
        }
        sound.playComplete();
        toast.success(`Schedule block "${title}" added.`);
        if (titleInput) titleInput.value = '';
        closeModal();

      } else if (activeTab === 'goal') {
        const titleInput = document.getElementById('qa-goal-title');
        const title = titleInput?.value.trim();
        if (!title) {
          toast.warning('Please enter a goal title.');
          titleInput?.focus();
          return;
        }
        const category = document.getElementById('qa-goal-category')?.value || 'Career';
        const targetDate = document.getElementById('qa-goal-target')?.value.trim() || 'Q4 2026';

        const goals = state.get('goals') || [];
        const newGoal = {
          id: 'g-' + Date.now(),
          title,
          category,
          progress: 10,
          targetDate
        };

        state.setKey('goals', [...goals, newGoal]);
        if (supabaseService.isConfigured()) {
          supabaseService.syncGoal(newGoal).catch(err => console.warn(err));
        }
        sound.playComplete();
        toast.success(`Milestone "${title}" established.`);
        if (titleInput) titleInput.value = '';
        closeModal();

      } else if (activeTab === 'note') {
        const titleInput = document.getElementById('qa-note-title');
        const title = titleInput?.value.trim();
        if (!title) {
          toast.warning('Please enter a note title.');
          titleInput?.focus();
          return;
        }
        const content = document.getElementById('qa-note-content')?.value.trim() || '';

        const notes = state.get('notes') || [];
        const newNote = {
          id: 'n-' + Date.now(),
          title,
          content,
          tags: ['quick-capture'],
          pinned: false,
          updatedAt: 'Just now'
        };

        state.setKey('notes', [newNote, ...notes]);
        if (supabaseService.isConfigured()) {
          supabaseService.syncNote(newNote).catch(err => console.warn(err));
        }
        sound.playComplete();
        toast.success(`Note "${title}" saved to Second Brain.`);
        if (titleInput) titleInput.value = '';
        const contentEl = document.getElementById('qa-note-content');
        if (contentEl) contentEl.value = '';
        closeModal();
      }
    };
  }
}

/**
 * Initialize Global Search & Keyboard Shortcut (⌘K / Ctrl+K)
 */
function initGlobalSearch() {
  const searchInput = document.getElementById('global-search-input');

  // Command/Ctrl + K focus shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) return;

        // Command triggers: "+", "new", "add", "create"
        if (query.startsWith('+') || query.startsWith('new') || query.startsWith('add') || query.startsWith('create')) {
          if (query.includes('event') || query.includes('cal')) {
            window.openQuickAddModal('event');
          } else if (query.includes('goal') || query.includes('okr')) {
            window.openQuickAddModal('goal');
          } else if (query.includes('note')) {
            window.openQuickAddModal('note');
          } else {
            window.openQuickAddModal('task');
          }
          searchInput.value = '';
          searchInput.blur();
          return;
        }

        const routeMap = {
          dash: 'dashboard',
          task: 'tasks',
          todo: 'tasks',
          cal: 'calendar',
          event: 'calendar',
          goal: 'goals',
          okr: 'goals',
          health: 'health',
          fitness: 'health',
          bmi: 'health',
          step: 'health',
          water: 'health',
          habit: 'habits',
          streak: 'habits',
          proj: 'projects',
          note: 'notes',
          brain: 'notes',
          insight: 'insights',
          metric: 'insights',
          stat: 'insights',
          setting: 'settings',
          pref: 'settings'
        };

        for (const [key, route] of Object.entries(routeMap)) {
          if (query.includes(key)) {
            sound.playClick();
            router.navigate(route);
            searchInput.value = '';
            searchInput.blur();
            return;
          }
        }

        // Default to tasks if unmatched
        router.navigate('tasks');
        searchInput.value = '';
        searchInput.blur();
      }
    });
  }
}

/**
 * Initialize Pointer-Responsive Desktop Ambient Spotlight
 */
function initAmbientSpotlight() {
  const spotlight = document.getElementById('ambient-spotlight');
  if (!spotlight || !window.matchMedia('(pointer: fine)').matches) return;

  let ticking = false;
  window.addEventListener('pointermove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        if (!spotlight.classList.contains('active')) {
          spotlight.classList.add('active');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    spotlight.classList.remove('active');
  });
}

/**
 * Initialize Theme Switcher (Dark / Light)
 */
function initTheme() {
  const profile = state.get('profile') || {};
  const currentTheme = profile.theme || 'dark';
  applyTheme(currentTheme);

  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      sound.playClick();
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
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
  syncBackgroundVideos(theme);
}

/**
 * Manage background video playback according to active theme
 * @param {string} theme ('dark' | 'light')
 */
export function syncBackgroundVideos(theme) {
  const darkVideo = document.getElementById('video-bg-dark');
  const lightVideo = document.getElementById('video-bg-light');

  const playSafe = (vid) => {
    if (!vid) return;
    vid.muted = true;
    const promise = vid.play();
    if (promise !== undefined) {
      promise.catch(err => {
        // Autoplay policy or interaction needed
        console.debug('[LifeOS Background Video] Autoplay deferred until interaction:', err.message);
      });
    }
  };

  if (theme === 'dark') {
    playSafe(darkVideo);
  } else {
    playSafe(lightVideo);
  }
}

/**
 * Initialize background videos and attach user interaction listener for autoplay
 */
function initBackgroundVideos() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  syncBackgroundVideos(currentTheme);

  const onUserInteract = () => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    syncBackgroundVideos(activeTheme);
    window.removeEventListener('pointerdown', onUserInteract);
    window.removeEventListener('keydown', onUserInteract);
  };

  window.addEventListener('pointerdown', onUserInteract, { once: true });
  window.addEventListener('keydown', onUserInteract, { once: true });
}

/**
 * Audio FX & Sound Mute Toggle
 */
function initAudioControls() {
  const audioBtn = document.getElementById('btn-audio-toggle');
  const labelEl = document.getElementById('audio-toggle-label');

  if (audioBtn) {
    // Set initial label based on saved muted status
    const isMuted = localStorage.getItem('lifeos_sound_muted') === 'true';
    if (labelEl) labelEl.textContent = isMuted ? 'Muted' : 'Sound FX';

    audioBtn.addEventListener('click', () => {
      const nowMuted = sound.toggleMute();
      if (labelEl) {
        labelEl.textContent = nowMuted ? 'Muted' : 'Sound FX';
      }
      if (!nowMuted) sound.playComplete();
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', initLifeOS);
