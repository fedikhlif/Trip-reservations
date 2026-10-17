import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { DestinationService } from './destination.service';

describe('DestinationService', () => {
  let service: DestinationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DestinationService],
    });
    service = TestBed.inject(DestinationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads destinations from the backend API', () => {
    service.getAll().subscribe((destinations) =>
      expect(destinations[0].name).toBe('Kyoto'),
    );

    const request = http.expectOne('/api/destinations');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, name: 'Kyoto', country: 'Japan', description: '' }]);
  });
});
