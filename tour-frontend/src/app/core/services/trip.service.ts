import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { type Trip, type TripSearch, type TripWrite } from '../models/trip.model';

const CREDENTIALS = { withCredentials: true };

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

  getAllForAdmin(): Observable<Trip[]> {
    return this.http.get<Trip[]>(`${environment.apiBaseUrl}/admin/trips`, CREDENTIALS);
  }

  createForAdmin(trip: TripWrite): Observable<Trip> {
    return this.http.post<Trip>(`${environment.apiBaseUrl}/admin/trips`, trip, CREDENTIALS);
  }

  updateForAdmin(id: number, trip: TripWrite): Observable<Trip> {
    return this.http.put<Trip>(`${environment.apiBaseUrl}/admin/trips/${id}`, trip, CREDENTIALS);
  }

  deleteForAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/admin/trips/${id}`, CREDENTIALS);
  }
}
