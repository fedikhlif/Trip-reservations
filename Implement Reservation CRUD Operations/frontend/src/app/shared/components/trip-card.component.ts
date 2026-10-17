import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Trip } from '../models';

@Component({
  selector: 'app-trip-card',
  imports: [RouterLink, DecimalPipe],
  template: `
    <article class="trip-card">
      <a [routerLink]="['/trips', trip().id]" class="trip-image">
        <img [src]="trip().image" [alt]="trip().location + ', ' + trip().country" />
        <span class="badge light">{{ trip().duration }} jours</span>
      </a>
      <div class="trip-body">
        <div class="meta"><span>⌖ {{ trip().location }}, {{ trip().country }}</span><strong>★ {{ trip().rating }}</strong></div>
        <a [routerLink]="['/trips', trip().id]" class="trip-title">{{ trip().title }}</a>
        <div class="details"><span>{{ trip().date }}</span><span>{{ trip().seats }} places</span></div>
        <div class="trip-footer"><span>Dès <strong>{{ trip().price | number:'1.0-0' }} €</strong></span><a [routerLink]="['/trips', trip().id]">→</a></div>
      </div>
    </article>
  `,
})
export class TripCardComponent {
  trip = input.required<Trip>();
}
