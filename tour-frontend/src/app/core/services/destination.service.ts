import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { type Destination } from '../models/destination.model';

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private readonly base = `${environment.apiBaseUrl}/destinations`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Destination[]> {
    return this.http.get<Destination[]>(this.base);
  }

  getById(id: number): Observable<Destination> {
    return this.http.get<Destination>(`${this.base}/${id}`);
  }
}
