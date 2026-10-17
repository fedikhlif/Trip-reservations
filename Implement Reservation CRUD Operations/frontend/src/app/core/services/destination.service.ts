import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Destination } from '../../shared/models';
import { DESTINATIONS } from '../data/mock-data';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private readonly api = inject(ApiService);
  readonly destinations = signal<Destination[]>(DESTINATIONS);

  loadAll(): Observable<Destination[]> {
    const source = environment.useMockData ? of(DESTINATIONS) : this.api.get<Destination[]>('/destinations');
    return source.pipe(tap((items) => this.destinations.set(items)));
  }
}
