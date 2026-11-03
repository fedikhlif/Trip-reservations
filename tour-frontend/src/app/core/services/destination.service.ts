import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { type Destination, type DestinationWrite } from '../models/destination.model';

const CREDENTIALS = { withCredentials: true };

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

  createForAdmin(data: DestinationWrite): Observable<Destination> {
    return this.http.post<Destination>(this.base, data, CREDENTIALS);
  }

  updateForAdmin(id: number, data: DestinationWrite): Observable<Destination> {
    return this.http.put<Destination>(`${this.base}/${id}`, data, CREDENTIALS);
  }

  deleteForAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`, CREDENTIALS);
  }

  uploadImage(id: number, file: File): Observable<{ image_url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ image_url: string }>(
      `${this.base}/${id}/image`, formData, CREDENTIALS
    );
  }
}
