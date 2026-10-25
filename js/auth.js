/* ==========================================================================
   LifeOS Authentication & Identity Lifecycle Service
   Supabase Auth integration supporting Email/Password, International Phone OTP,
   OAuth providers, Password Recovery, Profile Management, and Device Signout.
   ========================================================================== */

import { supabaseService } from './supabase.js';
import { state } from './state.js';
import { storage } from './storage.js';
import { toast } from './toast.js';
/**
 * Format raw error messages into actionable, user-friendly feedback
 * @param {any} err
 * @returns {string}
 */
export function formatAuthError(err) {
  const msg = err?.message || String(err || '');
  if (/failed to fetch|networkerror|econnreset|aborterror/i.test(msg)) {
    return `<strong>Cannot connect to Supabase ("Failed to fetch"):</strong><br>` +
      `If you are in India (e.g. ACT Fibernet, Airtel, Jio), your ISP blocks <code>*.supabase.co</code> via DNS interception.<br><br>` +
      `<strong>How to fix:</strong><br>` +
      `1. In Chrome / Brave / Edge: Go to <em>Settings &rarr; Privacy & security &rarr; Security</em>.<br>` +
      `2. Scroll to <strong>"Use secure DNS"</strong>, turn it on, and select <strong>Cloudflare (1.1.1.1)</strong> or Google.<br>` +
      `3. Or click <strong>Continue as Guest</strong> below to use LifeOS offline.`;
  }
  if (/provider is not enabled|unsupported provider/i.test(msg)) {
    return `<strong>Google Sign-In is not enabled:</strong><br>` +
      `Google provider is currently disabled in your Supabase project.<br>` +
      `Please enable it in <strong>Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Google</strong> with your Google OAuth credentials, or sign up with Email below.`;
  }
  if (/over_email_send_rate_limit|rate limit/i.test(msg)) {
    return `<strong>Supabase Email Rate Limit Reached:</strong><br>` +
      `The Supabase free tier email limit has been reached.<br>` +
      `To fix: In <strong>Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Email</strong>, turn off <em>"Confirm email"</em> for immediate signups without email verification limits.`;
  }
  return msg;
}

class AuthService {
  constructor() {
    this.user = null;
    this.session = null;
    this.profile = null;
    this.status = 'idle'; // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Subscribe to authentication status and user changes
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately invoke with current state
    try {
      callback({
        user: this.user,
        profile: this.profile,
        session: this.session,
        status: this.status,
        isAuthenticated: Boolean(this.user)
      });
    } catch (e) {
      console.warn('[AuthService] Listener execution warning:', e);
    }
    return () => this.listeners.delete(callback);
  }

