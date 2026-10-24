/* ==========================================================================
   LifeOS Authentication UI Controller & Dialogs
   Full Auth Lifecycle Modal: Sign In, Sign Up, Phone OTP, Password Reset,
   Email Verification, and Account Restoration Experiences.
   ========================================================================== */

import { authService } from './auth.js';
import { sound } from './audio.js';
import { toast } from './toast.js';

class AuthModalController {
  constructor() {
    this.modalEl = null;
    this.currentView = 'signin'; // 'signin' | 'signup' | 'phone' | 'otp' | 'forgot' | 'reset' | 'verify' | 'restoring'
    this.phoneTarget = '';
    this.emailTarget = '';
    this.cooldownTimer = null;
    this.cooldownSeconds = 0;
  }

  init() {
    this.modalEl = document.getElementById('auth-modal');
    if (!this.modalEl) return;

    this.bindEvents();

    // Check for recovery hash in URL (e.g. #access_token=...&type=recovery or #reset-password)
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('reset-password')) {
      setTimeout(() => {
        this.open('reset');
      }, 500);
    }

    // Subscribe to auth state to update header & sidebar controls
    authService.subscribe((auth) => {
      this.updateAuthUI(auth);
    });
  }

  /**
   * Open the Authentication Modal to a specific view
   * @param {'signin'|'signup'|'phone'|'otp'|'forgot'|'reset'|'verify'|'restoring'} view
   */
  open(view = 'signin') {
    sound.playClick();
    this.setView(view);
    if (this.modalEl) {
      this.modalEl.classList.add('open');
      this.modalEl.classList.add('active');
    }
  }

  /**
   * Close the Authentication Modal
   */
  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
      this.modalEl.classList.remove('active');
    }
    this.clearErrors();
  }

  /**
   * Switch the visible form view inside the modal
   * @param {string} view
   */
  setView(view) {
    this.currentView = view;
    this.clearErrors();

    const views = ['signin', 'signup', 'phone', 'otp', 'forgot', 'reset', 'verify', 'restoring'];
    views.forEach(v => {
      const el = document.getElementById(`auth-view-${v}`);
      if (el) el.style.display = (v === view) ? 'block' : 'none';
    });

    // Auto-focus primary input for view
    setTimeout(() => {
      if (view === 'signin') document.getElementById('auth-signin-email')?.focus();
      else if (view === 'signup') document.getElementById('auth-signup-name')?.focus();
      else if (view === 'phone') document.getElementById('auth-phone-number')?.focus();
      else if (view === 'otp') document.getElementById('auth-otp-code')?.focus();
      else if (view === 'forgot') document.getElementById('auth-forgot-email')?.focus();
      else if (view === 'reset') document.getElementById('auth-reset-pass')?.focus();
    }, 60);
  }

  showError(message) {
    const errorBox = document.getElementById(`auth-error-${this.currentView}`);
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.style.display = 'block';
    } else {
      toast.error(message);
    }
  }

  clearErrors() {
    const errorBoxes = this.modalEl?.querySelectorAll('.auth-error-box');
    errorBoxes?.forEach(box => {
      box.style.display = 'none';
      box.textContent = '';
    });
  }

  startCooldown(seconds = 60) {
    this.cooldownSeconds = seconds;
    const resendBtn = document.getElementById('btn-auth-resend-otp');
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);

    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.textContent = `Resend in ${this.cooldownSeconds}s`;
    }

    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds--;
      if (resendBtn) {
        if (this.cooldownSeconds > 0) {
          resendBtn.textContent = `Resend in ${this.cooldownSeconds}s`;
        } else {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend Code';
          clearInterval(this.cooldownTimer);
        }
      }
    }, 1000);
  }

  bindEvents() {
    const closeBtn = document.getElementById('btn-close-auth-modal');
    if (closeBtn) closeBtn.onclick = () => this.close();

    // Close on backdrop click
    if (this.modalEl) {
      this.modalEl.onclick = (e) => {
        if (e.target === this.modalEl) this.close();
      };
    }

    // Switch view triggers
    document.querySelectorAll('[data-auth-switch]').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        sound.playClick();
        const targetView = btn.dataset.authSwitch;
        if (targetView) this.setView(targetView);
      };
    });

    // 1. Sign In Submit
    const btnSubmitSignin = document.getElementById('btn-submit-signin');
    if (btnSubmitSignin) {
      btnSubmitSignin.onclick = async () => {
        const email = document.getElementById('auth-signin-email')?.value.trim();
        const pass = document.getElementById('auth-signin-password')?.value;

        if (!email || !pass) {
          this.showError('Please enter both your email address and password.');
          return;
        }

        btnSubmitSignin.disabled = true;
        btnSubmitSignin.textContent = 'Signing in...';
        this.clearErrors();

        const res = await authService.signInWithEmail(email, pass);
        btnSubmitSignin.disabled = false;
        btnSubmitSignin.textContent = 'Sign In to LifeOS';

        if (res.success) {
          sound.playComplete();
          this.close();
        } else {
          this.showError(res.error || 'Failed to sign in. Please verify your credentials.');
        }
      };
    }

    // 2. Sign Up Submit
    const btnSubmitSignup = document.getElementById('btn-submit-signup');
    if (btnSubmitSignup) {
      btnSubmitSignup.onclick = async () => {
        const name = document.getElementById('auth-signup-name')?.value.trim();
        const email = document.getElementById('auth-signup-email')?.value.trim();
        const pass = document.getElementById('auth-signup-password')?.value;
        const profession = document.getElementById('auth-signup-profession')?.value || 'engineer';

        if (!email || !pass) {
          this.showError('Please provide both an email address and a password.');
          return;
        }

        if (pass.length < 6) {
          this.showError('Password must be at least 6 characters long.');
          return;
        }

        btnSubmitSignup.disabled = true;
        btnSubmitSignup.textContent = 'Creating account...';
        this.clearErrors();

        const res = await authService.signUpWithEmail(email, pass, {
          displayName: name || 'User',
          profession
        });

        btnSubmitSignup.disabled = false;
        btnSubmitSignup.textContent = 'Create LifeOS Account';

        if (res.success) {
          sound.playComplete();
          if (res.needsVerification) {
            this.emailTarget = email;
            const targetEl = document.getElementById('auth-verify-target-email');
            if (targetEl) targetEl.textContent = email;
            this.setView('verify');
          } else {
            this.close();
          }
        } else {
          this.showError(res.error || 'Failed to create account.');
        }
      };
    }

    // 3. Phone OTP Request Submit
    const btnSubmitPhone = document.getElementById('btn-submit-phone');
    if (btnSubmitPhone) {
      btnSubmitPhone.onclick = async () => {
        const countryCode = document.getElementById('auth-country-code')?.value || '+1';
        const rawNumber = document.getElementById('auth-phone-number')?.value.trim();

        if (!rawNumber) {
          this.showError('Please enter your phone number.');
          return;
        }

        const fullPhone = `${countryCode}${rawNumber.replace(/^0+/, '').replace(/\D+/g, '')}`;
        this.phoneTarget = fullPhone;

        btnSubmitPhone.disabled = true;
        btnSubmitPhone.textContent = 'Sending code...';
        this.clearErrors();

        const res = await authService.signInWithPhoneOtp(fullPhone);
        btnSubmitPhone.disabled = false;
        btnSubmitPhone.textContent = 'Send Verification Code';

        if (res.success) {
          sound.playComplete();
          const targetEl = document.getElementById('auth-otp-target-display');
          if (targetEl) targetEl.textContent = fullPhone;
          this.setView('otp');
          this.startCooldown(60);
        } else {
          this.showError(res.error || 'Could not send verification code.');
        }
      };
    }

    // 4. Verify OTP Code Submit
    const btnSubmitOtp = document.getElementById('btn-submit-otp');
    if (btnSubmitOtp) {
      btnSubmitOtp.onclick = async () => {
        const code = document.getElementById('auth-otp-code')?.value.trim();
        if (!code || code.length < 6) {
          this.showError('Please enter the 6-digit verification code sent to your phone.');
          return;
        }

        btnSubmitOtp.disabled = true;
        btnSubmitOtp.textContent = 'Verifying...';
        this.clearErrors();

        const res = await authService.verifyPhoneOtp(this.phoneTarget, code);
        btnSubmitOtp.disabled = false;
        btnSubmitOtp.textContent = 'Verify & Enter LifeOS';

        if (res.success) {
          sound.playComplete();
          this.close();
        } else {
          this.showError(res.error || 'Invalid or expired code. Please check and try again.');
        }
      };
    }

    // Resend OTP button
    const btnResendOtp = document.getElementById('btn-auth-resend-otp');
    if (btnResendOtp) {
      btnResendOtp.onclick = async () => {
        if (!this.phoneTarget) return;
        sound.playClick();
        btnResendOtp.disabled = true;
        const res = await authService.signInWithPhoneOtp(this.phoneTarget);
        if (res.success) {
          toast.success('A new verification code has been sent.');
          this.startCooldown(60);
        } else {
          toast.error(res.error || 'Failed to resend code.');
        }
      };
    }

    // 5. Forgot Password Submit
    const btnSubmitForgot = document.getElementById('btn-submit-forgot');
    if (btnSubmitForgot) {
      btnSubmitForgot.onclick = async () => {
        const email = document.getElementById('auth-forgot-email')?.value.trim();
        if (!email) {
          this.showError('Please enter your account email address.');
          return;
        }

        btnSubmitForgot.disabled = true;
        btnSubmitForgot.textContent = 'Sending reset link...';
        this.clearErrors();

        const res = await authService.resetPasswordForEmail(email);
        btnSubmitForgot.disabled = false;
        btnSubmitForgot.textContent = 'Send Recovery Link';

        if (res.success) {
          sound.playComplete();
          toast.success(`Password reset email sent to ${email}. Follow the instructions in the email.`);
          this.setView('signin');
        } else {
          this.showError(res.error || 'Could not send reset email.');
        }
      };
    }

    // 6. Reset Password Submit
    const btnSubmitReset = document.getElementById('btn-submit-reset');
    if (btnSubmitReset) {
      btnSubmitReset.onclick = async () => {
        const p1 = document.getElementById('auth-reset-pass')?.value;
        const p2 = document.getElementById('auth-reset-pass-confirm')?.value;

        if (!p1 || p1.length < 6) {
          this.showError('Password must be at least 6 characters.');
          return;
        }

        if (p1 !== p2) {
          this.showError('Passwords do not match.');
          return;
        }

        btnSubmitReset.disabled = true;
        btnSubmitReset.textContent = 'Updating password...';
        this.clearErrors();

        const res = await authService.updatePassword(p1);
        btnSubmitReset.disabled = false;
        btnSubmitReset.textContent = 'Save New Password';

        if (res.success) {
          sound.playComplete();
          toast.success('Your password has been updated successfully!');
          this.close();
        } else {
          this.showError(res.error || 'Failed to update password.');
        }
      };
    }

    // 7. Resend Verification Email button
    const btnResendVerify = document.getElementById('btn-auth-resend-verify');
    if (btnResendVerify) {
      btnResendVerify.onclick = async () => {
        if (!this.emailTarget) return;
        sound.playClick();
        btnResendVerify.disabled = true;
        btnResendVerify.textContent = 'Sending...';

        const res = await authService.resendVerificationEmail(this.emailTarget);
        btnResendVerify.disabled = false;
        btnResendVerify.textContent = 'Resend Email';

        if (res.success) {
          toast.success('Verification link resent. Please check your inbox and spam folder.');
        } else {
          toast.error(res.error || 'Could not resend verification email.');
        }
      };
    }

    // OAuth Social Logins
    document.querySelectorAll('[data-oauth-provider]').forEach(btn => {
      btn.onclick = async () => {
        sound.playClick();
        const provider = btn.dataset.oauthProvider;
        const res = await authService.signInWithOAuth(provider);
        if (!res.success) {
          this.showError(res.error || `Could not sign in with ${provider}.`);
        }
      };
    });
  }

  /**
   * Synchronize Header, Sidebar, and Sync badges with auth state
   * @param {object} auth
   */
  updateAuthUI(auth) {
    const isAuth = Boolean(auth.user);
    const headerAuthBtn = document.getElementById('btn-header-auth');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarRole = document.getElementById('sidebar-user-role');
    const syncDot = document.getElementById('sidebar-sync-dot');

    if (headerAuthBtn) {
      if (isAuth) {
        headerAuthBtn.style.display = 'none';
      } else {
        headerAuthBtn.style.display = 'inline-flex';
        headerAuthBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>
          </svg>
          Sign In
        `;
        headerAuthBtn.onclick = () => this.open('signin');
      }
    }

    if (isAuth) {
      const displayName = auth.profile?.display_name || auth.user.email?.split('@')[0] || 'User';
      const roleTitle = auth.profile?.role_title || 'Software Engineer';

      if (sidebarName) sidebarName.textContent = displayName;
      if (sidebarRole) sidebarRole.textContent = roleTitle;
      if (sidebarAvatar) sidebarAvatar.textContent = displayName.charAt(0).toUpperCase();
      if (syncDot) {
        syncDot.className = 'user-status-dot online';
        syncDot.title = 'Cloud Synchronized (Real-time)';
      }
    } else {
      if (syncDot) {
        syncDot.className = 'user-status-dot local';
        syncDot.title = 'Local-First Mode (Offline)';
      }
    }
  }
}

export const authModal = new AuthModalController();

// Global handle for opening auth modal from HTML attributes
window.openAuthModal = (view) => authModal.open(view);
window.openPasswordResetModal = () => authModal.open('reset');
