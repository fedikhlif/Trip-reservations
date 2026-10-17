import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer>
      <div class="container footer-grid">
        <div><a routerLink="/" class="brand light"><span>◌</span> roamly</a><p>Des voyages pensés pour les esprits curieux.</p></div>
        <div><strong>Explorer</strong><a routerLink="/trips">Tous les voyages</a><a routerLink="/destinations">Destinations</a></div>
        <div><strong>Assistance</strong><a routerLink="/reservations">Mes réservations</a><a href="mailto:bonjour@roamly.travel">Nous contacter</a></div>
        <p class="copyright">© 2025 Roamly Travel — Interface Angular de démonstration.</p>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
