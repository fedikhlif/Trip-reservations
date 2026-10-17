import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { type Trip, type TripSearch } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly base = `${environment.apiBaseUrl}/trips`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.base);
  }

  getById(id: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.base}/${id}`);
  }

  search(criteria: TripSearch = {}): Observable<Trip[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Trip[]>(`${this.base}/search`, { params });
  }
}
