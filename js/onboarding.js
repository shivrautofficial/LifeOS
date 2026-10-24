/* ==========================================================================
   LifeOS Onboarding Module
   Multi-Profession Persona Selection, Custom Role Setup & Profile Initialization
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';

export const PROFESSIONS = {
  engineer: {
    id: 'engineer',
    title: 'Software Engineer',
    description: 'Track code sprints, architecture deliverables, and technical habits.',
    badgeText: 'Tech & Architecture'
  },
  student: {
    id: 'student',
    title: 'Student & Academic',
    description: 'Track coursework deadlines, study blocks, and academic research.',
    badgeText: 'Academic Track'
  },
  founder: {
    id: 'founder',
    title: 'Founder & Executive',
    description: 'Track strategic OKRs, runway metrics, and business milestones.',
    badgeText: 'Venture & Growth'
  },
  creator: {
    id: 'creator',
    title: 'Creator & Designer',
    description: 'Track content releases, creative pipeline, and production cycles.',
    badgeText: 'Media & Design'
  },
  freelancer: {
    id: 'freelancer',
    title: 'Freelancer & Consultant',
    description: 'Track client deliverables, billable milestones, and proposals.',
    badgeText: 'Consulting & Contracts'
  },
  general: {
    id: 'general',
    title: 'General / Life Balance',
    description: 'Track personal health, daily habits, reading goals, and family routines.',
    badgeText: 'Holistic Life'
  },
  custom: {
    id: 'custom',
    title: 'Custom Profession',
    description: 'Define your own specialized professional workflow and title.',
    badgeText: 'Specialized'
  }
};

export const onboarding = {
  /**
   * Check if user has already selected their initial persona
   * @returns {boolean}
   */
  isCompleted() {
    return Boolean(state.get('profile')?.onboarded);
  },

  /**
   * Set user's active profession persona
   * @param {string} professionKey
   * @param {string} [customTitle]
   */
  selectProfession(professionKey, customTitle = '') {
    const prof = PROFESSIONS[professionKey] || PROFESSIONS.general;
    const currentProfile = state.get('profile') || {};
    const resolvedTitle = (professionKey === 'custom' && customTitle.trim())
      ? customTitle.trim()
      : prof.title;

    state.set({
      profile: {
        ...currentProfile,
        profession: prof.id,
        roleTitle: resolvedTitle,
        onboarded: true
      }
    });

    return prof;
  },

  /**
   * Get list of all available profession configurations
   * @returns {Array<object>}
   */
  getAvailableProfessions() {
    return Object.values(PROFESSIONS);
  },

  /**
   * Initialize interactive onboarding modal if present
   */
  initModal() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;

    // Check if onboarding should open automatically
    if (!this.isCompleted()) {
      this.openModal();
    }

    // Close / Skip handlers
    const btnClose = document.getElementById('btn-close-onboarding');
    const btnSkip = document.getElementById('btn-skip-onboarding');
    const btnSave = document.getElementById('btn-save-onboarding');

    if (btnClose) btnClose.onclick = () => this.closeModal();
    if (btnSkip) {
      btnSkip.onclick = () => {
        sound.playClick();
        const profile = state.get('profile') || {};
        state.setKey('profile', { ...profile, onboarded: true });
        this.closeModal();
      };
    }

    if (btnSave) {
      btnSave.onclick = () => {
        sound.playComplete();
        const nameInput = document.getElementById('onboarding-name-input');
        const customInput = document.getElementById('onboarding-custom-role-input');
        const activeCard = document.querySelector('.persona-select-card.active');
        const selectedId = activeCard ? activeCard.dataset.profId : 'engineer';

        const name = nameInput?.value.trim() || state.get('profile')?.name || 'User';
        const customTitle = customInput?.value.trim() || '';

        const currentProfile = state.get('profile') || {};
        const prof = PROFESSIONS[selectedId] || PROFESSIONS.general;
        const finalRole = (selectedId === 'custom' && customTitle) ? customTitle : prof.title;

        state.set({
          profile: {
            ...currentProfile,
            name,
            profession: selectedId,
            roleTitle: finalRole,
            onboarded: true
          }
        });

        this.closeModal();
      };
    }
  },

  /**
   * Open modal and render persona selection options
   */
  openModal() {
    const modal = document.getElementById('onboarding-modal');
    const grid = document.getElementById('onboarding-persona-grid');
    const nameInput = document.getElementById('onboarding-name-input');
    const customWrap = document.getElementById('onboarding-custom-role-wrap');
    const profile = state.get('profile') || {};

    if (!modal) return;

    if (nameInput) {
      nameInput.value = profile.name || '';
    }

    if (grid) {
      const currentProf = profile.profession || 'engineer';
      grid.innerHTML = this.getAvailableProfessions().map(p => `
        <div class="card persona-select-card ${p.id === currentProf ? 'active' : ''}" 
             data-prof-id="${p.id}"
             style="padding: 10px 12px; cursor: pointer; border-radius: var(--radius-md); transition: all 150ms; ${p.id === currentProf ? 'border-color: var(--color-primary); background: var(--color-soft-indigo);' : ''}">
          <div style="font-weight: 600; font-size: 13px; color: var(--color-text-main); margin-bottom: 2px;">${p.title}</div>
          <div style="font-size: 11px; color: var(--color-text-secondary); line-height: 1.3;">${p.description}</div>
        </div>
      `).join('');

      grid.querySelectorAll('.persona-select-card').forEach(card => {
        card.onclick = () => {
          sound.playClick();
          grid.querySelectorAll('.persona-select-card').forEach(c => {
            c.classList.remove('active');
            c.style.borderColor = 'var(--color-border)';
            c.style.background = 'var(--color-bg-card)';
          });
          card.classList.add('active');
          card.style.borderColor = 'var(--color-primary)';
          card.style.background = 'var(--color-soft-indigo)';

          if (customWrap) {
            customWrap.style.display = card.dataset.profId === 'custom' ? 'block' : 'none';
          }
        };
      });
    }

    modal.classList.add('open');
  },

  /**
   * Close onboarding modal
   */
  closeModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.remove('open');
  }
};
