import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DestinationService } from '../../core/services/destination.service';

@Component({
  imports: [RouterLink],
  template: `
    <section class="page container"><div class="page-intro"><p class="eyebrow">Le monde vous attend</p><h1>Nos destinations</h1><p>Des lieux choisis pour leur beauté, leur caractère et les histoires qu’ils rendent possibles.</p></div>
      <div class="destination-grid">@for (destination of service.destinations(); track destination.id) { <article class="destination-card"><img [src]="destination.imageUrl" [alt]="destination.name" /><div><span>{{ destination.category }} · {{ destination.country }}</span><h2>{{ destination.name }}</h2><p>{{ destination.description }}</p><a routerLink="/trips" [queryParams]="{ q: destination.name }">Découvrir les voyages →</a></div></article> }</div>
    </section>
  `,
})
export class DestinationsComponent {
  readonly service = inject(DestinationService);
}
