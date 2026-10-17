import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Trip, TripSearchParams } from '../../shared/models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly base = `${environment.apiUrl}/trips`;

  constructor(private http: HttpClient) {}

  /** GET /api/trips — list and search available trips */
  searchTrips(params: TripSearchParams = {}): Observable<Trip[]> {
    let httpParams = new HttpParams();
    if (params.destination) {
      httpParams = httpParams.set('destination', params.destination);
    }
    if (params.destination_id != null) {
      httpParams = httpParams.set('destination_id', params.destination_id.toString());
    }
    if (params.date) {
      httpParams = httpParams.set('date', params.date);
    }
    if (params.departure_date) {
      httpParams = httpParams.set('departure_date', params.departure_date);
    }
    if (params.return_date) {
      httpParams = httpParams.set('return_date', params.return_date);
    }
    if (params.travelers != null) {
      httpParams = httpParams.set('travelers', params.travelers.toString());
    }
    if (params.max_price != null) {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }
    return this.http.get<Trip[]>(this.base, { params: httpParams });
  }

  /** GET /api/trips/{id} — retrieve a single trip by ID */
  getTrip(tripId: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.base}/${tripId}`);
  }
}
