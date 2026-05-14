import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Calendario } from './calendario';
import { FirebaseService } from '../../services/firebase.service';
import { Rawg } from '../../services/rawg';
import { Router } from '@angular/router';
import { of } from 'rxjs';

// Mocks mínimos: estos tests no llaman a Firebase, RAWG ni Router,
// pero el componente los inyecta, así que hay que proveerlos.
const firebaseServiceMock = {
  obtenerJuegos: () => of([]),
  obtenerFavoritos: () => of([]),
  obtenerRankingMasAnadidos: () => of([]),
  obtenerRankingMasHype: () => of([])
} as any;

const rawgMock = {
  nuevosLanzamientos: () => of([])
} as any;

const routerMock = {
  navigate: () => Promise.resolve(true)
} as any;

const cdrMock = {
  detectChanges: () => {},
  markForCheck: () => {}
} as any;

describe('Calendario (funciones puras)', () => {
  let calendario: Calendario;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: FirebaseService, useValue: firebaseServiceMock },
        { provide: Rawg, useValue: rawgMock },
        { provide: Router, useValue: routerMock },
        { provide: ChangeDetectorRef, useValue: cdrMock }
      ]
    });
    calendario = TestBed.runInInjectionContext(() => new Calendario());
  });

  describe('juegoSuperaFiltros', () => {
    it('debe devolver true si no hay filtros activos', () => {
      calendario.filtros = { generos: [], plataformas: [] };
      const juego = {
        genres: [{ name: 'RPG' }],
        platforms: [{ platform: { name: 'PC' } }]
      };

      const resultado = (calendario as any).juegoSuperaFiltros(juego);

      expect(resultado).toBe(true);
    });

    it('debe filtrar correctamente por género', () => {
      calendario.filtros = { generos: ['RPG'], plataformas: [] };

      const juegoRPG = { genres: [{ name: 'RPG' }], platforms: [] };
      const juegoShooter = { genres: [{ name: 'Shooter' }], platforms: [] };

      expect((calendario as any).juegoSuperaFiltros(juegoRPG)).toBe(true);
      expect((calendario as any).juegoSuperaFiltros(juegoShooter)).toBe(false);
    });

    it('debe filtrar correctamente por plataforma', () => {
      calendario.filtros = { generos: [], plataformas: ['PC'] };

      const juegoPC = { genres: [], platforms: [{ platform: { name: 'PC' } }] };
      const juegoConsola = { genres: [], platforms: [{ platform: { name: 'PS5' } }] };

      expect((calendario as any).juegoSuperaFiltros(juegoPC)).toBe(true);
      expect((calendario as any).juegoSuperaFiltros(juegoConsola)).toBe(false);
    });

    it('debe aplicar género Y plataforma a la vez (intersección)', () => {
      calendario.filtros = { generos: ['RPG'], plataformas: ['PC'] };

      const juegoValido = {
        genres: [{ name: 'RPG' }],
        platforms: [{ platform: { name: 'PC' } }]
      };
      const juegoSoloGenero = {
        genres: [{ name: 'RPG' }],
        platforms: [{ platform: { name: 'PS5' } }]
      };
      const juegoSoloPlataforma = {
        genres: [{ name: 'Shooter' }],
        platforms: [{ platform: { name: 'PC' } }]
      };

      expect((calendario as any).juegoSuperaFiltros(juegoValido)).toBe(true);
      expect((calendario as any).juegoSuperaFiltros(juegoSoloGenero)).toBe(false);
      expect((calendario as any).juegoSuperaFiltros(juegoSoloPlataforma)).toBe(false);
    });
  });

  describe('generarCalendario', () => {
    it('debe generar 29 días para febrero 2024 (bisiesto)', () => {
      calendario.fechaActual = new Date(2024, 1, 15);

      calendario.generarCalendario();

      const dias = calendario.diasMes.filter(d => d !== null);
      expect(dias.length).toBe(29);
    });

    it('debe generar 28 días para febrero 2025 (NO bisiesto)', () => {
      calendario.fechaActual = new Date(2025, 1, 15);

      calendario.generarCalendario();

      const dias = calendario.diasMes.filter(d => d !== null);
      expect(dias.length).toBe(28);
    });

    it('debe generar 31 días para mayo 2026', () => {
      calendario.fechaActual = new Date(2026, 4, 15);

      calendario.generarCalendario();

      const dias = calendario.diasMes.filter(d => d !== null);
      expect(dias.length).toBe(31);
    });
  });

  describe('esDiaActual', () => {
    it('debe devolver true para el día de hoy en el mes actual', () => {
      const hoy = new Date();
      calendario.fechaActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      const resultado = calendario.esDiaActual(hoy.getDate());

      expect(resultado).toBe(true);
    });

    it('debe devolver false si el día no coincide con hoy', () => {
      const hoy = new Date();
      calendario.fechaActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      const diaDistinto = hoy.getDate() === 1 ? 15 : 1;
      const resultado = calendario.esDiaActual(diaDistinto);

      expect(resultado).toBe(false);
    });

    it('debe devolver false si recibe null', () => {
      const resultado = calendario.esDiaActual(null);

      expect(resultado).toBe(false);
    });
  });

  describe('obtenerGeneros y obtenerPlataformas', () => {
    it('debe formatear los géneros en una cadena separada por comas', () => {
      const juego = {
        genres: [{ name: 'RPG' }, { name: 'Action' }, { name: 'Adventure' }]
      };

      const resultado = calendario.obtenerGeneros(juego);

      expect(resultado).toBe('RPG, Action, Adventure');
    });

    it('debe devolver "No disponible" si el juego no tiene géneros', () => {
      const juego = {};

      const resultado = calendario.obtenerGeneros(juego);

      expect(resultado).toBe('No disponible');
    });

    it('debe formatear las plataformas correctamente', () => {
      const juego = {
        platforms: [
          { platform: { name: 'PC' } },
          { platform: { name: 'PS5' } }
        ]
      };

      const resultado = calendario.obtenerPlataformas(juego);

      expect(resultado).toBe('PC, PS5');
    });
  });
});