  /**
   * Broadcast auth state to all registered subscribers
   */
  notify() {
    const payload = {
      user: this.user,
      profile: this.profile,
      session: this.session,
      status: this.status,
      isAuthenticated: Boolean(this.user)
    };
    this.listeners.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error('[AuthService] Error notifying subscriber:', err);
      }
    });
  }

  /**
   * Initialize Authentication Lifecycle
   */
  async init() {
    if (this.isInitialized) return;
    this.status = 'loading';
    this.notify();

    // Check if Supabase client is available
    if (!supabaseService.isConfigured()) {
      // Attempt to fetch credentials from /api/config if not already in storage
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          if (config.supabaseUrl && config.supabaseAnonKey) {
            await supabaseService.saveConfig(config.supabaseUrl, config.supabaseAnonKey);
          }
        }
      } catch (e) {
        // Standalone or offline fallback
      }
    }

    if (!supabaseService.isConfigured()) {
      this.status = 'unauthenticated';
      this.isInitialized = true;
      this.notify();
      return;
    }

    const client = await supabaseService.getClient();
    if (!client) {
      this.status = 'unauthenticated';
      this.isInitialized = true;
      this.notify();
      return;
    }

    try {
      // Listen to auth state transitions
      client.auth.onAuthStateChange(async (event, session) => {
        console.info(`[LifeOS Auth] Event: ${event}`);
        this.session = session;
        this.user = session?.user || null;

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (this.user) {
            this.status = 'authenticated';
            await this.handleUserSignedIn(this.user);
          } else {
            this.status = 'unauthenticated';
          }
        } else if (event === 'SIGNED_OUT') {
          await this.handleUserSignedOut();
        } else if (event === 'USER_UPDATED') {
          if (this.user) {
            await this.loadUserProfile(this.user.id);
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          this.status = 'authenticated';
          window.location.hash = '#settings';
          if (window.openPasswordResetModal) {
            window.openPasswordResetModal();
          }
          toast.info('You have entered recovery mode. Please set your new password.');
        }

        this.notify();
      });

      // Fetch initial session
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;

      this.session = session;
      this.user = session?.user || null;

      if (this.user) {
        this.status = 'authenticated';
        await this.handleUserSignedIn(this.user);
      } else {
        this.status = 'unauthenticated';
      }
    } catch (err) {
      console.warn('[LifeOS Auth] Session initialization error:', err.message);
      this.status = 'unauthenticated';
    } finally {
      this.isInitialized = true;
      this.notify();
    }
  }

  /**
   * Handle user sign in: resolve profile, pull cloud data, subscribe to realtime updates
   * @param {object} user
   */
  async handleUserSignedIn(user) {
    console.info('[LifeOS Auth] User authenticated:', user.id, user.email || user.phone);

    // 0. Switch to user-isolated state store
    state.setActiveUser(user.id);

    // 1. Load or provision user profile in public.profiles
    const profile = await this.loadUserProfile(user.id);

    // 2. Load cloud-backed user data (tasks, habits, goals, projects, calendar, notes)
    await supabaseService.pullUserData(user.id);

    // 3. Connect real-time cross-device synchronisation
    supabaseService.subscribeToUserChanges(user.id);

    // 4. Update reactive state with verified user profile & settings
    if (profile) {
      const currentProfile = state.get('profile') || {};
      state.setKey('profile', {
        ...currentProfile,
        name: profile.display_name || currentProfile.name || 'User',
        roleTitle: profile.role_title || currentProfile.roleTitle || 'Software Engineer',
        profession: profile.profession || currentProfile.profession || 'engineer',
        theme: profile.theme || currentProfile.theme || 'dark',
        onboarded: profile.onboarded !== false
      });

      if (profile.theme) {
        document.documentElement.setAttribute('data-theme', profile.theme);
      }
    }

    toast.success(`Welcome back, ${profile?.display_name || user.email?.split('@')[0] || 'User'}!`);
  }

  /**
   * Handle user sign out: clean state, clear user-specific cache, stop realtime
   */
  async handleUserSignedOut() {
    console.info('[LifeOS Auth] User signed out. Purging session cache.');
    supabaseService.unsubscribeFromUserChanges();
    this.user = null;
    this.session = null;
    this.profile = null;
    this.status = 'unauthenticated';

    // Reset reactive state to pristine baseline so next user starts fresh
    state.setActiveUser(null);
    state.reset();

    toast.info('You have been signed out.');
  }

  /**
   * Load or upsert user profile from public.profiles
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async loadUserProfile(userId) {
    const client = await supabaseService.getClient();
    if (!client || !userId) return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[LifeOS Auth] Error fetching profile:', error.message);
      }

      if (data) {
        this.profile = data;
        return data;
      }

      // If profile record does not exist yet (e.g. trigger didn't run), create it
      const metadata = this.user?.user_metadata || {};
      const newProfile = {
        id: userId,
        display_name: metadata.display_name || metadata.full_name || this.user?.email?.split('@')[0] || 'User',
        username: (metadata.username || (this.user?.email?.split('@')[0] + '_' + userId.slice(0, 5))).toLowerCase(),
        avatar_url: metadata.avatar_url || null,
        email: this.user?.email || null,
        phone: this.user?.phone || null,
        profession: metadata.profession || 'engineer',
        role_title: metadata.role_title || 'Software Engineer',
        theme: 'dark',
        onboarded: Boolean(metadata.onboarded)
      };

      const { data: created, error: insertErr } = await client
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .single();

      if (insertErr) {
        console.warn('[LifeOS Auth] Profile upsert warning:', insertErr.message);
        this.profile = newProfile;
        return newProfile;
      }

      this.profile = created;
      return created;
    } catch (err) {
      console.error('[LifeOS Auth] Profile resolution error:', err);
      return null;
    }
  }


  /**
   * Register with Email and Password
   * @param {string} email
   * @param {string} password
   * @param {object} metadata
   * @returns {Promise<{success: boolean, error?: string, user?: object, session?: object}>}
   */
  async signUpWithEmail(email, password, metadata = {}) {
    const client = await supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database service is not configured. Please check Supabase credentials.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: metadata.displayName || metadata.name || 'User',
            profession: metadata.profession || 'engineer',
            role_title: metadata.roleTitle || 'Software Engineer',
            onboarded: false
          },
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) throw error;

      return {
        success: true,
        user: data.user,
        session: data.session,
        needsVerification: !data.session && Boolean(data.user)
      };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Log in with Email and Password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success: boolean, error?: string, user?: object}>}
   */
  async signInWithEmail(email, password) {
    const client = await supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database service is not configured. Please check Supabase credentials.' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) throw error;

      this.session = data.session;
      this.user = data.user;
      this.status = 'authenticated';
      await this.handleUserSignedIn(data.user);
      this.notify();

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Request OTP code via SMS for International Phone Number
   * @param {string} phone e.g. +1234567890
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async signInWithPhoneOtp(phone) {
    const client = await supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database service is not configured.' };
    }

    // Clean phone number format
    const cleanedPhone = phone.trim().replace(/\s+/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(cleanedPhone)) {
      return { success: false, error: 'Please enter a valid international phone number starting with + and country code (e.g. +14155552671).' };
    }

    try {
      const { error } = await client.auth.signInWithOtp({
        phone: cleanedPhone,
        options: {
          channel: 'sms'
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Verify SMS OTP code
   * @param {string} phone
   * @param {string} token
   * @returns {Promise<{success: boolean, error?: string, user?: object}>}
   */
  async verifyPhoneOtp(phone, token) {
    const client = await supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database service is not configured.' };
    }

    const cleanedPhone = phone.trim().replace(/\s+/g, '');
    const cleanedToken = token.trim();

    if (!cleanedToken || cleanedToken.length < 6) {
      return { success: false, error: 'Please enter the complete 6-digit verification code.' };
    }

    try {
      const { data, error } = await client.auth.verifyOtp({
        phone: cleanedPhone,
        token: cleanedToken,
        type: 'sms'
      });

      if (error) throw error;

      this.session = data.session;
      this.user = data.user;
      this.status = 'authenticated';
      await this.handleUserSignedIn(data.user);
      this.notify();

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Log in with OAuth Provider (Google, Apple)
   * @param {string} provider ('google' | 'apple')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async signInWithOAuth(provider) {
    const client = await supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database service is not configured.' };
    }

    try {
      // 1. Generate OAuth authorization URL with skipBrowserRedirect to pre-validate
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('No redirect URL returned by OAuth service.');
      }

      // 2. Pre-verify the provider endpoint to prevent dumping the user onto an unreachable site
      try {
        const probe = await fetch(data.url, { method: 'GET' });
        if (!probe.ok) {
          const errData = await probe.json().catch(() => null);
          if (errData?.msg) {
            throw new Error(errData.msg);
          }
        }
      } catch (probeErr) {
        throw probeErr;
      }

      // 3. Endpoint is verified and reachable — proceed to navigate
      window.location.assign(data.url);
      return { success: true, url: data.url };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Trigger Password Reset Email
   * @param {string} email
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async resetPasswordForEmail(email) {
    const client = await supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database service is not configured.' };
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + window.location.pathname + '#settings'
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Update User Password (used for authenticated reset or in settings)
   * @param {string} newPassword
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updatePassword(newPassword) {
    const client = await supabaseService.getClient();
    if (!client || !this.user) {
      return { success: false, error: 'Authentication required to update password.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Resend Email Verification link
   * @param {string} email
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async resendVerificationEmail(email) {
    const client = await supabaseService.getClient();
    if (!client) return { success: false, error: 'Database service is not configured.' };

    try {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update Profile Details in public.profiles
   * @param {object} profileData
   * @returns {Promise<{success: boolean, error?: string, profile?: object}>}
   */
  async updateProfile(profileData = {}) {
    const client = await supabaseService.getClient();
    if (!client || !this.user) {
      // Offline / Local Mode: update state directly
      const current = state.get('profile') || {};
      const updated = { ...current, ...profileData };
      state.setKey('profile', updated);
      return { success: true, profile: updated };
    }

    try {
      const payload = {
        id: this.user.id,
        ...profileData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      this.profile = data;
      // Sync to local state
      state.setKey('profile', {
        ...state.get('profile'),
        name: data.display_name,
        roleTitle: data.role_title,
        profession: data.profession,
        theme: data.theme,
        onboarded: Boolean(data.onboarded)
      });

      this.notify();
      return { success: true, profile: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sign out user from current device or globally
   * @param {object} options
   * @param {'local' | 'global'} [options.scope='local']
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async signOut({ scope = 'local' } = {}) {
    const client = await supabaseService.getClient();
    if (client) {
      try {
        await client.auth.signOut({ scope });
      } catch (err) {
        console.warn('[LifeOS Auth] Sign out warning:', err.message);
      }
    }

    await this.handleUserSignedOut();
    return { success: true };
  }

  /**
   * Delete User Account and all owned data across tables
   * @param {string} confirmationText Must equal 'DELETE ACCOUNT'
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteAccount(confirmationText) {
    if (confirmationText !== 'DELETE ACCOUNT') {
      return { success: false, error: 'Confirmation mismatch. Type "DELETE ACCOUNT" to proceed.' };
    }

    const client = await supabaseService.getClient();
    if (!client || !this.user) {
      // Local storage clear
      storage.clear();
      state.reset();
      await this.handleUserSignedOut();
      return { success: true };
    }

    const userId = this.user.id;

    try {
      // Delete all user-owned rows in domain tables
      await Promise.allSettled([
        client.from('tasks').delete().eq('user_id', userId),
        client.from('habits').delete().eq('user_id', userId),
        client.from('goals').delete().eq('user_id', userId),
        client.from('projects').delete().eq('user_id', userId),
        client.from('calendar_events').delete().eq('user_id', userId),
        client.from('notes').delete().eq('user_id', userId),
        client.from('user_backups').delete().eq('user_id', userId),
        client.from('profiles').delete().eq('id', userId)
      ]);

      // Sign out
      await client.auth.signOut({ scope: 'global' });
      await this.handleUserSignedOut();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Export complete personal data as structured JSON package
   * @returns {Promise<object>}
   */
  async exportUserData() {
    const userId = this.user?.id;
    const client = await supabaseService.getClient();

    let exportPayload = {
      exportDate: new Date().toISOString(),
      user: {
        id: userId || 'local_user',
        email: this.user?.email || null,
        phone: this.user?.phone || null,
        profile: this.profile || state.get('profile')
      },
      data: {
        tasks: state.get('todayTasks') || [],
        habits: state.get('todayHabits') || [],
        goals: state.get('goals') || [],
        projects: state.get('projects') || [],
        calendarEvents: state.get('calendarEvents') || [],
        notes: state.get('notes') || []
      }
    };

    // If connected to Supabase, fetch fresh database records
    if (client && userId) {
      try {
        const [
          { data: tasks },
          { data: habits },
          { data: goals },
          { data: projects },
          { data: calendarEvents },
          { data: notes },
          { data: profile }
        ] = await Promise.all([
          client.from('tasks').select('*').eq('user_id', userId),
          client.from('habits').select('*').eq('user_id', userId),
          client.from('goals').select('*').eq('user_id', userId),
          client.from('projects').select('*').eq('user_id', userId),
          client.from('calendar_events').select('*').eq('user_id', userId),
          client.from('notes').select('*').eq('user_id', userId),
          client.from('profiles').select('*').eq('id', userId).maybeSingle()
        ]);

        exportPayload.data = {
          tasks: tasks || exportPayload.data.tasks,
          habits: habits || exportPayload.data.habits,
          goals: goals || exportPayload.data.goals,
          projects: projects || exportPayload.data.projects,
          calendarEvents: calendarEvents || exportPayload.data.calendarEvents,
          notes: notes || exportPayload.data.notes
        };
        if (profile) exportPayload.user.profile = profile;
      } catch (e) {
        console.warn('[LifeOS Auth] Export fallback to local state:', e);
      }
    }

    return exportPayload;
  }

  // Helper getters
  isAuthenticated() {
    return Boolean(this.user);
  }

  getUser() {
    return this.user;
  }

  getUserId() {
    return this.user?.id || null;
  }

  getProfile() {
    return this.profile;
  }
}

export const authService = new AuthService();
