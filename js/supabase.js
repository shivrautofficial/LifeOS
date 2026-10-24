/* ==========================================================================
   LifeOS Supabase Cloud Database Client & Real-Time Sync Engine
   Enables multi-user isolation, cross-device live synchronisation,
   optimistic writes, conflict resolution & Row-Level-Security (RLS).
   ========================================================================== */

import { storage } from './storage.js';
import { state } from './state.js';

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = '';
    this.key = '';
    this.isInitialized = false;
    this.realtimeChannel = null;
    this.activeUserId = null;
  }

  /**
   * Load credentials from storage, window.LIFEOS_CONFIG, or /api/config
   */
  getCredentials() {
    const saved = storage.get('supabase_config', null);
    if (saved && saved.url && saved.key) {
      return { url: saved.url.trim(), key: saved.key.trim() };
    }

    if (window.LIFEOS_CONFIG?.supabaseUrl && window.LIFEOS_CONFIG?.supabaseAnonKey) {
      return {
        url: window.LIFEOS_CONFIG.supabaseUrl.trim(),
        key: window.LIFEOS_CONFIG.supabaseAnonKey.trim()
      };
    }

    return { url: '', key: '' };
  }

  /**
   * Check if credentials are present
   * @returns {boolean}
   */
  isConfigured() {
    const creds = this.getCredentials();
    return Boolean(creds.url && creds.key);
  }

  /**
   * Return client instance or initialize if needed
   * @returns {Promise<object|null>}
   */
  async getClient() {
    if (this.client) return this.client;
    await this.init();
    return this.client;
  }

  /**
   * Initialize Supabase client with resilient CDN & window fallbacks
   * @returns {Promise<boolean>}
   */
  async init() {
    const { url, key } = this.getCredentials();
    this.url = url;
    this.key = key;

    if (!url || !key) {
      this.client = null;
      this.isInitialized = false;
      return false;
    }

    try {
      let createClientFn = null;

      // Check global window.supabase (loaded via CDN script)
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        createClientFn = window.supabase.createClient;
      } else {
        // Fallback: Dynamic ESM import
        try {
          const mod = await import('https://esm.sh/@supabase/supabase-js@2');
          createClientFn = mod.createClient;
        } catch (e1) {
          const mod2 = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
          createClientFn = mod2.createClient;
        }
      }

      if (!createClientFn) {
        throw new Error('Supabase SDK could not be resolved from window or ESM CDNs.');
      }

      this.client = createClientFn(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      this.isInitialized = true;
      console.info('[LifeOS Supabase] Initialized successfully for project:', url);
      return true;
    } catch (err) {
      console.warn('[LifeOS Supabase] Initialization warning:', err.message);
      this.client = null;
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Save credentials to persistent storage and initialize client
   * @param {string} url
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async saveConfig(url, key) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (key || '').trim();

    if (!cleanUrl || !cleanKey) {
      storage.remove('supabase_config');
      this.client = null;
      this.url = '';
      this.key = '';
      this.isInitialized = false;
      return false;
    }

    storage.set('supabase_config', { url: cleanUrl, key: cleanKey });
    return await this.init();
  }

  /**
   * Clear saved Supabase credentials
   */
  clearConfig() {
    this.unsubscribeFromUserChanges();
    storage.remove('supabase_config');
    this.client = null;
    this.url = '';
    this.key = '';
    this.isInitialized = false;
    this.activeUserId = null;
  }

  /**
   * Test connection to Supabase database
   * @returns {Promise<{success: boolean, message: string, warning?: boolean}>}
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Supabase credentials are not configured. Please enter your Project URL and Anon Key.'
      };
    }

    const client = await this.getClient();
    if (!client) {
      return {
        success: false,
        message: 'Failed to initialize Supabase client. Check your network connection or CDN access.'
      };
    }

    try {
      // Test basic connectivity via health check query
      const { error } = await client.from('tasks').select('id').limit(1);

      if (error) {
        if (error.code === '42P01') {
          return {
            success: true,
            warning: true,
            message: 'Connected to Supabase! However, the "tasks" table was not found. Please run the SQL schema script in database/schemas/supabase_schema.sql in your Supabase SQL Editor.'
          };
        }
        return {
          success: false,
          message: `Supabase error (${error.code || 'API'}): ${error.message}`
        };
      }

      return {
        success: true,
        message: 'Successfully connected to Supabase database!'
      };
    } catch (err) {
      return {
        success: false,
        message: `Connection failed: ${err.message}`
      };
    }
  }

  /**
   * Cross-Device Real-Time Synchronization Subscriptions
   * Subscribes to PostgreSQL Change Events for the authenticated user
   * @param {string} userId
   */
  subscribeToUserChanges(userId) {
    if (!this.client || !userId) return;
    if (this.activeUserId === userId && this.realtimeChannel) return;

    this.unsubscribeFromUserChanges();
    this.activeUserId = userId;

    console.info('[LifeOS Realtime] Subscribing to live changes for user:', userId);

    try {
      const channel = this.client.channel(`user_sync_${userId}`);

      // 1. Tasks Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleTaskRealtimeEvent(payload);
      });

      // 2. Habits Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'habits',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleHabitRealtimeEvent(payload);
      });

      // 3. Goals Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleGoalRealtimeEvent(payload);
      });

      // 4. Projects Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleProjectRealtimeEvent(payload);
      });

      // 5. Calendar Events Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleEventRealtimeEvent(payload);
      });

      // 6. Notes Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleNoteRealtimeEvent(payload);
      });

      // 7. Profile Listener
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload) => {
        if (payload.new) {
          const currentProfile = state.get('profile') || {};
          state.setKey('profile', {
            ...currentProfile,
            name: payload.new.display_name || currentProfile.name,
            roleTitle: payload.new.role_title || currentProfile.roleTitle,
            profession: payload.new.profession || currentProfile.profession,
            theme: payload.new.theme || currentProfile.theme
          });
        }
      });

      channel.subscribe((status) => {
        console.info(`[LifeOS Realtime] Status: ${status}`);
        const badge = document.getElementById('sync-indicator');
        if (badge) {
          badge.classList.toggle('active', status === 'SUBSCRIBED');
        }
      });

      this.realtimeChannel = channel;
    } catch (err) {
      console.warn('[LifeOS Realtime] Channel setup warning:', err.message);
    }
  }

  /**
   * Unsubscribe from Realtime channel
   */
  unsubscribeFromUserChanges() {
    if (this.realtimeChannel && this.client) {
      try {
        this.client.removeChannel(this.realtimeChannel);
      } catch (e) {
        // Ignore
      }
      this.realtimeChannel = null;
    }
    this.activeUserId = null;
    const badge = document.getElementById('sync-indicator');
    if (badge) badge.classList.remove('active');
  }

  /* ---------------- Realtime Event Handlers ---------------- */

  handleTaskRealtimeEvent(payload) {
    const tasks = state.get('todayTasks') || [];
    if (payload.eventType === 'INSERT') {
      const formatted = {
        id: payload.new.id,
        title: payload.new.title,
        priority: payload.new.priority || 'medium',
        status: payload.new.status || 'todo',
        dueDate: payload.new.due_date || 'Today',
        done: Boolean(payload.new.completed),
        category: payload.new.category || 'work'
      };
      if (!tasks.some(t => t.id === formatted.id)) {
        state.setKey('todayTasks', [formatted, ...tasks]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = tasks.findIndex(t => t.id === payload.new.id);
      if (idx !== -1) {
        tasks[idx] = {
          ...tasks[idx],
          title: payload.new.title,
          priority: payload.new.priority,
          status: payload.new.status,
          dueDate: payload.new.due_date,
          done: Boolean(payload.new.completed),
          category: payload.new.category
        };
        state.setKey('todayTasks', [...tasks]);
      }
    } else if (payload.eventType === 'DELETE') {
      state.setKey('todayTasks', tasks.filter(t => t.id !== payload.old.id));
    }
  }

  handleHabitRealtimeEvent(payload) {
    const habits = state.get('todayHabits') || [];
    if (payload.eventType === 'INSERT') {
      const formatted = {
        id: payload.new.id,
        title: payload.new.title,
        streak: payload.new.streak || 0,
        bestStreak: payload.new.best_streak || payload.new.streak || 0,
        done: Boolean(payload.new.done),
        history: payload.new.history || [false, false, false, false, false, false, false]
      };
      if (!habits.some(h => h.id === formatted.id)) {
        state.setKey('todayHabits', [...habits, formatted]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = habits.findIndex(h => h.id === payload.new.id);
      if (idx !== -1) {
        habits[idx] = {
          ...habits[idx],
          title: payload.new.title,
          streak: payload.new.streak,
          bestStreak: payload.new.best_streak,
          done: Boolean(payload.new.done),
          history: payload.new.history || habits[idx].history
        };
        state.setKey('todayHabits', [...habits]);
      }
    } else if (payload.eventType === 'DELETE') {
      state.setKey('todayHabits', habits.filter(h => h.id !== payload.old.id));
    }
  }

  handleGoalRealtimeEvent(payload) {
    const goals = state.get('goals') || [];
    if (payload.eventType === 'INSERT') {
      const formatted = {
        id: payload.new.id,
        title: payload.new.title,
        category: payload.new.category || 'Personal',
        progress: payload.new.progress || 0,
        targetDate: payload.new.target_date || 'Q4 2026'
      };
      if (!goals.some(g => g.id === formatted.id)) {
        state.setKey('goals', [...goals, formatted]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = goals.findIndex(g => g.id === payload.new.id);
      if (idx !== -1) {
        goals[idx] = {
          ...goals[idx],
          title: payload.new.title,
          category: payload.new.category,
          progress: payload.new.progress,
          targetDate: payload.new.target_date
        };
        state.setKey('goals', [...goals]);
      }
    } else if (payload.eventType === 'DELETE') {
      state.setKey('goals', goals.filter(g => g.id !== payload.old.id));
    }
  }

  handleProjectRealtimeEvent(payload) {
    const projects = state.get('projects') || [];
    if (payload.eventType === 'INSERT') {
      const formatted = {
        id: payload.new.id,
        title: payload.new.title,
        status: payload.new.status || 'Active',
        progress: payload.new.progress || 0,
        deadline: payload.new.deadline || 'Ongoing'
      };
      if (!projects.some(p => p.id === formatted.id)) {
        state.setKey('projects', [...projects, formatted]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = projects.findIndex(p => p.id === payload.new.id);
      if (idx !== -1) {
        projects[idx] = {
          ...projects[idx],
          title: payload.new.title,
          status: payload.new.status,
          progress: payload.new.progress,
          deadline: payload.new.deadline
        };
        state.setKey('projects', [...projects]);
      }
    } else if (payload.eventType === 'DELETE') {
      state.setKey('projects', projects.filter(p => p.id !== payload.old.id));
    }
  }

  handleEventRealtimeEvent(payload) {
    const events = state.get('calendarEvents') || [];
    if (payload.eventType === 'INSERT') {
      const formatted = {
        id: payload.new.id,
        title: payload.new.title,
        time: payload.new.time || '10:00 AM',
        date: payload.new.date || 'Today',
        tag: payload.new.tag || 'Deep Work'
      };
      if (!events.some(e => e.id === formatted.id)) {
        state.setKey('calendarEvents', [...events, formatted]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = events.findIndex(e => e.id === payload.new.id);
      if (idx !== -1) {
        events[idx] = {
          ...events[idx],
          title: payload.new.title,
          time: payload.new.time,
          date: payload.new.date,
          tag: payload.new.tag
        };
        state.setKey('calendarEvents', [...events]);
      }
    } else if (payload.eventType === 'DELETE') {
      state.setKey('calendarEvents', events.filter(e => e.id !== payload.old.id));
    }
  }

  handleNoteRealtimeEvent(payload) {
    const notes = state.get('notes') || [];
    if (payload.eventType === 'INSERT') {
      const formatted = {
        id: payload.new.id,
        title: payload.new.title,
        content: payload.new.content || '',
        tags: payload.new.tags || [],
        pinned: Boolean(payload.new.pinned),
        updatedAt: 'Just now'
      };
      if (!notes.some(n => n.id === formatted.id)) {
        state.setKey('notes', [formatted, ...notes]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = notes.findIndex(n => n.id === payload.new.id);
      if (idx !== -1) {
        notes[idx] = {
          ...notes[idx],
          title: payload.new.title,
          content: payload.new.content,
          tags: payload.new.tags || [],
          pinned: Boolean(payload.new.pinned),
          updatedAt: 'Just now'
        };
        state.setKey('notes', [...notes]);
      }
    } else if (payload.eventType === 'DELETE') {
      state.setKey('notes', notes.filter(n => n.id !== payload.old.id));
    }
  }

  /**
   * Pull all cloud-backed records for a specific authenticated user
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: object}>}
   */
  async pullUserData(userId) {
    const client = await this.getClient();
    if (!client || !userId) {
      return { success: false, message: 'Supabase client is not available.' };
    }

    try {
      const [
        { data: tasks },
        { data: habits },
        { data: goals },
        { data: projects },
        { data: calendarEvents },
        { data: notes },
        { data: backup }
      ] = await Promise.all([
        client.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('calendar_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('notes').select('*').eq('user_id', userId).order('pinned', { ascending: false }),
        client.from('user_backups').select('*').eq('user_id', userId).maybeSingle()
      ]);

      const stateUpdates = {};

      if (tasks && tasks.length > 0) {
        stateUpdates.todayTasks = tasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority || 'medium',
          status: t.status || (t.completed ? 'done' : 'todo'),
          dueDate: t.due_date || 'Today',
          done: Boolean(t.completed),
          category: t.category || 'work'
        }));
      }

      if (habits && habits.length > 0) {
        stateUpdates.todayHabits = habits.map(h => ({
          id: h.id,
          title: h.title,
          streak: h.streak || 0,
          bestStreak: h.best_streak || h.streak || 0,
          done: Boolean(h.done),
          history: Array.isArray(h.history) ? h.history : [false, false, false, false, false, false, false]
        }));
      }

      if (goals && goals.length > 0) {
        stateUpdates.goals = goals.map(g => ({
          id: g.id,
          title: g.title,
          category: g.category || 'Personal',
          progress: g.progress || 0,
          targetDate: g.target_date || 'Q4 2026'
        }));
      }

      if (projects && projects.length > 0) {
        stateUpdates.projects = projects.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status || 'Active',
          progress: p.progress || 0,
          deadline: p.deadline || 'Ongoing'
        }));
      }

      if (calendarEvents && calendarEvents.length > 0) {
        stateUpdates.calendarEvents = calendarEvents.map(e => ({
          id: e.id,
          title: e.title,
          time: e.time || '10:00 AM',
          date: e.date || 'Today',
          tag: e.tag || 'Deep Work'
        }));
      }

      if (notes && notes.length > 0) {
        stateUpdates.notes = notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content || '',
          tags: n.tags || [],
          pinned: Boolean(n.pinned),
          updatedAt: 'Just now'
        }));
      }

      // If user had no relational records but had a full_state backup, restore it
      if (Object.keys(stateUpdates).length === 0 && backup?.full_state) {
        const fs = backup.full_state;
        if (fs.todayTasks) stateUpdates.todayTasks = fs.todayTasks;
        if (fs.todayHabits) stateUpdates.todayHabits = fs.todayHabits;
        if (fs.goals) stateUpdates.goals = fs.goals;
        if (fs.projects) stateUpdates.projects = fs.projects;
        if (fs.calendarEvents) stateUpdates.calendarEvents = fs.calendarEvents;
        if (fs.notes) stateUpdates.notes = fs.notes;
      }

      if (Object.keys(stateUpdates).length > 0) {
        state.set(stateUpdates);
      }

      storage.set('supabase_last_sync', new Date().toISOString());
      return { success: true, data: stateUpdates };
    } catch (err) {
      console.warn('[LifeOS Supabase] Error pulling user data:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Push complete state snapshot to user_backups table
   * @param {string} userId
   * @param {object} localState
   */
  async pushAll(localState = {}) {
    const client = await this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase client is not available.' };
    }

    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: 'You must be signed in to back up data to the cloud.' };
    }

    try {
      const tasks = localState.todayTasks || [];
      const habits = localState.todayHabits || [];
      const goals = localState.goals || [];
      const projects = localState.projects || [];
      const events = localState.calendarEvents || [];
      const notes = localState.notes || [];

      // 1. Batch upsert tasks
      if (tasks.length > 0) {
        const payload = tasks.map(t => ({
          id: String(t.id),
          user_id: userId,
          title: t.title || 'Untitled Task',
          priority: t.priority || 'medium',
          status: t.status || (t.done ? 'done' : 'todo'),
          due_date: t.dueDate || t.due_date || 'Today',
          completed: Boolean(t.done),
          category: t.category || 'work',
          updated_at: new Date().toISOString()
        }));
        await client.from('tasks').upsert(payload, { onConflict: 'id' });
      }

      // 2. Batch upsert habits
      if (habits.length > 0) {
        const payload = habits.map(h => ({
          id: String(h.id),
          user_id: userId,
          title: h.title || 'Untitled Habit',
          streak: h.streak || 0,
          best_streak: h.bestStreak || h.streak || 0,
          done: Boolean(h.done),
          history: h.history || [],
          updated_at: new Date().toISOString()
        }));
        await client.from('habits').upsert(payload, { onConflict: 'id' });
      }

      // 3. Batch upsert goals
      if (goals.length > 0) {
        const payload = goals.map(g => ({
          id: String(g.id),
          user_id: userId,
          title: g.title || 'Untitled Goal',
          category: g.category || 'Personal',
          progress: Number(g.progress) || 0,
          target_date: g.targetDate || g.target_date || 'Q4 2026',
          updated_at: new Date().toISOString()
        }));
        await client.from('goals').upsert(payload, { onConflict: 'id' });
      }

      // 4. Batch upsert projects
      if (projects.length > 0) {
        const payload = projects.map(p => ({
          id: String(p.id),
          user_id: userId,
          title: p.title || 'Untitled Project',
          status: p.status || 'Active',
          progress: Number(p.progress) || 0,
          deadline: p.deadline || 'Ongoing',
          updated_at: new Date().toISOString()
        }));
        await client.from('projects').upsert(payload, { onConflict: 'id' });
      }

      // 5. Batch upsert calendar events
      if (events.length > 0) {
        const payload = events.map(e => ({
          id: String(e.id),
          user_id: userId,
          title: e.title || 'Untitled Block',
          time: e.time || '10:00 AM',
          date: e.date || 'Today',
          tag: e.tag || 'Deep Work',
          updated_at: new Date().toISOString()
        }));
        await client.from('calendar_events').upsert(payload, { onConflict: 'id' });
      }

      // 6. Batch upsert notes
      if (notes.length > 0) {
        const payload = notes.map(n => ({
          id: String(n.id),
          user_id: userId,
          title: n.title || 'Untitled Note',
          content: n.content || '',
          tags: n.tags || [],
          pinned: Boolean(n.pinned),
          updated_at: new Date().toISOString()
        }));
        await client.from('notes').upsert(payload, { onConflict: 'id' });
      }

      // 7. Full snapshot in user_backups table
      const backupPayload = {
        id: userId,
        user_id: userId,
        profile: localState.profile || {},
        metrics: localState.metrics || {},
        full_state: localState,
        updated_at: new Date().toISOString()
      };
      await client.from('user_backups').upsert(backupPayload, { onConflict: 'id' });

      storage.set('supabase_last_sync', new Date().toISOString());
      return {
        success: true,
        message: 'All workspace data successfully saved and backed up to Supabase Cloud!'
      };
    } catch (err) {
      return { success: false, message: `Cloud push failed: ${err.message}` };
    }
  }

  /* ---------------- Single Entity Sync Methods (Optimistic Realtime) ---------------- */

  async syncTask(task) {
    const client = await this.getClient();
    if (!client || !task?.id) return;
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await client.from('tasks').upsert({
        id: String(task.id),
        user_id: userId,
        title: task.title || '',
        priority: task.priority || 'medium',
        status: task.status || (task.done ? 'done' : 'todo'),
        due_date: task.dueDate || task.due_date || 'Today',
        completed: Boolean(task.done),
        category: task.category || 'work',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] syncTask warning:', e);
    }
  }

  async deleteTask(taskId) {
    const client = await this.getClient();
    if (!client || !taskId) return;
    try {
      await client.from('tasks').delete().eq('id', String(taskId));
    } catch (e) {
      console.warn('[Supabase] deleteTask warning:', e);
    }
  }

  async syncHabit(habit) {
    const client = await this.getClient();
    if (!client || !habit?.id) return;
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await client.from('habits').upsert({
        id: String(habit.id),
        user_id: userId,
        title: habit.title || habit.name || '',
        streak: habit.streak || 0,
        best_streak: habit.bestStreak || habit.streak || 0,
        done: Boolean(habit.done),
        history: habit.history || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] syncHabit warning:', e);
    }
  }

  async deleteHabit(habitId) {
    const client = await this.getClient();
    if (!client || !habitId) return;
    try {
      await client.from('habits').delete().eq('id', String(habitId));
    } catch (e) {
      console.warn('[Supabase] deleteHabit warning:', e);
    }
  }

  async syncGoal(goal) {
    const client = await this.getClient();
    if (!client || !goal?.id) return;
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await client.from('goals').upsert({
        id: String(goal.id),
        user_id: userId,
        title: goal.title || '',
        category: goal.category || 'Personal',
        progress: Number(goal.progress) || 0,
        target_date: goal.targetDate || 'Q4 2026',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] syncGoal warning:', e);
    }
  }

  async deleteGoal(goalId) {
    const client = await this.getClient();
    if (!client || !goalId) return;
    try {
      await client.from('goals').delete().eq('id', String(goalId));
    } catch (e) {
      console.warn('[Supabase] deleteGoal warning:', e);
    }
  }

  async syncProject(project) {
    const client = await this.getClient();
    if (!client || !project?.id) return;
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await client.from('projects').upsert({
        id: String(project.id),
        user_id: userId,
        title: project.title || '',
        status: project.status || 'Active',
        progress: Number(project.progress) || 0,
        deadline: project.deadline || 'Ongoing',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] syncProject warning:', e);
    }
  }

  async deleteProject(projectId) {
    const client = await this.getClient();
    if (!client || !projectId) return;
    try {
      await client.from('projects').delete().eq('id', String(projectId));
    } catch (e) {
      console.warn('[Supabase] deleteProject warning:', e);
    }
  }

  async syncEvent(event) {
    const client = await this.getClient();
    if (!client || !event?.id) return;
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await client.from('calendar_events').upsert({
        id: String(event.id),
        user_id: userId,
        title: event.title || '',
        time: event.time || '10:00 AM',
        date: event.date || 'Today',
        tag: event.tag || 'Deep Work',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] syncEvent warning:', e);
    }
  }

  async deleteEvent(eventId) {
    const client = await this.getClient();
    if (!client || !eventId) return;
    try {
      await client.from('calendar_events').delete().eq('id', String(eventId));
    } catch (e) {
      console.warn('[Supabase] deleteEvent warning:', e);
    }
  }

  async syncNote(note) {
    const client = await this.getClient();
    if (!client || !note?.id) return;
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await client.from('notes').upsert({
        id: String(note.id),
        user_id: userId,
        title: note.title || '',
        content: note.content || '',
        tags: note.tags || [],
        pinned: Boolean(note.pinned),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] syncNote warning:', e);
    }
  }

  async deleteNote(noteId) {
    const client = await this.getClient();
    if (!client || !noteId) return;
    try {
      await client.from('notes').delete().eq('id', String(noteId));
    } catch (e) {
      console.warn('[Supabase] deleteNote warning:', e);
    }
  }
}

export const supabaseService = new SupabaseService();
