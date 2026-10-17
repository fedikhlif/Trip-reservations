import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Destination } from '../../shared/models/destination.model';

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private readonly base = `${environment.apiUrl}/destinations`;

  constructor(private http: HttpClient) {}

  /** GET /api/destinations — list all destinations */
  listDestinations(): Observable<Destination[]> {
    return this.http.get<Destination[]>(this.base);
  }

  /** GET /api/destinations/{id} */
  getDestination(id: number): Observable<Destination> {
    return this.http.get<Destination>(`${this.base}/${id}`);
  }
}
