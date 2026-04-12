import { TestBed } from '@angular/core/testing';

import { Rawg } from './rawg';

describe('Rawg', () => {
  let service: Rawg;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rawg);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
