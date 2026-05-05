import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Crearjuegos } from './crearjuegos';

describe('Crearjuegos', () => {
  let component: Crearjuegos;
  let fixture: ComponentFixture<Crearjuegos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Crearjuegos],
    }).compileComponents();

    fixture = TestBed.createComponent(Crearjuegos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
