import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Rawg } from './rawg';
import { FirebaseService } from './firebase.service';

// Mock mínimo de FirebaseService. Como Rawg lo inyecta en su constructor,
// hay que proveerlo, pero nuestros tests no llaman a ningún método suyo.
// Por eso un objeto vacío con casteo a any es suficiente.
const firebaseServiceMock = {} as any;

describe('Rawg (funciones puras)', () => {
  let rawg: Rawg;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        Rawg,
        provideHttpClient(),
        { provide: FirebaseService, useValue: firebaseServiceMock }
      ]
    });
    rawg = TestBed.inject(Rawg);
  });

  describe('normalizarRawg', () => {
    it('debe añadir esCustom: false a un juego de RAWG', () => {
      const juegoRawg = {
        id: 123,
        name: 'The Witcher 3',
        slug: 'the-witcher-3'
      };

      const resultado = (rawg as any).normalizarRawg(juegoRawg);

      expect(resultado.esCustom).toBe(false);
      expect(resultado.name).toBe('The Witcher 3');
      expect(resultado.slug).toBe('the-witcher-3');
    });

    it('debe preservar todas las propiedades originales del juego', () => {
      const juegoRawg = {
        id: 42,
        name: 'Hades',
        released: '2020-09-17',
        rating: 4.5,
        genres: [{ name: 'Action' }]
      };

      const resultado = (rawg as any).normalizarRawg(juegoRawg);

      expect(resultado.id).toBe(42);
      expect(resultado.released).toBe('2020-09-17');
      expect(resultado.rating).toBe(4.5);
      expect(resultado.genres).toEqual([{ name: 'Action' }]);
    });
  });

  describe('rangoMes', () => {
    it('debe calcular el rango correcto para un mes de 31 días', () => {
      // Mayo de 2026
      const fecha = new Date(2026, 4, 15);

      const resultado = (rawg as any).rangoMes(fecha);

      expect(resultado.fechaInicio).toBe('2026-05-01');
      expect(resultado.fechaFin).toBe('2026-05-31');
    });

    it('debe calcular correctamente febrero en año NO bisiesto (28 días)', () => {
      // Febrero de 2025 (no bisiesto)
      const fecha = new Date(2025, 1, 10);

      const resultado = (rawg as any).rangoMes(fecha);

      expect(resultado.fechaInicio).toBe('2025-02-01');
      expect(resultado.fechaFin).toBe('2025-02-28');
    });

    it('debe calcular correctamente febrero en año bisiesto (29 días)', () => {
      // Febrero de 2024 (bisiesto)
      const fecha = new Date(2024, 1, 5);

      const resultado = (rawg as any).rangoMes(fecha);

      expect(resultado.fechaInicio).toBe('2024-02-01');
      expect(resultado.fechaFin).toBe('2024-02-29');
    });
  });
});
