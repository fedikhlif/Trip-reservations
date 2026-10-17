import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../shared/models';

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <section class="page container auth-page"><div class="auth-card"><p class="eyebrow">Espace sécurisé</p><h1>Bienvenue.</h1><p>Connectez-vous avec le compte de démonstration de votre choix.</p>
      <form [formGroup]="loginForm" (ngSubmit)="login()">
        <label><span>Adresse e-mail</span><input formControlName="email" type="email" autocomplete="email" /></label>
        @if (loginForm.controls.email.touched && loginForm.controls.email.invalid) { <p class="error">Saisissez une adresse e-mail valide.</p> }
        <label><span>Profil de démonstration</span><select formControlName="role"><option value="CUSTOMER">Client</option><option value="ADMIN">Administrateur</option></select></label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button class="button primary full" [disabled]="loading()">{{ loading() ? 'Connexion…' : 'Se connecter' }}</button>
      </form>
      <small>Cette authentification est mockée. Le backend devra valider le compte et les autorisations.</small>
    </div></section>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly loginForm = this.fb.nonNullable.group({
    email: ['maya@example.com', [Validators.required, Validators.email]],
    role: [this.route.snapshot.queryParamMap.get('role') === 'ADMIN' ? 'ADMIN' as UserRole : 'CUSTOMER' as UserRole, Validators.required],
  });

  login(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading.set(true);
    const { email, role } = this.loginForm.getRawValue();
    this.auth.login(email, role).subscribe({
      next: () => {
        const fallback = role === 'ADMIN' ? '/admin' : '/dashboard';
        this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? fallback);
      },
      error: () => { this.error.set('Connexion impossible. Réessayez.'); this.loading.set(false); },
    });
  }
}
