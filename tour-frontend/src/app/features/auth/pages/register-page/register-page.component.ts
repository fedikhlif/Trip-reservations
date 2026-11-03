import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  template: `
    <div class="auth-shell">
      <!-- Left: travel visual -->
      <div class="auth-visual" aria-hidden="true">
        <div class="auth-visual-overlay"></div>
        <div class="auth-visual-content">
          <span class="auth-brand">TOUR</span>
          <p>Join thousands of travellers who trust TOUR.</p>
        </div>
      </div>

      <!-- Right: form -->
      <main class="auth-form-panel" id="register-main">
        <div class="auth-form-card">
          <!-- Logo for small screens -->
          <a routerLink="/" class="auth-mobile-brand" aria-label="TOUR — Home">TOUR</a>

          <header class="auth-form-header">
            <h1>Create an account</h1>
            <p>Start your adventure with TOUR today.</p>
          </header>

          <form (ngSubmit)="submit()" novalidate aria-label="Sign up">
            <!-- Error banner -->
            <div *ngIf="error()" class="auth-error" role="alert" aria-live="polite">
              {{ error() }}
            </div>

            <!-- Name row -->
            <div class="auth-name-row">
              <div class="auth-field">
                <label for="reg-first-name">First name <span aria-hidden="true">*</span></label>
                <input
                  id="reg-first-name"
                  type="text"
                  name="first_name"
                  autocomplete="given-name"
                  placeholder="Alex"
                  [(ngModel)]="firstName"
                  [class.input-error]="submitted && !firstName.trim()"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="submitted && !firstName.trim() ? 'true' : null"
                  aria-describedby="reg-first-name-err"
                />
                <span
                  *ngIf="submitted && !firstName.trim()"
                  id="reg-first-name-err"
                  class="field-error"
                  role="alert"
                >First name is required.</span>
              </div>

              <div class="auth-field">
                <label for="reg-last-name">Last name <span aria-hidden="true">*</span></label>
                <input
                  id="reg-last-name"
                  type="text"
                  name="last_name"
                  autocomplete="family-name"
                  placeholder="Smith"
                  [(ngModel)]="lastName"
                  [class.input-error]="submitted && !lastName.trim()"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="submitted && !lastName.trim() ? 'true' : null"
                  aria-describedby="reg-last-name-err"
                />
                <span
                  *ngIf="submitted && !lastName.trim()"
                  id="reg-last-name-err"
                  class="field-error"
                  role="alert"
                >Last name is required.</span>
              </div>
            </div>

            <!-- Email -->
            <div class="auth-field">
              <label for="reg-email">Email address <span aria-hidden="true">*</span></label>
              <input
                id="reg-email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="you@example.com"
                [(ngModel)]="email"
                [class.input-error]="submitted && !emailValid()"
                required
                aria-required="true"
                [attr.aria-invalid]="submitted && !emailValid() ? 'true' : null"
                aria-describedby="reg-email-err"
              />
              <span
                *ngIf="submitted && !emailValid()"
                id="reg-email-err"
                class="field-error"
                role="alert"
              >Please enter a valid email address.</span>
            </div>

            <!-- Password -->
            <div class="auth-field">
              <label for="reg-password">Password <span aria-hidden="true">*</span></label>
              <div class="password-combo">
                <input
                  id="reg-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  name="password"
                  autocomplete="new-password"
                  placeholder="At least 8 characters"
                  [(ngModel)]="password"
                  [class.input-error]="submitted && !passwordValid()"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="submitted && !passwordValid() ? 'true' : null"
                  aria-describedby="reg-pw-err"
                />
                <button
                  type="button"
                  class="pw-toggle"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  (click)="toggleShowPassword()"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path *ngIf="!showPassword()" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle *ngIf="!showPassword()" cx="12" cy="12" r="3"/>
                    <path *ngIf="showPassword()" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line *ngIf="showPassword()" x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span
                *ngIf="submitted && !passwordValid()"
                id="reg-pw-err"
                class="field-error"
                role="alert"
              >Password must be at least 8 characters long.</span>
            </div>

            <!-- Confirm password -->
            <div class="auth-field">
              <label for="reg-confirm">Confirm password <span aria-hidden="true">*</span></label>
              <div class="password-combo">
                <input
                  id="reg-confirm"
                  [type]="showConfirm() ? 'text' : 'password'"
                  name="password_confirm"
                  autocomplete="new-password"
                  placeholder="Enter your password again"
                  [(ngModel)]="passwordConfirm"
                  [class.input-error]="submitted && !confirmValid()"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="submitted && !confirmValid() ? 'true' : null"
                  aria-describedby="reg-confirm-err"
                />
                <button
                  type="button"
                  class="pw-toggle"
                  [attr.aria-label]="showConfirm() ? 'Hide password' : 'Show password'"
                  (click)="toggleShowConfirm()"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path *ngIf="!showConfirm()" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle *ngIf="!showConfirm()" cx="12" cy="12" r="3"/>
                    <path *ngIf="showConfirm()" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line *ngIf="showConfirm()" x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span
                *ngIf="submitted && !confirmValid()"
                id="reg-confirm-err"
                class="field-error"
                role="alert"
              >Passwords do not match.</span>
            </div>

            <!-- Submit -->
            <button
              id="register-submit"
              type="submit"
              class="auth-submit-btn"
              [disabled]="loading()"
            >
              <span *ngIf="loading()" class="auth-spinner" aria-hidden="true"></span>
              {{ loading() ? 'Creating account…' : 'Create my account' }}
            </button>
          </form>

          <p class="auth-switch">
            Already have an account?
            <a routerLink="/login" id="register-to-login">Log in</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@700;800&family=Roboto:wght@300;400;600&display=swap');
    :host { display: block; }

    .auth-shell {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100vh;
    }

    /* ── Visual panel ── */
    .auth-visual {
      position: relative;
      background: url('https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1400&q=88') center/cover;
      display: flex;
      align-items: flex-end;
    }
    .auth-visual-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(6,62,73,.92) 0%, rgba(8,145,178,.55) 100%);
    }
    .auth-visual-content {
      position: relative;
      z-index: 1;
      padding: 48px;
      color: #fff;
    }
    .auth-brand {
      display: block;
      font-family: 'Raleway', sans-serif;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: .18em;
      margin-bottom: 16px;
    }
    .auth-visual-content p {
      font-size: 18px;
      font-weight: 300;
      color: rgba(255,255,255,.82);
      line-height: 1.6;
      margin: 0;
      max-width: 320px;
    }

    /* ── Form panel ── */
    .auth-form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f8f8;
      padding: 40px 24px;
    }
    .auth-form-card {
      width: 100%;
      max-width: 460px;
    }
    .auth-mobile-brand {
      display: none;
      font-family: 'Raleway', sans-serif;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: .18em;
      color: #0891b2;
      text-decoration: none;
      margin-bottom: 28px;
    }

    /* ── Header ── */
    .auth-form-header { margin-bottom: 28px; }
    .auth-form-header h1 {
      font-family: 'Raleway', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #1a2526;
      margin: 0 0 8px;
      letter-spacing: -.02em;
    }
    .auth-form-header p {
      margin: 0;
      color: #6e7778;
      font-size: 15px;
      line-height: 1.55;
    }

    /* ── Error ── */
    .auth-error {
      margin-bottom: 20px;
      padding: 13px 16px;
      border: 1px solid #f0c6c2;
      border-radius: 10px;
      background: #fff4f2;
      color: #9c3027;
      font-size: 14px;
      line-height: 1.5;
    }

    /* ── Name row ── */
    .auth-name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    /* ── Fields ── */
    .auth-field {
      display: grid;
      gap: 7px;
      margin-bottom: 18px;
    }
    .auth-field label {
      font-size: 13px;
      font-weight: 600;
      color: #3a4445;
    }
    .auth-field label span { color: #c94141; margin-left: 1px; }
    .auth-field input {
      height: 52px;
      width: 100%;
      padding: 0 15px;
      border: 1.5px solid #c8d3d4;
      border-radius: 12px;
      background: #fff;
      color: #1a2526;
      font-size: 15px;
      outline: none;
      transition: border-color 180ms, box-shadow 180ms;
    }
    .auth-field input:focus {
      border-color: #0891b2;
      box-shadow: 0 0 0 3px rgba(8,145,178,.14);
    }
    .auth-field input.input-error {
      border-color: #c94141;
      box-shadow: 0 0 0 3px rgba(201,65,65,.1);
    }
    .field-error {
      font-size: 12px;
      color: #c94141;
    }

    /* ── Password combo ── */
    .password-combo { position: relative; }
    .password-combo input { padding-right: 50px; }
    .pw-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: 0;
      cursor: pointer;
      color: #7a8788;
      padding: 4px;
      line-height: 0;
    }
    .pw-toggle svg {
      width: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .pw-toggle:hover { color: #0891b2; }

    /* ── Submit ── */
    .auth-submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 52px;
      margin-top: 8px;
      border: 0;
      border-radius: 999px;
      background: #0891b2;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 200ms, transform 120ms;
    }
    .auth-submit-btn:hover:not(:disabled) { background: #0780a0; }
    .auth-submit-btn:active:not(:disabled) { transform: scale(.98); }
    .auth-submit-btn:disabled { opacity: .65; cursor: not-allowed; }

    /* ── Spinner ── */
    .auth-spinner {
      width: 17px;
      height: 17px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Switch ── */
    .auth-switch {
      margin-top: 24px;
      text-align: center;
      color: #6e7778;
      font-size: 14px;
    }
    .auth-switch a {
      color: #0891b2;
      font-weight: 600;
      text-decoration: none;
    }
    .auth-switch a:hover { text-decoration: underline; }

    /* ── Responsive ── */
    @media (max-width: 860px) {
      .auth-shell { grid-template-columns: 1fr; }
      .auth-visual { display: none; }
      .auth-mobile-brand { display: block; }
      .auth-name-row { grid-template-columns: 1fr; gap: 0; }
    }
  `],
})
export class RegisterPageComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  passwordConfirm = '';
  submitted = false;
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  showConfirm = signal(false);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  emailValid(): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(this.email);
  }

  passwordValid(): boolean {
    return this.password.length >= 8;
  }

  confirmValid(): boolean {
    return this.password === this.passwordConfirm && this.passwordConfirm.length > 0;
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleShowConfirm(): void {
    this.showConfirm.update((v) => !v);
  }

  submit(): void {
    this.submitted = true;
    this.error.set('');

    if (
      !this.firstName.trim() ||
      !this.lastName.trim() ||
      !this.emailValid() ||
      !this.passwordValid() ||
      !this.confirmValid()
    ) {
      return;
    }

    this.loading.set(true);
    this.auth
      .register({
        first_name: this.firstName.trim(),
        last_name: this.lastName.trim(),
        email: this.email.trim(),
        password: this.password,
        password_confirm: this.passwordConfirm,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/mes-reservations']);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
