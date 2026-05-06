import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Proponerjuego } from './proponerjuego';

describe('Proponerjuego', () => {
  let component: Proponerjuego;
  let fixture: ComponentFixture<Proponerjuego>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Proponerjuego],
    }).compileComponents();

    fixture = TestBed.createComponent(Proponerjuego);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
