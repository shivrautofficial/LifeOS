/* ==========================================================================
   LifeOS Onboarding Module
   Role / Profession Selection & Profile Initialization
   ========================================================================== */

import { state } from './state.js';

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
   */
  selectProfession(professionKey) {
    const prof = PROFESSIONS[professionKey] || PROFESSIONS.general;
    const currentProfile = state.get('profile');

    state.set({
      profile: {
        ...currentProfile,
        profession: prof.id,
        roleTitle: prof.title,
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
  }
};
