import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TripService } from '../../core/services/trip.service';
import { TripCardComponent } from '../../shared/components/trip-card.component';
import { TripFilterValue, TripFiltersComponent } from '../../shared/components/trip-filters.component';

@Component({
  imports: [TripCardComponent, TripFiltersComponent],
  template: `
    <section class="page container"><div class="page-intro"><p class="eyebrow">Trouvez votre prochaine histoire</p><h1>Explorez nos voyages</h1><p>Des itinéraires bien rythmés, des adresses choisies et juste ce qu’il faut d’aventure.</p></div>
      <app-trip-filters (filtersChange)="filters.set($event)" />
      <p class="result-label"><strong>{{ filtered().length }}</strong> voyages trouvés</p>
      @if (tripService.loading()) { <div class="loading-state">Chargement des voyages…</div> }
      <div class="trip-grid">@for (trip of filtered(); track trip.id) { <app-trip-card [trip]="trip" /> } @empty { <p>Aucun voyage ne correspond à votre recherche.</p> }</div>
    </section>
  `,
})
export class TripsComponent {
  readonly tripService = inject(TripService);
  private readonly route = inject(ActivatedRoute);
  readonly filters = signal<TripFilterValue>({ query: this.route.snapshot.queryParamMap.get('q') ?? '', category: 'Tous' });
  readonly filtered = computed(() => this.tripService.trips().filter((trip) => {
    const value = this.filters();
    return (value.category === 'Tous' || trip.category === value.category)
      && `${trip.title} ${trip.location} ${trip.country}`.toLowerCase().includes(value.query.toLowerCase());
  }));
}
