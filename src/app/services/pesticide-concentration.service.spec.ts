import { TestBed } from '@angular/core/testing';

import { PesticideConcentrationService } from './pesticide-concentration.service';

describe('PesticideConcentrationService', () => {
  let service: PesticideConcentrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PesticideConcentrationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
