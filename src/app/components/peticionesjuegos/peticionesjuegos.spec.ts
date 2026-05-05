import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Peticionesjuegos } from './peticionesjuegos';

describe('Peticionesjuegos', () => {
  let component: Peticionesjuegos;
  let fixture: ComponentFixture<Peticionesjuegos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Peticionesjuegos],
    }).compileComponents();

    fixture = TestBed.createComponent(Peticionesjuegos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
