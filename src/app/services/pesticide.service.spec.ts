import { TestBed } from '@angular/core/testing';

import { PesticideService } from './pesticide.service';

describe('PesticideService', () => {
  let service: PesticideService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PesticideService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
