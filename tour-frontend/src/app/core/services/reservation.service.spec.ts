import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReservationService],
    });
    service = TestBed.inject(ReservationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a reservation with the selected trip and traveler count', () => {
    service.create({ trip_id: 8, travelers: 3 }).subscribe((reservation) =>
      expect(reservation.traveler_count).toBe(3),
    );

    const request = http.expectOne('/api/reservations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ trip_id: 8, travelers: 3 });
    request.flush({ traveler_count: 3 });
  });
});
