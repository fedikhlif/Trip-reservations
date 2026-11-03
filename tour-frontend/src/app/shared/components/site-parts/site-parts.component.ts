import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  template: `
    <header class="page-band">
      <div>
        <h1>{{ title }}</h1>
        <p>Home <span>/</span> {{ current }}</p>
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) current!: string;
}

@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [],
  template: `
    <header class="section-title">
      <p>{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <span><ng-content /></span>
    </header>
  `,
})
export class SectionHeadingComponent {
  @Input({ required: true }) eyebrow!: string;
  @Input({ required: true }) title!: string;
}

@Component({
  selector: 'app-stats-band',
  standalone: true,
  imports: [NgIf],
  template: `
    <section class="stats-band">
      <div class="stats-grid">
        <div><strong>{{ destinationCount }}</strong><span>Destinations in our catalogue</span></div>
        <div><strong>{{ tripCount }}</strong><span>Available trips</span></div>
        <div><strong>{{ availableSeats }}</strong><span>Available seats</span></div>
        <button *ngIf="showAction" type="button" (click)="action.emit()">
          Plan your trip
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
        </button>
      </div>
    </section>
  `,
})
export class StatsBandComponent {
  @Input() showAction = false;
  @Input() destinationCount = '—';
  @Input() tripCount = '—';
  @Input() availableSeats = '—';
  @Output() action = new EventEmitter<void>();
}
