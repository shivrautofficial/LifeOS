/* ==========================================================================
   LifeOS Health Manager Module
   BMI Screening, Step Velocity, Hydration Tracking, Wellness Check-Ins & Trends
   ========================================================================== */

import { state } from './state.js';
import { storage } from './storage.js';
import { sound } from './audio.js';
import { toast } from './toast.js';

/**
 * Get current calendar date string in YYYY-MM-DD format based on local time
 * @returns {string}
 */
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD into friendly readable date (e.g. Oct 25, 2026 or Today)
 * @param {string} dateStr
 * @returns {string}
 */
function formatFriendlyDate(dateStr) {
  if (!dateStr) return 'Recent';
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return dateStr;
}

/**
 * Unit Conversion Utilities
 */
const UnitConverter = {
  cmToFtIn(cm) {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  },
  ftInToCm(feet, inches) {
    const totalInches = (Number(feet) * 12) + Number(inches);
    return Math.round(totalInches * 2.54 * 10) / 10;
  },
  kgToLbs(kg) {
    return Math.round(kg * 2.20462262 * 10) / 10;
  },
  lbsToKg(lbs) {
    return Math.round(lbs / 2.20462262 * 10) / 10;
  }
};

/**
 * Clinical BMI Screening Calculator and Category Evaluator
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number|null} [age]
 * @returns {object}
 */
function evaluateBmi(weightKg, heightCm, age = null) {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return {
      bmi: 0,
      category: 'Incomplete',
      badgeClass: 'badge-neutral',
      color: '#94A3B8',
      desc: 'Please enter height and weight measurements.',
      pointerPct: 50,
      isUnder20: false
    };
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;
  const isUnder20 = age !== null && age !== undefined && Number(age) > 0 && Number(age) < 20;

  // Standard Adult Screening Categories (CDC / WHO thresholds)
  let category = 'Healthy weight range';
  let badgeClass = 'badge-success';
  let color = '#10B981';
  let desc = 'Within standard adult reference screening range.';
  let pointerPct = 37.5; // mid healthy

  if (bmi < 18.5) {
    category = 'Underweight';
    badgeClass = 'badge-warning';
    color = '#60A5FA';
    desc = 'Below standard adult screening range.';
    pointerPct = Math.min(18, Math.max(3, (bmi / 18.5) * 20));
  } else if (bmi < 25.0) {
    category = 'Healthy weight range';
    badgeClass = 'badge-success';
    color = '#10B981';
    desc = 'Within standard adult reference screening range.';
    pointerPct = 20 + ((bmi - 18.5) / 6.5) * 35;
  } else if (bmi < 30.0) {
    category = 'Overweight';
    badgeClass = 'badge-warning';
    color = '#F59E0B';
    desc = 'Above standard adult screening range.';
    pointerPct = 55 + ((bmi - 25.0) / 5.0) * 25;
  } else {
    category = 'Obesity range';
    badgeClass = 'badge-error';
    color = '#EF4444';
    desc = 'Above standard adult screening threshold.';
    pointerPct = Math.min(96, 80 + ((bmi - 30.0) / 10.0) * 16);
  }

  if (isUnder20) {
    desc = `For individuals under age 20, growth chart sex/age percentiles must be assessed by a healthcare provider.`;
  }

  return {
    bmi,
    category,
    badgeClass,
    color,
    desc,
    pointerPct: Math.min(97, Math.max(3, pointerPct)),
    isUnder20
  };
}

