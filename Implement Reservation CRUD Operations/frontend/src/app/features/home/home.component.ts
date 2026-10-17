import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TripService } from '../../core/services/trip.service';
import { TripCardComponent } from '../../shared/components/trip-card.component';

@Component({
  imports: [RouterLink, ReactiveFormsModule, TripCardComponent],
  template: `
    <section class="hero"><div class="hero-overlay"></div><div class="container hero-content">
      <p class="eyebrow light">Escapades uniques, parfaitement organisées</p>
      <h1>Partez là où la vie<br />se vit <em>autrement.</em></h1>
      <p>Des voyages en petit groupe conçus pour vous émouvoir, sans les heures de préparation.</p>
      <form class="search-box" [formGroup]="searchForm" (ngSubmit)="search()">
        <label><span>Destination</span><input formControlName="destination" placeholder="Où souhaitez-vous partir ?" /></label>
        <label><span>Quand ?</span><input formControlName="date" placeholder="Choisir les dates" /></label>
        <label><span>Voyageurs</span><input formControlName="travelers" type="number" min="1" max="14" /></label>
        <button class="button primary" type="submit">Rechercher un voyage</button>
      </form>
      <small><strong>4,9/5</strong> selon plus de 2 000 voyageurs</small>
    </div></section>
    <section class="section container"><div class="section-head"><div><p class="eyebrow">Quittez l’ordinaire</p><h2>Des voyages qui comptent</h2></div><a routerLink="/trips" class="button outline">Tous les voyages →</a></div>
      <div class="trip-grid">@for (trip of featuredTrips; track trip.id) { <app-trip-card [trip]="trip" /> }</div>
    </section>
    <section class="why"><div class="container why-grid"><div><p class="eyebrow light">Voyagez mieux</p><h2>Chaque détail prévu.<br /><em>Chaque instant à vous.</em></h2></div><div>
      <article><span>01</span><div><h3>Des lieux qui ont une âme</h3><p>Adresses singulières, rencontres locales et itinéraires loin des sentiers battus.</p></div></article>
      <article><span>02</span><div><h3>Petits groupes, grands liens</h3><p>Pas de foule. De l’espace pour rencontrer le lieu et ceux qui le partagent.</p></div></article>
      <article><span>03</span><div><h3>À vos côtés du début à la fin</h3><p>Une équipe disponible avant, pendant et après votre voyage.</p></div></article>
    </div></div></section>
  `,
})
export class HomeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tripService = inject(TripService);
  readonly featuredTrips = this.tripService.trips().slice(0, 3);
  readonly searchForm = this.fb.nonNullable.group({ destination: '', date: '', travelers: 2 });

  search(): void {
    this.router.navigate(['/trips'], { queryParams: { q: this.searchForm.controls.destination.value } });
  }
}
