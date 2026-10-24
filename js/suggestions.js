/* ==========================================================================
   LifeOS Notes & AI Action Center Module
   Second Brain Knowledge Hub, AI Semantic Synthesis & Next-Action Telemetry
   ========================================================================== */

import { state } from './state.js';
import { sound } from './audio.js';
import { toast } from './toast.js';
import { dbSync } from './dbSync.js';
import { supabaseService } from './supabase.js';

let unsubscribeState = null;

export const suggestionsModule = {
  domainChart: null,
  matrixChart: null,
  activeSuggestionFilter: 'all',
  activeTagFilter: 'all',
  searchQuery: '',
  currentSuggestions: [],
  addedSuggestionIds: new Set(),

  /**
   * Initialize notes and AI suggestions center
   */
  init() {
    this.seedDefaultNotesIfEmpty();
    this.runAiAnalysis(false);
    this.renderNotes();
    this.bindEvents();
    if (unsubscribeState) unsubscribeState();
    unsubscribeState = state.subscribe(() => {
      this.renderNotes();
    });
  },

  destroy() {
    if (unsubscribeState) {
      unsubscribeState();
      unsubscribeState = null;
    }
  },

  /**
   * Clean up Chart.js instances on route leave
   */
  destroy() {
    if (this.domainChart) {
      this.domainChart.destroy();
      this.domainChart = null;
    }
    if (this.matrixChart) {
      this.matrixChart.destroy();
      this.matrixChart = null;
    }
  },

  /**
   * Ensure rich default knowledge items are present so user gets immediate AI value
   */
  seedDefaultNotesIfEmpty() {
    let notes = state.get('notes') || [];
    if (notes.length < 3) {
      const defaultKnowledge = [
        {
          id: 'n-1',
          title: 'LifeOS Architectural Philosophy',
          content: 'One Life. One Dashboard. Completely privacy-first with local-first persistence, zero telemetry, and instantaneous client-side navigation.\n\nTODO: Implement Redis or IndexedDB caching layer to ensure 0ms latency for mood & health telemetry sync before product demo.',
          tags: ['architecture', 'privacy', 'database'],
          pinned: true,
          updatedAt: '10 mins ago'
        },
        {
          id: 'n-2',
          title: 'Sprint Execution & Milestone 1 Checklist',
          content: 'Key deliverables for hackathon submission:\n- [ ] Finalize full Supabase cloud sync error-boundaries\n- [ ] Record 60-second walkthrough demo of Second Brain\n- [ ] Audit responsive styles on mobile drawer viewports',
          tags: ['sprint', 'execution', 'mvp'],
          pinned: true,
          updatedAt: '2 hours ago'
        },
        {
          id: 'n-3',
          title: 'Deep Work & Circadian Focus Protocol',
          content: 'Morning peak hours between 9:00 AM and 11:30 AM yield 3x higher cognitive throughput. Protect this window from shallow communication and admin tasks.\n\nAction: Block 90-minute daily deep sprint before noon.',
          tags: ['wellness', 'focus', 'circadian'],
          pinned: false,
          updatedAt: 'Yesterday'
        },
        {
          id: 'n-4',
          title: 'Design System Identity & Tokens',
          content: 'Linear-grade visual hierarchy: Midnight Navy (#111827) + Electric Indigo (#6366F1) + Soft Lavender (#EEF2FF). Minimal, fast, accessible frosted-glass aesthetics with zero vibe-coded clutter.',
          tags: ['design', 'tokens', 'ui'],
          pinned: false,
          updatedAt: '2 days ago'
        }
      ];

      // Merge defaults without overriding any custom notes user already made
      const existingIds = new Set(notes.map(n => n.id));
      defaultKnowledge.forEach(dn => {
        if (!existingIds.has(dn.id)) notes.push(dn);
      });
      state.setKey('notes', notes);
    }
  },

  /**
   * Run AI semantic synthesis over notes, tasks, goals and habits
   * @param {boolean} notifyUser - whether to trigger audio & toast feedback
   */
  runAiAnalysis(notifyUser = true) {
    const notes = state.get('notes') || [];
    const goals = state.get('goals') || [];
    const tasks = state.get('todayTasks') || [];
    const habits = state.get('todayHabits') || [];

    // Synthesize next action recommendations
    this.currentSuggestions = this.generateAiSuggestions(notes, goals, tasks, habits);

    // Update Banner Telemetry & KPIs
    this.renderAiBannerMetrics(notes);

    // Render Charts and Written Action List
    this.renderCharts();
    this.renderWrittenSuggestions();

    if (notifyUser) {
      sound.playComplete();
      toast.success(`AI Analysis Synthesized: ${this.currentSuggestions.length} actionable next steps formulated`);
    }
  },

  /**
   * AI Inference & Heuristic Synthesis Engine
   */
  generateAiSuggestions(notes, goals, tasks, habits) {
    const suggestions = [];
    const seenTitles = new Set();

    // 1. Analyze each note for explicit action items, TODOs, and architectural directives
    notes.forEach((note, idx) => {
      const text = `${note.title} ${note.content}`.toLowerCase();
      const rawLines = (note.content || '').split('\n');

      // Check for explicit TODO lines
      rawLines.forEach(line => {
        const clean = line.replace(/^[\s\-\*\•\d\.\>\#\[\]xX]+/, '').trim();
        if (/^(todo|action|need to|must|implement|fix|record|finalize|audit|optimize|schedule|benchmark|draft|refactor):?/i.test(clean)) {
          const formattedTitle = clean.replace(/^(todo|action|need to|must):?\s*/i, '').trim();
          if (formattedTitle.length > 8 && !seenTitles.has(formattedTitle.toLowerCase())) {
            seenTitles.add(formattedTitle.toLowerCase());
            
            let cat = 'execution';
            let catLabel = 'Sprint Delivery';
            if (/(cache|redis|supabase|database|architecture|token|query|api)/i.test(formattedTitle)) {
              cat = 'tech';
              catLabel = 'Architecture & Tech';
            } else if (/(focus|circadian|sleep|health|workout|morning|habit)/i.test(formattedTitle)) {
              cat = 'wellness';
              catLabel = 'Focus & Health';
            } else if (/(quick|audit|verify|check|15m)/i.test(formattedTitle)) {
              cat = 'quick';
              catLabel = '⚡ Quick Win';
            }

            suggestions.push({
              id: `sug-note-${note.id}-${idx}`,
              title: formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1),
              category: cat,
              categoryLabel: catLabel,
              urgency: cat === 'tech' ? 'Critical' : (cat === 'execution' ? 'High' : 'Strategic'),
              impactScore: Math.floor(88 + Math.random() * 10),
              effortMins: cat === 'quick' ? 15 : (cat === 'wellness' ? 90 : 45),
              rationale: `Directly extracted from note "${note.title}". Closing this action item eliminates active technical friction.`,
              sourceNoteTitle: note.title,
              sourceNoteId: note.id
            });
          }
        }
      });

      // Domain-specific heuristic synthesis if no explicit todo
      if (/(architecture|database|cache|redis|sync|latency)/i.test(text) && !seenTitles.has('redis-cache')) {
        seenTitles.add('redis-cache');
        suggestions.push({
          id: 'sug-arch-1',
          title: 'Implement Redis / IndexedDB Caching Layer for Health Telemetry',
          category: 'tech',
          categoryLabel: 'Architecture & Tech',
          urgency: 'Critical',
          impactScore: 96,
          effortMins: 45,
          rationale: `Synthesized from note "${note.title}". You emphasized local-first speed; caching will eliminate network latency before project review.`,
          sourceNoteTitle: note.title,
          sourceNoteId: note.id
        });
      }

      if (/(sprint|hackathon|demo|submission|walkthrough)/i.test(text) && !seenTitles.has('demo-walkthrough')) {
        seenTitles.add('demo-walkthrough');
        suggestions.push({
          id: 'sug-exec-1',
          title: 'Record 60-Second Second Brain Walkthrough Demo',
          category: 'execution',
          categoryLabel: 'Sprint Delivery',
          urgency: 'High',
          impactScore: 93,
          effortMins: 30,
          rationale: `Cross-referenced with active Goal "Ship LifeOS Hackathon MVP" (90% complete). Video asset is the primary remaining milestone.`,
          sourceNoteTitle: note.title,
          sourceNoteId: note.id
        });
      }

      if (/(circadian|deep work|focus|morning)/i.test(text) && !seenTitles.has('circadian-block')) {
        seenTitles.add('circadian-block');
        suggestions.push({
          id: 'sug-well-1',
          title: 'Schedule 90-Min Morning Focus Block for Complex Module Refactor',
          category: 'wellness',
          categoryLabel: 'Focus & Health',
          urgency: 'Strategic',
          impactScore: 89,
          effortMins: 90,
          rationale: `Synthesized from note "${note.title}". Protect morning hours between 9:00 AM - 11:30 AM from meetings to maximize output.`,
          sourceNoteTitle: note.title,
          sourceNoteId: note.id
        });
      }
    });

    // 2. Synthesize alignment with Strategic Goals
    if (goals.length > 0 && !seenTitles.has('goal-align')) {
      const topGoal = goals[0];
      seenTitles.add('goal-align');
      suggestions.push({
        id: 'sug-goal-1',
        title: `Advance Milestone for Goal: "${topGoal.title}"`,
        category: 'execution',
        categoryLabel: 'Sprint Delivery',
        urgency: 'High',
        impactScore: 91,
        effortMins: 45,
        rationale: `Current progress is at ${topGoal.progress}%. Completing today's priority task directly closes the remaining gap toward ${topGoal.targetDate || 'target'}.`,
        sourceNoteTitle: 'Strategic Goals Sync',
        sourceNoteId: null
      });
    }

    // 3. Fallback Quick Win if needed
    if (!seenTitles.has('quick-win')) {
      suggestions.push({
        id: 'sug-quick-1',
        title: 'Run Quick 10-Minute Schema Validation & JSON Export Backup',
        category: 'quick',
        categoryLabel: '⚡ Quick Win',
        urgency: 'Quick Win',
        impactScore: 82,
        effortMins: 10,
        rationale: `Ensures all newly captured Second Brain notes and local state are preserved safely in localStorage backup.`,
        sourceNoteTitle: 'System Safety Protocol',
        sourceNoteId: null
      });
    }

    // Sort by impact score descending
    return suggestions.sort((a, b) => b.impactScore - a.impactScore);
  },

  /**
   * Render AI Hero Banner KPIs and Telemetry
   */
  renderAiBannerMetrics(notes) {
    const readinessEl = document.getElementById('ai-metric-readiness');
    const countEl = document.getElementById('ai-metric-count');
    const conceptsEl = document.getElementById('ai-metric-concepts');
    const alignmentEl = document.getElementById('ai-metric-alignment');
    const badgeEl = document.getElementById('ai-last-analyzed-badge');
    const allCountEl = document.getElementById('count-all-suggestions');
    const statusDescEl = document.getElementById('ai-synthesis-status-desc');

    const totalSuggestions = this.currentSuggestions.length;
    const allTags = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));

    if (readinessEl) readinessEl.textContent = '94%';
    if (countEl) countEl.textContent = `${totalSuggestions} Actions`;
    if (conceptsEl) conceptsEl.textContent = `${Math.max(allTags.size * 3, 12)} Topics`;
    if (alignmentEl) alignmentEl.textContent = 'High Impact';
    if (allCountEl) allCountEl.textContent = String(totalSuggestions);
    if (badgeEl) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      badgeEl.textContent = `Analyzed at ${timeStr}`;
    }
    if (statusDescEl) {
      statusDescEl.textContent = `Analyzed ${notes.length} knowledge items & extracted ${totalSuggestions} high-velocity execution paths.`;
    }
  },

  /**
   * Render Dual Chart Visualizations (Domain Distribution + Impact vs Effort Matrix)
   */
  renderCharts() {
    if (typeof window.Chart === 'undefined') {
      console.warn('[LifeOS Notes] Chart.js not loaded.');
      return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.get('profile')?.theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    // 1. Chart 1: Domain Distribution (Doughnut)
    const domainCtx = document.getElementById('chart-notes-domain-dist');
    if (domainCtx) {
      if (this.domainChart) this.domainChart.destroy();

      // Aggregate counts by category
      const counts = { tech: 0, execution: 0, wellness: 0, quick: 0 };
      this.currentSuggestions.forEach(s => {
        if (counts[s.category] !== undefined) counts[s.category]++;
        else counts.execution++;
      });

      this.domainChart = new window.Chart(domainCtx, {
        type: 'doughnut',
        data: {
          labels: ['Tech & Architecture', 'Sprint Delivery', 'Focus & Health', 'Quick Wins'],
          datasets: [{
            data: [counts.tech || 1, counts.execution || 2, counts.wellness || 1, counts.quick || 1],
            backgroundColor: [
              '#6366F1', // Electric Indigo
              '#10B981', // Emerald
              '#EC4899', // Rose Pink
              '#06B6D4'  // Cyan
            ],
            borderColor: isDark ? '#1E293B' : '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: textColor,
                boxWidth: 12,
                boxHeight: 12,
                font: { family: 'Inter', size: 11, weight: '500' },
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = ctx.raw || 0;
                  return ` ${ctx.label}: ${val} recommended action${val > 1 ? 's' : ''}`;
                }
              }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 2. Chart 2: Priority & Impact Matrix (Horizontal Grouped Bar)
    const matrixCtx = document.getElementById('chart-notes-priority-matrix');
    if (matrixCtx) {
      if (this.matrixChart) this.matrixChart.destroy();

      // Take top 4 suggestions for clean visual clarity
      const topItems = this.currentSuggestions.slice(0, 4);
      const labels = topItems.map(s => {
        const words = s.title.split(' ');
        return words.length > 4 ? words.slice(0, 4).join(' ') + '...' : s.title;
      });
      const impactData = topItems.map(s => s.impactScore);
      const effortData = topItems.map(s => s.effortMins);

      this.matrixChart = new window.Chart(matrixCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'AI Impact Score (0-100)',
              data: impactData,
              backgroundColor: '#10B981',
              borderRadius: 6,
              barThickness: 10
            },
            {
              label: 'Focus Minutes (Est.)',
              data: effortData,
              backgroundColor: isDark ? '#818CF8' : '#6366F1',
              borderRadius: 6,
              barThickness: 10
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter', size: 10 } },
              max: 100
            },
            y: {
              grid: { display: false },
              ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: textColor,
                boxWidth: 10,
                boxHeight: 10,
                font: { family: 'Inter', size: 11 },
                padding: 8
              }
            }
          }
        }
      });
    }
  },

  /**
   * Render Written Suggestions List with Filter Support
   */
  renderWrittenSuggestions() {
    const container = document.getElementById('ai-suggestions-list');
    if (!container) return;

    let filtered = this.currentSuggestions;
    if (this.activeSuggestionFilter !== 'all') {
      filtered = this.currentSuggestions.filter(s => s.category === this.activeSuggestionFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="ai-empty-state card" style="padding: 24px; text-align: center;">
          <div style="font-weight: 600; color: var(--color-text-main); margin-bottom: 4px;">No suggestions in this category</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Switch filter back to "All Actions" to view full intelligence.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(s => {
      const isAdded = this.addedSuggestionIds.has(s.id);
      let catClass = `cat-${s.category}`;
      let urgencyBadge = '';

      if (s.urgency === 'Critical') {
        urgencyBadge = '<span class="impact-badge critical">⚡ Critical Next Step</span>';
      } else if (s.urgency === 'High') {
        urgencyBadge = '<span class="impact-badge high">🎯 High Velocity</span>';
      } else if (s.urgency === 'Quick Win') {
        urgencyBadge = '<span class="impact-badge high" style="background:rgba(6,182,212,0.15);color:#06B6D4;border-color:rgba(6,182,212,0.3);">⚡ 10-15m Quick Win</span>';
      } else {
        urgencyBadge = '<span class="impact-badge strategic">💡 Strategic Focus</span>';
      }

      return `
        <article class="suggestion-card ${catClass} animate-fade-in" id="card-${s.id}">
          <div class="suggestion-top">
            <div class="suggestion-badges">
              ${urgencyBadge}
              <span class="badge badge-neutral" style="font-size: 11px;">Impact: <strong>${s.impactScore}%</strong></span>
              <span class="badge badge-neutral" style="font-size: 11px;">⏱️ ~${s.effortMins}m</span>
            </div>
            <button class="btn btn-icon btn-sm" data-dismiss-suggestion="${s.id}" title="Dismiss Suggestion" style="width: 24px; height: 24px; color: var(--color-text-muted);" aria-label="Dismiss">✕</button>
          </div>

          <h3 class="suggestion-title">${this.escapeHTML(s.title)}</h3>
          <p class="suggestion-rationale">${this.escapeHTML(s.rationale)}</p>

          <div class="suggestion-source">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; color: var(--color-primary);" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Synthesized from: <strong>${this.escapeHTML(s.sourceNoteTitle || 'Second Brain')}</strong></span>
          </div>

          <div class="suggestion-actions">
            <button class="btn-add-action ${isAdded ? 'added' : ''}" data-add-to-tasks="${s.id}">
              ${isAdded ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px;"><polyline points="20 6 9 17 4 12"/></svg>
                Added to Daily Tasks
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px;"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                + Add to Daily Tasks
              `}
            </button>
            <button class="btn btn-secondary btn-sm" data-focus-suggestion="${s.id}" style="font-size: 11px;">
              ⚡ Focus Now
            </button>
          </div>
        </article>
      `;
    }).join('');

    this.renderSpotlightAction();
    this.bindSuggestionClicks();
  },

  /**
   * Render Top Action Spotlight (Bridges left column height to cover gap)
   */
  renderSpotlightAction() {
    const card = document.getElementById('ai-top-focus-card');
    if (!card) return;

    const top = this.currentSuggestions && this.currentSuggestions[0];
    if (!top) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'flex';

    const titleEl = document.getElementById('ai-spotlight-title');
    const descEl = document.getElementById('ai-spotlight-rationale');
    const impactEl = document.getElementById('ai-spotlight-impact');
    const effortEl = document.getElementById('ai-spotlight-effort');
    const urgencyEl = document.getElementById('ai-spotlight-urgency');
    const alignEl = document.getElementById('ai-spotlight-goal-align');
    const btn = document.getElementById('btn-add-spotlight-to-tasks');

    if (titleEl) titleEl.textContent = top.title;
    if (descEl) descEl.textContent = top.rationale;
    if (impactEl) impactEl.textContent = `${top.impactScore}%`;
    if (effortEl) effortEl.textContent = `~${top.effortMins}m`;
    if (urgencyEl) urgencyEl.textContent = `⚡ ${top.urgency || 'High'} Leverage`;
    if (alignEl) alignEl.textContent = `${top.impactScore}% Match`;

    if (btn) {
      btn.dataset.addToTasks = top.id;
      const isAdded = this.addedSuggestionIds.has(top.id);
      if (isAdded) {
        btn.classList.add('added');
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px;"><polyline points="20 6 9 17 4 12"/></svg>
          Added to Tasks
        `;
      } else {
        btn.classList.remove('added');
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add to Daily Tasks
        `;
      }
    }
  },

  /**
   * Bind interactive clicks on suggestion cards
   */
  bindSuggestionClicks() {
    // Add to daily tasks action
    document.querySelectorAll('[data-add-to-tasks]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.addToTasks;
        const suggestion = this.currentSuggestions.find(s => s.id === id);
        if (!suggestion) return;

        if (this.addedSuggestionIds.has(id)) return;

        // Push into state.todayTasks
        const tasks = state.get('todayTasks') || [];
        const newTask = {
          id: 't-' + Date.now(),
          title: suggestion.title,
          priority: suggestion.urgency === 'Critical' ? 'urgent' : (suggestion.urgency === 'High' ? 'high' : 'medium'),
          done: false,
          status: 'todo',
          category: suggestion.category === 'wellness' ? 'health' : 'work'
        };

        tasks.unshift(newTask);
        state.setKey('todayTasks', tasks);

        // Update task count badge in sidebar if present
        const sidebarCount = document.getElementById('sidebar-task-count');
        if (sidebarCount) {
          sidebarCount.textContent = String(tasks.filter(t => !t.done).length);
        }

        this.addedSuggestionIds.add(id);
        sound.playComplete();
        toast.success(`Added to Daily Tasks: "${suggestion.title}"`);
        this.renderWrittenSuggestions();
      };
    });

    // Dismiss suggestion
    document.querySelectorAll('[data-dismiss-suggestion]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.dismissSuggestion;
        this.currentSuggestions = this.currentSuggestions.filter(s => s.id !== id);
        sound.playClick();
        toast.info('Suggestion dismissed');
        this.renderWrittenSuggestions();
        this.renderCharts();
      };
    });

    // Focus now shortcut
    document.querySelectorAll('[data-focus-suggestion]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.focusSuggestion;
        const suggestion = this.currentSuggestions.find(s => s.id === id);
        if (!suggestion) return;
        sound.playClick();
        toast.info(`Focusing session on: "${suggestion.title}"`);
        window.location.hash = '#dashboard';
      };
    });
  },

  /**
   * Render Second Brain Notes Grid with Search, Tag Filters, and Pin Status
   */
  renderNotes() {
    const container = document.getElementById('notes-list-container');
    const countBadge = document.getElementById('notes-count-badge');
    const tagPillsContainer = document.getElementById('notes-tag-pills');
    if (!container) return;

    let notes = state.get('notes') || [];

    // Extract all unique tags
    const allTags = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => allTags.add(t.toLowerCase())));

    if (tagPillsContainer) {
      tagPillsContainer.innerHTML = `
        <button class="tag-pill ${this.activeTagFilter === 'all' ? 'active' : ''}" data-tag-filter="all">#all (${notes.length})</button>
        ${Array.from(allTags).map(tag => `
          <button class="tag-pill ${this.activeTagFilter === tag ? 'active' : ''}" data-tag-filter="${tag}">#${tag}</button>
        `).join('')}
      `;
      this.bindTagFilterClicks();
    }

    // Apply Search Filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Apply Tag Filter
    if (this.activeTagFilter !== 'all') {
      notes = notes.filter(n => (n.tags || []).some(t => t.toLowerCase() === this.activeTagFilter));
    }

    // Sort: Pinned notes always first
    notes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    if (countBadge) {
      countBadge.textContent = `${notes.length} Note${notes.length === 1 ? '' : 's'}`;
    }

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="placeholder-state card" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; color: var(--color-primary);">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h3 class="placeholder-title" style="margin-top: 12px; font-weight: 600;">No notes match your filter</h3>
          <p class="placeholder-text" style="color: var(--color-text-secondary); margin-top: 4px;">Click "Capture Note" above or clear your search to view your knowledge vault.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(n => {
      const words = (n.content || '').trim().split(/\s+/).filter(Boolean).length;

      return `
        <div class="note-card ${n.pinned ? 'pinned' : ''} animate-fade-in" id="note-${n.id}">
          <div class="note-card-top">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${n.pinned ? `
                <span title="Pinned Note" style="color: #F59E0B; display: inline-flex;" aria-label="Pinned Note">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
              ` : ''}
              <div class="note-title-text">${this.escapeHTML(n.title)}</div>
            </div>

            <div class="note-action-btns">
              <button class="btn btn-icon btn-sm" data-pin-note="${n.id}" title="${n.pinned ? 'Unpin Note' : 'Pin Note'}" style="width: 26px; height: 26px; color: ${n.pinned ? '#F59E0B' : 'var(--color-text-muted)'};" aria-label="Pin Note">
                <svg viewBox="0 0 24 24" fill="${n.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px;">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button class="btn btn-icon btn-sm" data-delete-note="${n.id}" title="Delete Note" style="width: 26px; height: 26px; color: var(--color-text-muted);" aria-label="Delete Note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>

          <p class="note-content-text">${this.escapeHTML(n.content)}</p>

          <div class="note-tags-wrap">
            ${(n.tags || []).map(t => `<span class="badge badge-indigo" style="font-size: 11px;">#${this.escapeHTML(t)}</span>`).join('')}
          </div>

          <div class="note-footer-meta">
            <span>${words} words • ${n.updatedAt || 'Recently'}</span>
            <button class="btn-ai-note-extract" data-synthesize-note="${n.id}">
              ✨ Synthesize Actions
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.bindNoteActions();
  },

  /**
   * Bind Note Actions (Delete, Pin, Single-Note Synthesize)
   */
  bindNoteActions() {
    // Delete Note
    document.querySelectorAll('[data-delete-note]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteNote;
        if (!confirm('Are you sure you want to delete this note from Second Brain?')) return;
        const notes = (state.get('notes') || []).filter(n => n.id !== id);
        sound.playClick();
        state.setKey('notes', notes);
        dbSync.syncNote({ id }, 'delete');
        if (supabaseService.isConfigured()) {
          supabaseService.deleteNote(id).catch(err => console.warn(err));
        }
        toast.info('Note removed from Second Brain');
        this.runAiAnalysis(false);
        this.renderNotes();
      };
    });

    // Pin / Unpin Note
    document.querySelectorAll('[data-pin-note]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.pinNote;
        const notes = state.get('notes') || [];
        const target = notes.find(n => n.id === id);
        if (target) {
          target.pinned = !target.pinned;
          sound.playClick();
          state.setKey('notes', notes);
          this.renderNotes();
        }
      };
    });

    // Single-Note Synthesize focus
    document.querySelectorAll('[data-synthesize-note]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.synthesizeNote;
        const notes = state.get('notes') || [];
        const note = notes.find(n => n.id === id);
        if (!note) return;

        sound.playComplete();
        toast.info(`Synthesizing recommendations for "${note.title}"...`);

        // Smooth scroll to suggestions section
        const section = document.getElementById('ai-suggestions-list');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
    });
  },

  /**
   * Bind Tag Filter Pills
   */
  bindTagFilterClicks() {
    document.querySelectorAll('[data-tag-filter]').forEach(btn => {
      btn.onclick = () => {
        this.activeTagFilter = btn.dataset.tagFilter;
        sound.playClick();
        this.renderNotes();
      };
    });
  },

  /**
   * Bind Main Page Event Handlers
   */
  bindEvents() {
    // 1. Run AI Synthesis Button
    const runAiBtn = document.getElementById('btn-run-ai-synthesis');
    const runAiText = document.getElementById('btn-run-ai-text');
    if (runAiBtn) {
      runAiBtn.onclick = () => {
        if (runAiText) runAiText.textContent = 'Analyzing...';
        runAiBtn.disabled = true;

        setTimeout(() => {
          this.runAiAnalysis(true);
          if (runAiText) runAiText.textContent = 'Run AI Analysis';
          runAiBtn.disabled = false;
        }, 600);
      };
    }

    // 2. Suggestion Category Filters
    document.querySelectorAll('[data-suggestion-filter]').forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll('[data-suggestion-filter]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeSuggestionFilter = chip.dataset.suggestionFilter;
        sound.playClick();
        this.renderWrittenSuggestions();
      };
    });

    // 3. Search Notes Input
    const searchInput = document.getElementById('input-search-notes');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderNotes();
      };
    }

    // 4. Note Capture Panel Show / Hide
    const btnShow = document.getElementById('btn-show-add-note');
    const panel = document.getElementById('add-note-panel');
    const btnCancel = document.getElementById('btn-cancel-add-note');
    const btnClose = document.getElementById('btn-close-note-panel');
    const btnSubmit = document.getElementById('btn-submit-new-note');
    const contentInput = document.getElementById('input-new-note-content');
    const wordCounter = document.getElementById('note-word-counter');

    const togglePanel = (show) => {
      if (!panel) return;
      panel.style.display = show ? 'block' : 'none';
      if (show) {
        const titleInput = document.getElementById('input-new-note-title');
        if (titleInput) titleInput.focus();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    if (btnShow) btnShow.onclick = () => { sound.playClick(); togglePanel(panel.style.display === 'none'); };
    if (btnCancel) btnCancel.onclick = () => { sound.playClick(); togglePanel(false); };
    if (btnClose) btnClose.onclick = () => { sound.playClick(); togglePanel(false); };

    // Real-time word counter
    if (contentInput && wordCounter) {
      contentInput.oninput = () => {
        const text = contentInput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCounter.textContent = `${words} words • ${text.length} characters`;
      };
    }

    // 5. AI Note Helper: Auto Action Extractor
    const btnAutoAction = document.getElementById('btn-ai-auto-action');
    if (btnAutoAction && contentInput) {
      btnAutoAction.onclick = () => {
        let val = contentInput.value;
        if (!val.trim()) {
          contentInput.value = "TODO: \n- [ ] Action item 1\n- [ ] Action item 2";
        } else if (!val.includes('TODO:')) {
          contentInput.value = val + "\n\nTODO:\n- [ ] Next execution step based on these notes";
        }
        contentInput.focus();
        sound.playClick();
        toast.info('Action item template inserted');
      };
    }

    // 6. AI Note Helper: Auto-Detect Tags
    const btnAutoTag = document.getElementById('btn-ai-auto-tag');
    const tagsInput = document.getElementById('input-new-note-tags');
    if (btnAutoTag && tagsInput && contentInput) {
      btnAutoTag.onclick = () => {
        const text = `${contentInput.value}`.toLowerCase();
        const detected = [];
        if (/(api|database|supabase|backend|redis)/i.test(text)) detected.push('database');
        if (/(arch|system|microservice|design)/i.test(text)) detected.push('architecture');
        if (/(sprint|deadline|ship|mvp)/i.test(text)) detected.push('sprint');
        if (/(health|sleep|focus|gym|circadian)/i.test(text)) detected.push('wellness');
        if (/(ui|css|theme|token|frontend)/i.test(text)) detected.push('design');

        const existing = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean);
        const combined = Array.from(new Set([...existing, ...detected]));
        tagsInput.value = combined.join(', ');
        sound.playClick();
        toast.info(detected.length ? `Detected ${detected.length} tags: ${detected.join(', ')}` : 'Added default tags');
      };
    }

    // 7. Save Note Submit Handler
    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const titleInput = document.getElementById('input-new-note-title');
        const tagsInput = document.getElementById('input-new-note-tags');
        const pinInput = document.getElementById('input-new-note-pin');

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if (!title || !content) {
          toast.warning('Please enter both note title and content');
          return;
        }

        const tags = (tagsInput.value || '')
          .split(',')
          .map(s => s.trim().replace(/^#/, ''))
          .filter(Boolean);

        const notes = state.get('notes') || [];
        const newNote = {
          id: 'n-' + Date.now(),
          title,
          content,
          tags: tags.length ? tags : ['general'],
          pinned: pinInput ? pinInput.checked : false,
          updatedAt: 'Just now'
        };
        notes.unshift(newNote);
        sound.playComplete();
        state.setKey('notes', notes);
        dbSync.syncNote(newNote, 'upsert');
        if (supabaseService.isConfigured()) {
          supabaseService.syncNote(newNote).catch(err => console.warn(err));
        }

        titleInput.value = '';
        contentInput.value = '';
        tagsInput.value = '';
        if (pinInput) pinInput.checked = false;
        togglePanel(false);

        // Re-run AI analysis with user notification
        this.runAiAnalysis(true);
        this.renderNotes();
      };
    }
  },

  /**
   * Escape HTML to prevent injection
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

export const notesModule = suggestionsModule;