export const healthModule = {
  currentTab: 'dashboard',

  /**
   * Initialize module lifecycle
   */
  init() {
    this.ensureDataStructure();
    const profile = this.getProfile();

    const onboardingPanel = document.getElementById('health-onboarding-panel');
    const dashboardView = document.getElementById('health-dashboard-view');
    const headerActions = document.getElementById('health-header-actions');

    if (!profile || !profile.heightCm || !profile.weightKg) {
      if (onboardingPanel) onboardingPanel.style.display = 'block';
      if (dashboardView) dashboardView.style.display = 'none';
      if (headerActions) headerActions.style.display = 'none';
      this.bindOnboardingEvents();
    } else {
      if (onboardingPanel) onboardingPanel.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'block';
      if (headerActions) headerActions.style.display = 'flex';
      this.renderAllWidgets();
      this.bindDashboardEvents();
    }
  },

  /**
   * Clean up on route destroy
   */
  destroy() {
    // Teardown any chart / timer handles if active
  },

  /**
   * Ensure state and storage structures exist
   */
  ensureDataStructure() {
    let profile = state.get('healthProfile') || storage.get('health_profile', null);
    let logs = state.get('healthDailyLogs') || storage.get('health_logs', null);

    if (!logs) {
      logs = {};
    }

    const today = getTodayDateString();
    if (!logs[today]) {
      logs[today] = {
        steps: 0,
        waterMl: 0,
        energy: 3,
        mood: 'good',
        sleepHours: 7.5,
        note: '',
        lastUpdated: new Date().toISOString()
      };
    }

    state.setKey('healthProfile', profile);
    state.setKey('healthDailyLogs', logs);
    storage.set('health_logs', logs);
    if (profile) storage.set('health_profile', profile);
  },

  getProfile() {
    return state.get('healthProfile') || storage.get('health_profile', null);
  },

  getLogs() {
    return state.get('healthDailyLogs') || storage.get('health_logs', {}) || {};
  },

  getTodayLog() {
    const today = getTodayDateString();
    const logs = this.getLogs();
    if (!logs[today]) {
      logs[today] = {
        steps: 0,
        waterMl: 0,
        energy: 3,
        mood: 'good',
        sleepHours: 7.5,
        note: '',
        lastUpdated: new Date().toISOString()
      };
      state.setKey('healthDailyLogs', logs);
      storage.set('health_logs', logs);
    }
    return logs[today];
  },

  saveProfile(profileData) {
    state.setKey('healthProfile', profileData);
    storage.set('health_profile', profileData);
  },

  saveTodayLog(updatedLog) {
    const today = getTodayDateString();
    const logs = { ...this.getLogs() };
    logs[today] = {
      ...logs[today],
      ...updatedLog,
      lastUpdated: new Date().toISOString()
    };
    state.setKey('healthDailyLogs', logs);
    storage.set('health_logs', logs);
  },

  /**
   * Master Render Coordinator
   */
  renderAllWidgets() {
    const profile = this.getProfile();
    const todayLog = this.getTodayLog();
    if (!profile) return;

    this.renderKPIStrip(profile, todayLog);
    this.renderBmiCard(profile);
    this.renderStepsCard(profile, todayLog);
    this.renderHydrationCard(profile, todayLog);
    this.renderWellnessCheckin(todayLog);
    this.renderActivityBars(profile);
    this.renderGoalsSummary(profile);
    this.renderRecentRecords();
  },

  /**
   * Render Top Summary KPI Cards
   */
  renderKPIStrip(profile, todayLog) {
    const kpiSteps = document.getElementById('stat-kpi-steps');
    const kpiStepsSub = document.getElementById('stat-kpi-steps-sub');
    const kpiWater = document.getElementById('stat-kpi-water');
    const kpiWaterSub = document.getElementById('stat-kpi-water-sub');
    const kpiBmi = document.getElementById('stat-kpi-bmi');
    const kpiBmiSub = document.getElementById('stat-kpi-bmi-sub');
    const kpiSleep = document.getElementById('stat-kpi-sleep');

    const steps = todayLog.steps || 0;
    const stepGoal = profile.stepGoal || 8000;
    const water = todayLog.waterMl || 0;
    const waterGoal = profile.waterGoal || 2000;
    const bmiEval = evaluateBmi(profile.weightKg, profile.heightCm, profile.age);

    if (kpiSteps) kpiSteps.textContent = steps.toLocaleString();
    if (kpiStepsSub) {
      const stepPct = Math.round((steps / stepGoal) * 100);
      kpiStepsSub.textContent = `${stepPct}% of ${stepGoal.toLocaleString()} goal`;
    }

    if (kpiWater) kpiWater.textContent = `${water.toLocaleString()} ml`;
    if (kpiWaterSub) {
      const waterPct = Math.round((water / waterGoal) * 100);
      kpiWaterSub.textContent = `${waterPct}% of ${waterGoal.toLocaleString()} ml`;
    }

    if (kpiBmi) kpiBmi.textContent = bmiEval.bmi ? bmiEval.bmi.toFixed(1) : '--';
    if (kpiBmiSub) kpiBmiSub.textContent = bmiEval.category;

    if (kpiSleep) {
      const sleepH = todayLog.sleepHours !== undefined && todayLog.sleepHours !== null ? todayLog.sleepHours : 7.5;
      kpiSleep.textContent = `${sleepH} hrs`;
    }
  },

  /**
   * Render BMI Calculation & Category Meter
   */
  renderBmiCard(profile) {
    const valEl = document.getElementById('bmi-numeric-value');
    const badgeEl = document.getElementById('bmi-badge-indicator');
    const catLabel = document.getElementById('bmi-category-label');
    const catDesc = document.getElementById('bmi-category-desc');
    const pointer = document.getElementById('bmi-meter-pointer');
    const refH = document.getElementById('bmi-ref-height');
    const refW = document.getElementById('bmi-ref-weight');
    const refAge = document.getElementById('bmi-ref-age');

    const evalResult = evaluateBmi(profile.weightKg, profile.heightCm, profile.age);

    if (valEl) valEl.textContent = evalResult.bmi ? evalResult.bmi.toFixed(1) : '--';
    if (badgeEl) {
      badgeEl.textContent = evalResult.category;
      badgeEl.className = `badge ${evalResult.badgeClass}`;
    }
    if (catLabel) catLabel.textContent = evalResult.category;
    if (catDesc) catDesc.textContent = evalResult.desc;
    if (pointer) pointer.style.left = `${evalResult.pointerPct}%`;

    if (refH) {
      if (profile.unitHeight === 'imperial') {
        const ftIn = UnitConverter.cmToFtIn(profile.heightCm);
        refH.textContent = `${ftIn.feet}'${ftIn.inches}" (${profile.heightCm} cm)`;
      } else {
        refH.textContent = `${profile.heightCm} cm`;
      }
    }

    if (refW) {
      if (profile.unitWeight === 'imperial') {
        const lbs = UnitConverter.kgToLbs(profile.weightKg);
        refW.textContent = `${lbs} lbs (${profile.weightKg} kg)`;
      } else {
        refW.textContent = `${profile.weightKg} kg`;
      }
    }

    if (refAge) {
      refAge.textContent = profile.age ? `${profile.age} yrs` : 'Not specified';
    }
  },

  /**
   * Render Daily Steps Hero Card & Circular Ring
   */
  renderStepsCard(profile, todayLog) {
    const countEl = document.getElementById('steps-count-display');
    const goalEl = document.getElementById('steps-goal-display');
    const remainEl = document.getElementById('steps-remaining-label');
    const pctLabel = document.getElementById('steps-percent-label');
    const ringFill = document.getElementById('steps-ring-fill');
    const distEl = document.getElementById('stat-est-distance');
    const actMinEl = document.getElementById('stat-est-active-min');
    const calsEl = document.getElementById('stat-est-calories');

    const steps = todayLog.steps || 0;
    const goal = profile.stepGoal || 8000;
    const pct = Math.min(100, Math.round((steps / goal) * 100));
    const remaining = Math.max(0, goal - steps);

    if (countEl) countEl.textContent = steps.toLocaleString();
    if (goalEl) goalEl.textContent = goal.toLocaleString();
    if (pctLabel) pctLabel.textContent = `${pct}%`;

    if (remainEl) {
      if (remaining === 0) {
        remainEl.textContent = 'Daily goal achieved! Great work 🎉';
        remainEl.style.color = 'var(--color-success)';
      } else {
        remainEl.textContent = `${remaining.toLocaleString()} steps remaining to goal`;
        remainEl.style.color = 'var(--color-primary)';
      }
    }

    // Circular Ring offset: radius = 42, circumference = 2 * PI * 42 ≈ 263.89
    if (ringFill) {
      const circum = 263.89;
      const offset = circum - ((pct / 100) * circum);
      ringFill.style.strokeDashoffset = offset;
      ringFill.style.stroke = pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)';
    }

    // Distance Calculation (average stride 0.762m)
    const distKm = (steps * 0.762) / 1000;
    if (distEl) {
      if (profile.unitHeight === 'imperial' || profile.unitWeight === 'imperial') {
        const distMiles = distKm * 0.621371;
        distEl.textContent = `${distMiles.toFixed(2)} mi`;
      } else {
        distEl.textContent = `${distKm.toFixed(2)} km`;
      }
    }

    // Active minutes estimate (100 steps/min brisk cadence)
    const activeMin = Math.round(steps / 100);
    if (actMinEl) actMinEl.textContent = `${activeMin} min`;

    // Calories estimate (~0.045 kcal/step baseline)
    const cals = Math.round(steps * 0.045);
    if (calsEl) calsEl.textContent = `${cals} kcal`;
  },

  /**
   * Render Hydration Fluid Tank & Controls
   */
  renderHydrationCard(profile, todayLog) {
    const consumedEl = document.getElementById('water-consumed-display');
    const targetEl = document.getElementById('water-target-display');
    const pctEl = document.getElementById('water-percent-display');
    const fillBar = document.getElementById('water-tank-fill');
    const badgeEl = document.getElementById('water-goal-badge');

    const water = todayLog.waterMl || 0;
    const goal = profile.waterGoal || 2000;
    const pct = Math.min(100, Math.round((water / goal) * 100));

    if (consumedEl) consumedEl.textContent = water.toLocaleString();
    if (targetEl) targetEl.textContent = goal.toLocaleString();
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (fillBar) fillBar.style.width = `${pct}%`;
    if (badgeEl) badgeEl.textContent = `Goal: ${goal.toLocaleString()} ml`;
  },

  /**
   * Render Wellness Check-In State
   */
  renderWellnessCheckin(todayLog) {
    const energy = todayLog.energy || 3;
    const mood = todayLog.mood || 'good';
    const sleep = todayLog.sleepHours !== undefined && todayLog.sleepHours !== null ? todayLog.sleepHours : 7.5;
    const note = todayLog.note || '';

    // Update Energy selector chips
    document.querySelectorAll('#energy-selector .selector-chip').forEach(chip => {
      const val = parseInt(chip.dataset.energy, 10);
      chip.classList.toggle('active', val === energy);
    });

    // Update Mood selector chips
    document.querySelectorAll('#mood-selector .selector-chip').forEach(chip => {
      const val = chip.dataset.mood;
      chip.classList.toggle('active', val === mood);
    });

    const sleepInput = document.getElementById('input-checkin-sleep');
    const noteInput = document.getElementById('input-checkin-note');

    if (sleepInput) sleepInput.value = sleep;
    if (noteInput) noteInput.value = note;
  },

  /**
   * Render 7-Day Activity Bar Visualizer
   */
  renderActivityBars(profile) {
    const container = document.getElementById('activity-bars-container');
    const avgEl = document.getElementById('stat-weekly-avg-steps');
    const daysMetEl = document.getElementById('stat-weekly-goal-days');
    const totalDistEl = document.getElementById('stat-weekly-total-dist');
    if (!container) return;

    const logs = this.getLogs();
    const stepGoal = profile.stepGoal || 8000;
    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate last 7 calendar days
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      past7Days.push({
        dateStr,
        dayName: daysShort[d.getDay()],
        isToday: i === 0,
        data: logs[dateStr] || null
      });
    }

    // Determine max steps for relative scale (at least stepGoal * 1.1)
    const maxStepFound = Math.max(...past7Days.map(p => (p.data?.steps || 0)), stepGoal);
    const scaleMax = Math.max(maxStepFound * 1.15, 1000);

    let recordedDaysCount = 0;
    let totalSteps = 0;
    let daysGoalMet = 0;

    container.innerHTML = past7Days.map(item => {
      const steps = item.data?.steps || 0;
      if (item.data && steps > 0) {
        recordedDaysCount++;
        totalSteps += steps;
        if (steps >= stepGoal) daysGoalMet++;
      }

      const barHeightPct = Math.max(4, Math.min(100, Math.round((steps / scaleMax) * 100)));
      const isMet = steps >= stepGoal;
      const isToday = item.isToday;

      return `
        <div class="activity-bar-col">
          <span class="activity-bar-val">${steps > 0 ? (steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps) : '-'}</span>
          <div class="activity-bar-pillar ${isMet ? 'goal-met' : ''} ${isToday ? 'today-bar' : ''}" 
               style="height: ${barHeightPct}%;" 
               title="${item.dateStr}: ${steps.toLocaleString()} steps (${isMet ? 'Goal Met' : 'In Progress'})">
          </div>
          <span class="activity-bar-label" style="${isToday ? 'color: var(--color-primary); font-weight: 700;' : ''}">${item.dayName}</span>
        </div>
      `;
    }).join('');

    // Summary calculations based purely on available real data
    const avgSteps = recordedDaysCount > 0 ? Math.round(totalSteps / recordedDaysCount) : (past7Days[6].data?.steps || 0);
    const totalDistKm = (totalSteps * 0.762) / 1000;

    if (avgEl) avgEl.textContent = avgSteps.toLocaleString();
    if (daysMetEl) daysMetEl.textContent = `${daysGoalMet} / 7`;
    if (totalDistEl) {
      if (profile.unitHeight === 'imperial' || profile.unitWeight === 'imperial') {
        const miles = totalDistKm * 0.621371;
        totalDistEl.textContent = `${miles.toFixed(2)} mi`;
      } else {
        totalDistEl.textContent = `${totalDistKm.toFixed(2)} km`;
      }
    }
  },

  /**
   * Render Goals & Preference Summary
   */
  renderGoalsSummary(profile) {
    const stepEl = document.getElementById('pref-step-goal-text');
    const waterEl = document.getElementById('pref-water-goal-text');

    if (stepEl) stepEl.textContent = `${(profile.stepGoal || 8000).toLocaleString()} steps`;
    if (waterEl) waterEl.textContent = `${(profile.waterGoal || 2000).toLocaleString()} ml`;
  },

  /**
   * Render Recent Records Feed / Table
   */
  renderRecentRecords() {
    const tbody = document.getElementById('health-records-tbody');
    const emptyEl = document.getElementById('health-records-empty');
    const countBadge = document.getElementById('records-count-badge');
    if (!tbody) return;

    const logs = this.getLogs();
    const dates = Object.keys(logs).sort().reverse(); // newest first
    const profile = this.getProfile() || {};

    if (dates.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (countBadge) countBadge.textContent = '0 entries';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (countBadge) countBadge.textContent = `${dates.length} recorded`;

    tbody.innerHTML = dates.slice(0, 10).map(dateStr => {
      const entry = logs[dateStr];
      const steps = entry.steps || 0;
      const water = entry.waterMl || 0;
      const sleep = entry.sleepHours !== undefined && entry.sleepHours !== null ? `${entry.sleepHours}h` : '--';
      const mood = entry.mood || 'neutral';
      const energy = entry.energy || 3;
      const note = entry.note ? entry.note : '<span style="color: var(--color-text-muted);">&mdash;</span>';

      const distKm = (steps * 0.762) / 1000;
      const distStr = (profile.unitHeight === 'imperial' || profile.unitWeight === 'imperial')
        ? `${(distKm * 0.621371).toFixed(2)} mi`
        : `${distKm.toFixed(2)} km`;

      const moodEmoji = {
        tired: '😴 Tired',
        low: '🌧️ Low',
        neutral: '😐 Neutral',
        good: '🙂 Good',
        great: '⚡ Great'
      }[mood] || mood;

      return `
        <tr>
          <td style="font-weight: 600; white-space: nowrap;">${formatFriendlyDate(dateStr)}</td>
          <td style="font-family: var(--font-family-mono); font-weight: 600;">${steps.toLocaleString()}</td>
          <td style="font-family: var(--font-family-mono); color: var(--color-text-secondary);">${distStr}</td>
          <td style="font-family: var(--font-family-mono); color: #3B82F6;">${water.toLocaleString()} ml</td>
          <td style="font-family: var(--font-family-mono);">${sleep}</td>
          <td><span class="badge badge-neutral" style="font-size: 11px;">${moodEmoji} &bull; L${energy}</span></td>
          <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${note}</td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Bind First-Time Setup Events
   */
  bindOnboardingEvents() {
    let selectedUnit = 'metric';
    const unitButtons = document.querySelectorAll('#onboarding-unit-toggle .segmented-btn');

    unitButtons.forEach(btn => {
      btn.onclick = () => {
        sound.playClick();
        unitButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedUnit = btn.dataset.unit;

        const groupHeightCm = document.getElementById('group-onboarding-height-cm');
        const groupHeightFt = document.getElementById('group-onboarding-height-ft');
        const groupWeightKg = document.getElementById('group-onboarding-weight-kg');
        const groupWeightLbs = document.getElementById('group-onboarding-weight-lbs');

        if (selectedUnit === 'metric') {
          if (groupHeightCm) groupHeightCm.style.display = 'block';
          if (groupHeightFt) groupHeightFt.style.display = 'none';
          if (groupWeightKg) groupWeightKg.style.display = 'block';
          if (groupWeightLbs) groupWeightLbs.style.display = 'none';
        } else {
          if (groupHeightCm) groupHeightCm.style.display = 'none';
          if (groupHeightFt) groupHeightFt.style.display = 'block';
          if (groupWeightKg) groupWeightKg.style.display = 'none';
          if (groupWeightLbs) groupWeightLbs.style.display = 'block';
        }
      };
    });

    const btnSave = document.getElementById('btn-save-onboarding-profile');
    const errorEl = document.getElementById('ob-validation-error');

    if (btnSave) {
      btnSave.onclick = () => {
        let heightCm = 0;
        let weightKg = 0;

        if (selectedUnit === 'metric') {
          heightCm = parseFloat(document.getElementById('input-ob-height-cm')?.value);
          weightKg = parseFloat(document.getElementById('input-ob-weight-kg')?.value);
        } else {
          const ft = parseFloat(document.getElementById('input-ob-height-ft')?.value) || 0;
          const inch = parseFloat(document.getElementById('input-ob-height-in')?.value) || 0;
          heightCm = UnitConverter.ftInToCm(ft, inch);

          const lbs = parseFloat(document.getElementById('input-ob-weight-lbs')?.value);
          weightKg = UnitConverter.lbsToKg(lbs);
        }

        const ageVal = document.getElementById('input-ob-age')?.value;
        const age = ageVal ? parseInt(ageVal, 10) : null;
        const stepGoal = parseInt(document.getElementById('input-ob-step-goal')?.value, 10) || 8000;
        const waterGoal = parseInt(document.getElementById('input-ob-water-goal')?.value, 10) || 2000;

        // Validation
        if (!heightCm || isNaN(heightCm) || heightCm < 50 || heightCm > 260) {
          if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Please enter a valid height (50 to 260 cm / 1\'8" to 8\'6").';
          }
          return;
        }

        if (!weightKg || isNaN(weightKg) || weightKg < 20 || weightKg > 300) {
          if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Please enter a valid weight (20 to 300 kg / 44 to 660 lbs).';
          }
          return;
        }

        if (age !== null && (isNaN(age) || age < 1 || age > 120)) {
          if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Please enter a valid age between 1 and 120, or leave it blank.';
          }
          return;
        }

        if (errorEl) errorEl.style.display = 'none';

        const newProfile = {
          heightCm,
          weightKg,
          age,
          unitHeight: selectedUnit === 'imperial' ? 'imperial' : 'metric',
          unitWeight: selectedUnit === 'imperial' ? 'imperial' : 'metric',
          stepGoal,
          waterGoal,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        this.saveProfile(newProfile);
        sound.playComplete();
        toast.success('Health profile established successfully!');
        this.init();
      };
    }
  },

  /**
   * Bind Active Dashboard Interactive Controls
   */
  bindDashboardEvents() {
    // Quick Add Steps on Hero card
    document.querySelectorAll('.btn-quick-step').forEach(btn => {
      btn.onclick = () => {
        const addAmount = parseInt(btn.dataset.add, 10) || 0;
        this.incrementSteps(addAmount);
      };
    });

    // Quick Add Water
    document.querySelectorAll('.btn-quick-water').forEach(btn => {
      btn.onclick = () => {
        const addAmount = parseInt(btn.dataset.add, 10) || 0;
        this.incrementWater(addAmount);
      };
    });

    // Undo Water
    const undoWaterBtn = document.getElementById('btn-undo-water');
    if (undoWaterBtn) {
      undoWaterBtn.onclick = () => {
        this.incrementWater(-250);
      };
    }

    // Energy level selection
    document.querySelectorAll('#energy-selector .selector-chip').forEach(chip => {
      chip.onclick = () => {
        sound.playClick();
        document.querySelectorAll('#energy-selector .selector-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      };
    });

    // Mood selection
    document.querySelectorAll('#mood-selector .selector-chip').forEach(chip => {
      chip.onclick = () => {
        sound.playClick();
        document.querySelectorAll('#mood-selector .selector-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      };
    });

    // Save Wellness Check-in
    const saveCheckinBtn = document.getElementById('btn-save-wellness-checkin');
    if (saveCheckinBtn) {
      saveCheckinBtn.onclick = () => {
        const activeEnergy = document.querySelector('#energy-selector .selector-chip.active');
        const activeMood = document.querySelector('#mood-selector .selector-chip.active');
        const sleepInput = document.getElementById('input-checkin-sleep');
        const noteInput = document.getElementById('input-checkin-note');

        const energy = activeEnergy ? parseInt(activeEnergy.dataset.energy, 10) : 3;
        const mood = activeMood ? activeMood.dataset.mood : 'good';
        const sleepHours = sleepInput ? parseFloat(sleepInput.value) || 7.5 : 7.5;
        const note = noteInput ? noteInput.value.trim() : '';

        this.saveTodayLog({ energy, mood, sleepHours, note });
        sound.playComplete();
        toast.success('Daily wellness check-in logged.');
        this.renderAllWidgets();
      };
    }

    // Modal Trigger: Open Edit Health Profile
    const openEditBtn = document.getElementById('btn-open-health-profile');
    const editGoalsBtn = document.getElementById('btn-edit-goals-pref');
    if (openEditBtn) openEditBtn.onclick = () => this.openProfileModal();
    if (editGoalsBtn) editGoalsBtn.onclick = () => this.openProfileModal();

    // Modal Trigger: Open Steps Modal
    const openStepsBtn = document.getElementById('btn-open-steps-modal');
    if (openStepsBtn) openStepsBtn.onclick = () => this.openStepsModal();

    // Modal Trigger: Open Custom Water Modal
    const openCustomWaterBtn = document.getElementById('btn-custom-water-modal');
    if (openCustomWaterBtn) openCustomWaterBtn.onclick = () => this.openWaterModal();

    // Modal Trigger: Clear Data Confirmation
    const triggerClearBtn = document.getElementById('btn-trigger-clear-health');
    if (triggerClearBtn) triggerClearBtn.onclick = () => this.openClearModal();

    // Bind Modal Internal Actions
    this.bindModalActions();
  },

  /**
   * Modal Logic & Handlers
   */
  bindModalActions() {
    // 1. Edit Profile Modal
    const profileModal = document.getElementById('modal-edit-health-profile');
    const closeProfileBtn = document.getElementById('btn-close-edit-profile');
    const cancelProfileBtn = document.getElementById('btn-cancel-edit-profile');
    const saveProfileBtn = document.getElementById('btn-save-edit-profile');
    const editUnitToggle = document.querySelectorAll('#edit-unit-toggle .segmented-btn');
    let editSelectedUnit = this.getProfile()?.unitHeight || 'metric';

    const closeProfileModal = () => {
      if (profileModal) profileModal.classList.remove('active');
    };

    if (closeProfileBtn) closeProfileBtn.onclick = closeProfileModal;
    if (cancelProfileBtn) cancelProfileBtn.onclick = closeProfileModal;

    editUnitToggle.forEach(btn => {
      btn.onclick = () => {
        sound.playClick();
        editUnitToggle.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editSelectedUnit = btn.dataset.unit;

        const gHCm = document.getElementById('group-edit-height-cm');
        const gHFt = document.getElementById('group-edit-height-ft');
        const gWKg = document.getElementById('group-edit-weight-kg');
        const gWLbs = document.getElementById('group-edit-weight-lbs');

        if (editSelectedUnit === 'metric') {
          if (gHCm) gHCm.style.display = 'block';
          if (gHFt) gHFt.style.display = 'none';
          if (gWKg) gWKg.style.display = 'block';
          if (gWLbs) gWLbs.style.display = 'none';
        } else {
          if (gHCm) gHCm.style.display = 'none';
          if (gHFt) gHFt.style.display = 'block';
          if (gWKg) gWKg.style.display = 'none';
          if (gWLbs) gWLbs.style.display = 'block';
        }
      };
    });

    if (saveProfileBtn) {
      saveProfileBtn.onclick = () => {
        let heightCm = 0;
        let weightKg = 0;
        const errEl = document.getElementById('edit-profile-error');

        if (editSelectedUnit === 'metric') {
          heightCm = parseFloat(document.getElementById('input-edit-height-cm')?.value);
          weightKg = parseFloat(document.getElementById('input-edit-weight-kg')?.value);
        } else {
          const ft = parseFloat(document.getElementById('input-edit-height-ft')?.value) || 0;
          const inch = parseFloat(document.getElementById('input-edit-height-in')?.value) || 0;
          heightCm = UnitConverter.ftInToCm(ft, inch);

          const lbs = parseFloat(document.getElementById('input-edit-weight-lbs')?.value);
          weightKg = UnitConverter.lbsToKg(lbs);
        }

        const ageVal = document.getElementById('input-edit-age')?.value;
        const age = ageVal ? parseInt(ageVal, 10) : null;
        const stepGoal = parseInt(document.getElementById('input-edit-step-goal')?.value, 10) || 8000;
        const waterGoal = parseInt(document.getElementById('input-edit-water-goal')?.value, 10) || 2000;

        if (!heightCm || isNaN(heightCm) || heightCm < 50 || heightCm > 260) {
          if (errEl) {
            errEl.style.display = 'block';
            errEl.textContent = 'Invalid height measurement (50–260 cm).';
          }
          return;
        }

        if (!weightKg || isNaN(weightKg) || weightKg < 20 || weightKg > 300) {
          if (errEl) {
            errEl.style.display = 'block';
            errEl.textContent = 'Invalid weight measurement (20–300 kg).';
          }
          return;
        }

        if (errEl) errEl.style.display = 'none';

        const updatedProfile = {
          ...this.getProfile(),
          heightCm,
          weightKg,
          age,
          unitHeight: editSelectedUnit,
          unitWeight: editSelectedUnit,
          stepGoal,
          waterGoal,
          lastUpdated: new Date().toISOString()
        };

        this.saveProfile(updatedProfile);
        closeProfileModal();
        sound.playComplete();
        toast.success('Health profile and targets updated.');
        this.renderAllWidgets();
      };
    }

    // 2. Steps Modal
    const stepsModal = document.getElementById('modal-update-steps');
    const closeStepsBtn = document.getElementById('btn-close-steps-modal');
    const cancelStepsBtn = document.getElementById('btn-cancel-steps-modal');
    const confirmStepsBtn = document.getElementById('btn-confirm-save-steps');
    const stepsInput = document.getElementById('input-manual-steps');

    const closeStepsModal = () => {
      if (stepsModal) stepsModal.classList.remove('active');
    };

    if (closeStepsBtn) closeStepsBtn.onclick = closeStepsModal;
    if (cancelStepsBtn) cancelStepsBtn.onclick = closeStepsModal;

    document.querySelectorAll('.btn-modal-quick-step').forEach(btn => {
      btn.onclick = () => {
        sound.playClick();
        const add = parseInt(btn.dataset.add, 10) || 0;
        const current = parseInt(stepsInput?.value, 10) || 0;
        if (stepsInput) stepsInput.value = current + add;
      };
    });

    if (confirmStepsBtn) {
      confirmStepsBtn.onclick = () => {
        const val = parseInt(stepsInput?.value, 10);
        if (isNaN(val) || val < 0) {
          toast.warning('Please enter a valid positive step count.');
          return;
        }
        this.saveTodayLog({ steps: val });
        closeStepsModal();
        sound.playComplete();
        toast.success(`Step count set to ${val.toLocaleString()}.`);
        this.renderAllWidgets();
      };
    }

    // 3. Custom Water Modal
    const waterModal = document.getElementById('modal-custom-water');
    const closeWaterBtn = document.getElementById('btn-close-custom-water');
    const cancelWaterBtn = document.getElementById('btn-cancel-custom-water');
    const confirmWaterBtn = document.getElementById('btn-confirm-custom-water');
    const waterInput = document.getElementById('input-custom-water-ml');

    const closeWaterModal = () => {
      if (waterModal) waterModal.classList.remove('active');
    };

    if (closeWaterBtn) closeWaterBtn.onclick = closeWaterModal;
    if (cancelWaterBtn) cancelWaterBtn.onclick = closeWaterModal;

    if (confirmWaterBtn) {
      confirmWaterBtn.onclick = () => {
        const addMl = parseInt(waterInput?.value, 10);
        if (isNaN(addMl) || addMl <= 0) {
          toast.warning('Please enter a valid amount in milliliters.');
          return;
        }
        this.incrementWater(addMl);
        closeWaterModal();
      };
    }

    // 4. Clear Data Confirmation Modal
    const clearModal = document.getElementById('modal-clear-health');
    const closeClearBtn = document.getElementById('btn-close-clear-modal');
    const cancelClearBtn = document.getElementById('btn-cancel-clear-modal');
    const confirmClearBtn = document.getElementById('btn-confirm-clear-health');

    const closeClearModal = () => {
      if (clearModal) clearModal.classList.remove('active');
    };

    if (closeClearBtn) closeClearBtn.onclick = closeClearModal;
    if (cancelClearBtn) cancelClearBtn.onclick = closeClearModal;

    if (confirmClearBtn) {
      confirmClearBtn.onclick = () => {
        state.setKey('healthProfile', null);
        state.setKey('healthDailyLogs', {});
        storage.remove('health_profile');
        storage.remove('health_logs');
        closeClearModal();
        sound.playClick();
        toast.info('Health Manager data cleared. Returning to setup.');
        this.init();
      };
    }

    // Global Modal Escape listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeProfileModal();
        closeStepsModal();
        closeWaterModal();
        closeClearModal();
      }
    });
  },

  openProfileModal() {
    sound.playClick();
    const modal = document.getElementById('modal-edit-health-profile');
    const profile = this.getProfile();
    if (!profile) return;

    const unit = profile.unitHeight || 'metric';
    document.querySelectorAll('#edit-unit-toggle .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.unit === unit);
    });

    const gHCm = document.getElementById('group-edit-height-cm');
    const gHFt = document.getElementById('group-edit-height-ft');
    const gWKg = document.getElementById('group-edit-weight-kg');
    const gWLbs = document.getElementById('group-edit-weight-lbs');

    if (unit === 'metric') {
      if (gHCm) gHCm.style.display = 'block';
      if (gHFt) gHFt.style.display = 'none';
      if (gWKg) gWKg.style.display = 'block';
      if (gWLbs) gWLbs.style.display = 'none';
    } else {
      if (gHCm) gHCm.style.display = 'none';
      if (gHFt) gHFt.style.display = 'block';
      if (gWKg) gWKg.style.display = 'none';
      if (gWLbs) gWLbs.style.display = 'block';
    }

    const inHCm = document.getElementById('input-edit-height-cm');
    const inHFt = document.getElementById('input-edit-height-ft');
    const inHIn = document.getElementById('input-edit-height-in');
    const inWKg = document.getElementById('input-edit-weight-kg');
    const inWLbs = document.getElementById('input-edit-weight-lbs');
    const inAge = document.getElementById('input-edit-age');
    const inStep = document.getElementById('input-edit-step-goal');
    const inWater = document.getElementById('input-edit-water-goal');

    if (inHCm) inHCm.value = profile.heightCm || 175;
    if (inWKg) inWKg.value = profile.weightKg || 70;

    const ftIn = UnitConverter.cmToFtIn(profile.heightCm || 175);
    if (inHFt) inHFt.value = ftIn.feet;
    if (inHIn) inHIn.value = ftIn.inches;
    if (inWLbs) inWLbs.value = UnitConverter.kgToLbs(profile.weightKg || 70);

    if (inAge) inAge.value = profile.age || '';
    if (inStep) inStep.value = profile.stepGoal || 8000;
    if (inWater) inWater.value = profile.waterGoal || 2000;

    const err = document.getElementById('edit-profile-error');
    if (err) err.style.display = 'none';

    if (modal) modal.classList.add('active');
  },

  openStepsModal() {
    sound.playClick();
    const modal = document.getElementById('modal-update-steps');
    const input = document.getElementById('input-manual-steps');
    const todayLog = this.getTodayLog();

    if (input) {
      input.value = todayLog.steps || 0;
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
    }
    if (modal) modal.classList.add('active');
  },

  openWaterModal() {
    sound.playClick();
    const modal = document.getElementById('modal-custom-water');
    if (modal) modal.classList.add('active');
  },

  openClearModal() {
    sound.playClick();
    const modal = document.getElementById('modal-clear-health');
    if (modal) modal.classList.add('active');
  },

  incrementSteps(amount) {
    sound.playClick();
    const todayLog = this.getTodayLog();
    const newSteps = Math.max(0, (todayLog.steps || 0) + amount);
    this.saveTodayLog({ steps: newSteps });
    toast.success(`Today's steps: ${newSteps.toLocaleString()}`);
    this.renderAllWidgets();
  },

  incrementWater(amount) {
    sound.playClick();
    const todayLog = this.getTodayLog();
    const newWater = Math.max(0, (todayLog.waterMl || 0) + amount);
    this.saveTodayLog({ waterMl: newWater });
    if (amount > 0) {
      toast.success(`Logged +${amount} ml. Today: ${newWater.toLocaleString()} ml`);
    } else {
      toast.info(`Adjusted hydration. Today: ${newWater.toLocaleString()} ml`);
    }
    this.renderAllWidgets();
  }
};
