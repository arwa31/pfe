import { TestBed } from '@angular/core/testing';

import { RainfallService } from './rainfall.service';

describe('RainfallService', () => {
  let service: RainfallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RainfallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
