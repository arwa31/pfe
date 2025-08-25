import { TestBed } from '@angular/core/testing';

import { RiverflowService } from './riverflow.service';

describe('RiverflowService', () => {
  let service: RiverflowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RiverflowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
