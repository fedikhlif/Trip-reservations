import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="container nav">
        <a routerLink="/" class="brand" (click)="menuOpen.set(false)"><span>◌</span> roamly</a>
        <nav [class.open]="menuOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="close()">Accueil</a>
          <a routerLink="/trips" routerLinkActive="active" (click)="close()">Explorer</a>
          <a routerLink="/destinations" routerLinkActive="active" (click)="close()">Destinations</a>
          <a routerLink="/reservations" routerLinkActive="active" (click)="close()">Mes réservations</a>
          <a routerLink="/admin" routerLinkActive="active" (click)="close()">Administration</a>
        </nav>
        @if (auth.isAuthenticated()) {
          <button class="button ghost desktop-login" type="button" (click)="logout()">Déconnexion</button>
        } @else {
          <a routerLink="/auth/login" class="button ghost desktop-login">Se connecter</a>
        }
        <button class="menu" type="button" (click)="toggleMenu()" aria-label="Ouvrir le menu">☰</button>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);
  private readonly router = inject(Router);

  close(): void { this.menuOpen.set(false); }
  toggleMenu(): void { this.menuOpen.update((value) => !value); }
  logout(): void { this.auth.logout(); this.router.navigate(['/']); }
}
