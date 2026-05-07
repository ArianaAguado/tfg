import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CerrarSesion } from './cerrar-sesion';

describe('CerrarSesion', () => {
  let component: CerrarSesion;
  let fixture: ComponentFixture<CerrarSesion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CerrarSesion],
    }).compileComponents();

    fixture = TestBed.createComponent(CerrarSesion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
