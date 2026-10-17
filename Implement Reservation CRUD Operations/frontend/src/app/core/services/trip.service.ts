import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Trip } from '../../shared/models';
import { TRIPS } from '../data/mock-data';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly api = inject(ApiService);
  readonly trips = signal<Trip[]>(TRIPS);
  readonly loading = signal(false);

  loadAll(): Observable<Trip[]> {
    this.loading.set(true);
    const source = environment.useMockData ? of(TRIPS) : this.api.get<Trip[]>('/trips');
    return source.pipe(tap((items) => { this.trips.set(items); this.loading.set(false); }));
  }

  getById(id: number): Trip | undefined {
    return this.trips().find((trip) => trip.id === id);
  }
}
