import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReservationService } from '../../core/services/reservation.service';
import { TripService } from '../../core/services/trip.service';

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <section class="page container"><div class="page-intro"><p class="eyebrow">Opérations</p><h1>Administration</h1><p>Une vue claire sur les disponibilités, réservations et paiements.</p></div>
      <div class="stats dark"><article><small>Réservations</small><strong>{{ reservations.reservations().length }}</strong></article><article><small>Valeur totale</small><strong>{{ total() }} €</strong></article><article><small>Places disponibles</small><strong>{{ seats() }}</strong></article></div>
      @if (message()) { <div class="notice">{{ message() }} <button (click)="message.set('')">Fermer</button></div> }
      <div class="admin-grid"><section class="panel"><p class="eyebrow">Catalogue</p><h2>Gérer les voyages</h2>@for (trip of trips.trips().slice(0, 4); track trip.id) { <div class="admin-trip"><img [src]="trip.image" alt="" /><span><strong>{{ trip.title }}</strong><small>{{ trip.date }} · {{ trip.seats }} places</small></span><button class="button ghost" (click)="message.set('Voyage ouvert en modification.')">Modifier</button></div> }</section>
        <aside class="panel"><p class="eyebrow">Action rapide</p><h2>Ajouter un voyage</h2>
          <form [formGroup]="tripForm" (ngSubmit)="saveDraft()">
            <label><span>Nom du voyage</span><input formControlName="title" placeholder="Escapade en Toscane" /></label>
            @if (tripForm.controls.title.touched && tripForm.controls.title.invalid) { <p class="error">Le nom doit contenir au moins 3 caractères.</p> }
            <label><span>Style</span><select formControlName="category"><option>Culture</option><option>Mer</option><option>Montagne</option></select></label>
            <label><span>Prix de départ</span><input formControlName="price" type="number" min="1" /></label>
            <button class="button primary full">Enregistrer le brouillon</button>
          </form>
        </aside>
      </div>
      <section class="panel"><p class="eyebrow">Activité récente</p><h2>Réservations</h2><div class="table-wrap"><table><thead><tr><th>Réservation</th><th>Client</th><th>Total</th><th>Statut</th></tr></thead><tbody>@for (item of reservations.reservations(); track item.id) { <tr><td>{{ item.id }}</td><td>{{ item.customer }}</td><td>{{ item.total }} €</td><td><span class="badge">{{ item.status }}</span></td></tr> }</tbody></table></div></section>
    </section>
  `,
})
export class AdminDashboardComponent {
  private readonly fb = inject(FormBuilder);
  readonly reservations = inject(ReservationService);
  readonly trips = inject(TripService);
  readonly message = signal('');
  readonly tripForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    category: 'Culture',
    price: [2400, [Validators.required, Validators.min(1)]],
  });

  seats(): number { return this.trips.trips().reduce((sum, item) => sum + item.seats, 0); }
  total(): number { return this.reservations.reservations().reduce((sum, item) => sum + item.total, 0); }
  saveDraft(): void {
    if (this.tripForm.invalid) { this.tripForm.markAllAsTouched(); return; }
    this.message.set(`Le voyage « ${this.tripForm.controls.title.value} » est enregistré comme brouillon.`);
    this.tripForm.reset({ title: '', category: 'Culture', price: 2400 });
  }
}
