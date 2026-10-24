/* ==========================================================================
   LifeOS Supabase Cloud Database Client & Synchronization Service
   Enables seamless cloud sync, data backup, and cross-device persistence.
   Gracefully falls back to offline/local-first mode when unconfigured.
   ========================================================================== */

import { storage } from './storage.js';

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = '';
    this.key = '';
    this.isInitialized = false;
    this.isConnecting = false;
    this.cachedStatus = null;
  }

  /**
   * Load credentials from local storage or window.LIFEOS_CONFIG
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
   * Determine if Supabase credentials are configured
   * @returns {boolean}
   */
  isConfigured() {
    const creds = this.getCredentials();
    return Boolean(creds.url && creds.key);
  }

  /**
   * Initialize Supabase client
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
      // Load Supabase browser library via ESM CDN
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      this.client = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      this.isInitialized = true;
      console.info('[LifeOS Supabase] Client initialized successfully for:', url);
      return true;
    } catch (err) {
      console.warn('[LifeOS Supabase] Could not load Supabase SDK from CDN:', err.message);
      this.client = null;
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Save credentials to storage and re-initialize
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
    storage.remove('supabase_config');
    this.client = null;
    this.url = '';
    this.key = '';
    this.isInitialized = false;
    this.cachedStatus = null;
  }

  /**
   * Test connection to Supabase database
   * @returns {Promise<{success: boolean, message: string, details?: any}>}
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Supabase credentials are not configured. Please enter your Project URL and Anon Key.'
      };
    }

    if (!this.client) {
      const ok = await this.init();
      if (!ok) {
        return {
          success: false,
          message: 'Failed to initialize Supabase client. Check your network connection or CDN access.'
        };
      }
    }

    try {
      // Perform a lightweight query to test the connection and API key validity
      const { data, error } = await this.client
        .from('tasks')
        .select('id')
        .limit(1);

      if (error) {
        // Table might not exist yet if schema wasn't executed
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
   * Push all local data into Supabase (Cloud Backup)
   * @param {object} localState
   * @returns {Promise<{success: boolean, message: string, stats?: object}>}
   */
  async pushAll(localState = {}) {
    if (!this.client && !(await this.init())) {
      return { success: false, message: 'Supabase client is not available.' };
    }

    try {
      const tasks = localState.tasks || [];
      const habits = localState.habits || [];
      const goals = localState.goals || [];
      const notes = localState.notes || [];

      // 1. Upsert tasks
      if (tasks.length > 0) {
        const payload = tasks.map(t => ({
          id: String(t.id),
          title: t.title || 'Untitled Task',
          priority: t.priority || 'medium',
          due_date: t.dueDate || t.due_date || null,
          completed: Boolean(t.completed),
          tags: Array.isArray(t.tags) ? t.tags : [],
          updated_at: new Date().toISOString()
        }));
        const { error: taskErr } = await this.client.from('tasks').upsert(payload, { onConflict: 'id' });
        if (taskErr && taskErr.code !== '42P01') console.warn('[Supabase Push] Tasks error:', taskErr);
      }

      // 2. Upsert habits
      if (habits.length > 0) {
        const payload = habits.map(h => ({
          id: String(h.id),
          name: h.name || 'Untitled Habit',
          frequency: h.frequency || 'daily',
          streak: h.streak || 0,
          best_streak: h.bestStreak || h.streak || 0,
          color: h.color || 'indigo',
          is_active: h.isActive !== false,
          completions: h.completions || {},
          updated_at: new Date().toISOString()
        }));
        const { error: habitErr } = await this.client.from('habits').upsert(payload, { onConflict: 'id' });
        if (habitErr && habitErr.code !== '42P01') console.warn('[Supabase Push] Habits error:', habitErr);
      }

      // 3. Upsert goals
      if (goals.length > 0) {
        const payload = goals.map(g => ({
          id: String(g.id),
          title: g.title || 'Untitled Goal',
          category: g.category || 'Personal',
          target_date: g.targetDate || g.target_date || null,
          progress: Number(g.progress) || 0,
          status: g.status || 'in_progress',
          milestones: Array.isArray(g.milestones) ? g.milestones : [],
          updated_at: new Date().toISOString()
        }));
        const { error: goalErr } = await this.client.from('goals').upsert(payload, { onConflict: 'id' });
        if (goalErr && goalErr.code !== '42P01') console.warn('[Supabase Push] Goals error:', goalErr);
      }

      // 4. Upsert notes
      if (notes.length > 0) {
        const payload = notes.map(n => ({
          id: String(n.id),
          title: n.title || 'Untitled Note',
          content: n.content || '',
          tags: Array.isArray(n.tags) ? n.tags : [],
          pinned: Boolean(n.pinned),
          updated_at: new Date().toISOString()
        }));
        const { error: noteErr } = await this.client.from('notes').upsert(payload, { onConflict: 'id' });
        if (noteErr && noteErr.code !== '42P01') console.warn('[Supabase Push] Notes error:', noteErr);
      }

      // 5. Save full snapshot in user_backups table
      const backupPayload = {
        id: 'default_user',
        profile: localState.profile || {},
        metrics: localState.metrics || {},
        full_state: localState,
        updated_at: new Date().toISOString()
      };
      await this.client.from('user_backups').upsert(backupPayload, { onConflict: 'id' });

      storage.set('supabase_last_sync', new Date().toISOString());

      return {
        success: true,
        message: 'All local data successfully backed up to Supabase Cloud!',
        stats: {
          tasks: tasks.length,
          habits: habits.length,
          goals: goals.length,
          notes: notes.length
        }
      };
    } catch (err) {
      return { success: false, message: `Sync failed: ${err.message}` };
    }
  }

  /**
   * Pull all cloud data from Supabase and return for state merging
   * @returns {Promise<{success: boolean, message: string, data?: object}>}
   */
  async pullAll() {
    if (!this.client && !(await this.init())) {
      return { success: false, message: 'Supabase client is not available.' };
    }

    try {
      const [
        { data: tasks, error: tErr },
        { data: habits, error: hErr },
        { data: goals, error: gErr },
        { data: notes, error: nErr },
        { data: backups, error: bErr }
      ] = await Promise.all([
        this.client.from('tasks').select('*').order('created_at', { ascending: false }),
        this.client.from('habits').select('*').order('created_at', { ascending: false }),
        this.client.from('goals').select('*').order('created_at', { ascending: false }),
        this.client.from('notes').select('*').order('pinned', { ascending: false }),
        this.client.from('user_backups').select('*').eq('id', 'default_user').maybeSingle()
      ]);

      const mergedData = {
        tasks: (tasks || []).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.due_date,
          completed: Boolean(t.completed),
          tags: t.tags || []
        })),
        habits: (habits || []).map(h => ({
          id: h.id,
          name: h.name,
          frequency: h.frequency,
          streak: h.streak || 0,
          bestStreak: h.best_streak || h.streak || 0,
          color: h.color || 'indigo',
          isActive: h.is_active !== false,
          completions: h.completions || {}
        })),
        goals: (goals || []).map(g => ({
          id: g.id,
          title: g.title,
          category: g.category,
          targetDate: g.target_date,
          progress: g.progress || 0,
          status: g.status || 'in_progress',
          milestones: g.milestones || []
        })),
        notes: (notes || []).map(n => ({
          id: n.id,
          title: n.title,
          content: n.content || '',
          tags: n.tags || [],
          pinned: Boolean(n.pinned)
        })),
        profile: backups?.profile || null,
        metrics: backups?.metrics || null
      };

      storage.set('supabase_last_sync', new Date().toISOString());

      return {
        success: true,
        message: 'Successfully pulled latest data from Supabase!',
        data: mergedData
      };
    } catch (err) {
      return { success: false, message: `Failed to pull from Supabase: ${err.message}` };
    }
  }

  /**
   * Helper: sync a single task
   */
  async syncTask(task) {
    if (!this.client || !task?.id) return;
    try {
      await this.client.from('tasks').upsert({
        id: String(task.id),
        title: task.title || '',
        priority: task.priority || 'medium',
        due_date: task.dueDate || null,
        completed: Boolean(task.completed),
        tags: task.tags || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Failed to sync task:', e);
    }
  }

  /**
   * Helper: delete a single task from cloud
   */
  async deleteTask(taskId) {
    if (!this.client || !taskId) return;
    try {
      await this.client.from('tasks').delete().eq('id', String(taskId));
    } catch (e) {
      console.warn('[Supabase] Failed to delete task:', e);
    }
  }
}

export const supabaseService = new SupabaseService();
