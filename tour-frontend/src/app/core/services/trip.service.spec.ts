import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TripService } from './trip.service';

describe('TripService', () => {
  let service: TripService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TripService],
    });
    service = TestBed.inject(TripService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends destination, date range, and traveler count to the trip search API', () => {
    service.search({
      destination_id: 4,
      departure_date: '2026-11-10',
      return_date: '2026-11-17',
      travelers: 2,
    }).subscribe((trips) => expect(trips).toEqual([]));

    const request = http.expectOne((item) => item.url === '/api/trips/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('destination_id')).toBe('4');
    expect(request.request.params.get('departure_date')).toBe('2026-11-10');
    expect(request.request.params.get('return_date')).toBe('2026-11-17');
    expect(request.request.params.get('travelers')).toBe('2');
    request.flush([]);
  });
});
