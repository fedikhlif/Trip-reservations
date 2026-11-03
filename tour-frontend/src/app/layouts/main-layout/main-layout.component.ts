import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  template: `
    <div class="site-app">
      <!-- Navigation -->
      <header class="global-nav" [class.solid]="scrolled()">
        <nav class="nav-pill" aria-label="Main navigation">
          <a routerLink="/" class="brand-button" aria-label="Tour — Home">TOUR</a>

          <div class="desktop-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
            <a routerLink="/destinations" routerLinkActive="active">Destinations</a>
            <a routerLink="/circuits" routerLinkActive="active">Tours</a>
            <a routerLink="/mes-reservations" routerLinkActive="active" *ngIf="auth.isLoggedIn() && !auth.isAdmin()">My reservations</a>
            <!-- Admin links -->
            <a routerLink="/admin/destinations" routerLinkActive="active" *ngIf="auth.isAdmin()">Manage destinations</a>
            <a routerLink="/admin/trips" routerLinkActive="active" *ngIf="auth.isAdmin()">Create a trip</a>
            <a routerLink="/admin/catalogue" routerLinkActive="active" *ngIf="auth.isAdmin()">Trip catalogue</a>
            <a routerLink="/a-propos" routerLinkActive="active">About</a>
            <a routerLink="/contact" routerLinkActive="active">Contact</a>
          </div>

          <!-- Auth actions (desktop) -->
          <div class="nav-auth-desktop">
            <ng-container *ngIf="auth.isLoggedIn(); else guestLinks">
              <span class="nav-user-name">{{ auth.firstName() }}</span>
              <button type="button" class="nav-logout-btn" (click)="auth.logout()">Log out</button>
            </ng-container>
            <ng-template #guestLinks>
              <a routerLink="/login" class="nav-login-btn">Log in</a>
            </ng-template>
          </div>

          <a routerLink="/reservation" class="book-nav">Book now</a>

          <button
            id="nav-hamburger"
            class="hamburger"
            [class.open]="menuOpen()"
            type="button"
            [attr.aria-label]="menuOpen() ? 'Close menu' : 'Open menu'"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="mobile-navigation"
            (click)="toggleMenu()"
          ><i></i><i></i><i></i></button>

          <div id="mobile-navigation" class="mobile-panel" [class.open]="menuOpen()">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="closeMenu()">Home</a>
            <a routerLink="/destinations" routerLinkActive="active" (click)="closeMenu()">Destinations</a>
            <a routerLink="/circuits" routerLinkActive="active" (click)="closeMenu()">Tours</a>
            <a routerLink="/mes-reservations" routerLinkActive="active" (click)="closeMenu()" *ngIf="auth.isLoggedIn() && !auth.isAdmin()">My reservations</a>
            <a routerLink="/admin/destinations" routerLinkActive="active" (click)="closeMenu()" *ngIf="auth.isAdmin()">Manage destinations</a>
            <a routerLink="/admin/trips" routerLinkActive="active" (click)="closeMenu()" *ngIf="auth.isAdmin()">Create a trip</a>
            <a routerLink="/admin/catalogue" routerLinkActive="active" (click)="closeMenu()" *ngIf="auth.isAdmin()">Trip catalogue</a>
            <a routerLink="/a-propos" routerLinkActive="active" (click)="closeMenu()">About</a>
            <a routerLink="/contact" routerLinkActive="active" (click)="closeMenu()">Contact</a>
            <!-- Mobile auth -->
            <ng-container *ngIf="auth.isLoggedIn(); else mobileGuestLinks">
              <span class="mobile-user-name">{{ auth.firstName() }}</span>
              <button type="button" class="mobile-logout-btn" (click)="auth.logout(); closeMenu()">Log out</button>
            </ng-container>
            <ng-template #mobileGuestLinks>
              <a routerLink="/login" class="mobile-login-btn" (click)="closeMenu()">Log in</a>
            </ng-template>
            <a routerLink="/reservation" class="book-nav mobile-book" (click)="closeMenu()">Book now</a>
          </div>
        </nav>
      </header>

      <!-- Page content -->
      <div class="page-transition">
        <router-outlet />
      </div>

      <!-- Footer -->
      <footer class="global-footer">
        <div class="footer-main">
          <div>
            <a routerLink="/" class="brand-button" style="display:inline-block">TOUR</a>
            <p>Memorable trips, thoughtfully planned.</p>
          </div>
            <nav aria-label="Footer navigation">
              <a routerLink="/">Home</a>
            <a routerLink="/destinations">Destinations</a>
            <a routerLink="/circuits">Tours</a>
            <a routerLink="/a-propos">About</a>
            <a routerLink="/contact">Contact</a>
          </nav>
          <a routerLink="/reservation" class="footer-book">Plan your trip</a>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Tour. All rights reserved.</span>
          <span>Prices and availability are based on the trip catalogue.</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .brand-button { text-decoration: none; }
    .footer-main .brand-button { font-family: 'Raleway', sans-serif; font-size: 23px; font-weight: 800; letter-spacing: .18em; color: #fff; background: none; border: 0; cursor: pointer; }

    .book-nav {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      margin-left: 14px;
      color: #fff;
      box-shadow: 0 2px 12px rgba(7,128,160,.35);
      white-space: nowrap;
    }
    .book-nav:hover { background: #0a9dc2; box-shadow: 0 4px 18px rgba(7,128,160,.45); }
    @media (max-width: 980px) { .book-nav { display: none; } }

    /* Auth nav desktop */
    .nav-auth-desktop { display: flex; align-items: center; gap: 10px; margin-right: 8px; }
    .nav-user-name { color: rgba(255,255,255,.85); font-size: 13px; font-weight: 600; }
    .nav-login-btn { color: rgba(255,255,255,.8); font-size: 13px; text-decoration: none; padding: 6px 14px; border: 1px solid rgba(255,255,255,.3); border-radius: 999px; transition: all 180ms; }
    .nav-login-btn:hover { color: #fff; border-color: rgba(255,255,255,.7); background: rgba(255,255,255,.07); }
    .nav-logout-btn { background: none; border: 1px solid rgba(255,255,255,.3); border-radius: 999px; color: rgba(255,255,255,.75); cursor: pointer; font-size: 12px; padding: 5px 12px; transition: all 180ms; }
    .nav-logout-btn:hover { border-color: #e05f2f; color: #e05f2f; }

    /* Mobile auth */
    .mobile-user-name { display: block; padding: 10px 4px 4px; color: rgba(255,255,255,.55); font-size: 12px; }
    .mobile-login-btn { color: rgba(255,255,255,.78); text-decoration: none; display: block; padding: 12px 4px; border-bottom: 1px solid rgba(255,255,255,.07); }
    .mobile-logout-btn { background: none; border: 0; border-bottom: 1px solid rgba(255,255,255,.07); color: rgba(255,255,255,.65); cursor: pointer; display: block; font-size: 14px; padding: 12px 4px; text-align: left; width: 100%; }
  `],
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);

  scrolled = signal(false);
  menuOpen = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  toggleMenu(): void { this.menuOpen.update((v) => !v); }
  closeMenu(): void { this.menuOpen.set(false); }
}
