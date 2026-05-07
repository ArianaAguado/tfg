import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleJuego } from './detalle-juego';

describe('DetalleJuego', () => {
  let component: DetalleJuego;
  let fixture: ComponentFixture<DetalleJuego>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleJuego],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleJuego);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
