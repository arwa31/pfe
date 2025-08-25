import { TestBed } from '@angular/core/testing';

import { StudySiteService } from './study-site.service';

describe('StudySiteService', () => {
  let service: StudySiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudySiteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
