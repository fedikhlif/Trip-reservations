import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor } from '@angular/common';
import { PageHeaderComponent, StatsBandComponent } from '../../../../shared/components/site-parts/site-parts.component';

const features = [
  ['◇', 'Best price guaranteed', 'Transparent offers designed for every budget.'],
  ['⌖', 'Expert local guides', 'Passionate people who know every destination.'],
  ['◷', '24/7 support', 'Our team is here before, during, and after your trip.'],
  ['✓', 'Flexible booking', 'Clear terms for worry-free travel.'],
];

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [NgFor, PageHeaderComponent, StatsBandComponent],
  template: `
    <app-page-header title="About" current="About" />
    <main class="about-page">
      <div class="about-layout">
        <div class="about-photos">
          <img
            src="https://images.unsplash.com/photo-1769365684859-363edb643bbf?auto=format&fit=crop&w=1200&q=85"
            alt="Group of travellers" loading="lazy"
          />
          <img
            src="https://images.unsplash.com/flagged/photo-1573998594056-53123f2fedec?auto=format&fit=crop&w=600&q=85"
            alt="Happy travellers" loading="lazy"
          />
          <span><strong>15+</strong>Years of experience</span>
        </div>
        <div class="about-text">
          <p>About us</p>
          <h2>We create unforgettable travel experiences</h2>
          <span>
            For over fifteen years, we have turned your desire to explore into thoughtfully planned trips.
            Our experts connect you with authentic places, meaningful encounters, and lasting memories.
          </span>
          <div class="feature-grid">
            <article *ngFor="let f of features">
              <i>{{ f[0] }}</i>
              <div><h3>{{ f[1] }}</h3><p>{{ f[2] }}</p></div>
            </article>
          </div>
          <button type="button" (click)="router.navigate(['/reservation'])">Plan my trip</button>
        </div>
      </div>
    </main>
    <app-stats-band />
  `,
})
export class AboutPageComponent {
  readonly features = features;
  constructor(readonly router: Router) {}
}
