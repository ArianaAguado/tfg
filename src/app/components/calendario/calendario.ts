import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rawg } from '../../services/rawg';
import { FirebaseService, JuegoCustom } from '../../services/firebase.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';

interface FiltrosActivos {
  generos: string[];
  plataformas: string[];
}

interface FiltrosActivos {
  generos: string[];
  plataformas: string[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, BtnCerrarSesion],
  templateUrl: './calendario.html',
  styleUrl: './calendario.css',
})
export class Calendario implements OnInit {
  private rawg = inject(Rawg);
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  juegos: any[] = [];
  diasMes: (number | null)[] = [];
  fechaActual: Date = new Date();
  cargando: boolean = true;
  query: string = '';
  queryActiva: string = '';
  juegosCustom: JuegoCustom[] = [];
  juegoSeleccionado: any = null;
  diasSeleccionado: any[] = [];
  mostrarModal: boolean = false;
  favoritosIds: Set<string> = new Set();
  cargandoFavorito: boolean = false;
  sinResultados: boolean = false;
  esFavoritoActual: boolean = false;

  // ── Filtros ──────────────────────────────────────────────────────
  filtrosAbiertos = false;

  filtros: FiltrosActivos = {
    generos: [],
    plataformas: [],
  };

  get generosDisponibles(): string[] {
    const deRawg = this.juegos.flatMap(j => j.genres?.map((g: any) => g.name) ?? []);
    const deCustom = this.juegosCustom.flatMap(j => j.generos ?? []);
    return [...new Set([...deRawg, ...deCustom])].sort();
  }

  get plataformasDisponibles(): string[] {
    const deRawg = this.juegos.flatMap(j => j.platforms?.map((p: any) => p.platform.name) ?? []);
    const deCustom = this.juegosCustom.flatMap(j => j.plataformas ?? []);
    return [...new Set([...deRawg, ...deCustom])].sort();
  }

  get totalFiltrosActivos(): number {
    return this.filtros.generos.length + this.filtros.plataformas.length;
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.markForCheck();
  }

  toggleFiltroGenero(g: string): void {
    const idx = this.filtros.generos.indexOf(g);
    if (idx === -1) this.filtros.generos.push(g);
    else this.filtros.generos.splice(idx, 1);
    this.cdr.markForCheck();
  }

  toggleFiltroPlataforma(p: string): void {
    const idx = this.filtros.plataformas.indexOf(p);
    if (idx === -1) this.filtros.plataformas.push(p);
    else this.filtros.plataformas.splice(idx, 1);
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.filtros = { generos: [], plataformas: [] };
    this.cdr.markForCheck();
  }

  private juegoSuperaFiltros(juego: any): boolean {
    if (this.filtros.generos.length) {
      const generosJuego: string[] = juego.genres?.map((g: any) => g.name) ?? [];
      if (!this.filtros.generos.some(g => generosJuego.includes(g))) return false;
    }

    if (this.filtros.plataformas.length) {
      const platsJuego: string[] = juego.platforms?.map((p: any) => p.platform?.name ?? p) ?? [];
      if (!this.filtros.plataformas.some(p => platsJuego.includes(p))) return false;
    }

    return true;
  }

  get totalJuegosFiltrados(): number {
    const customMapeados = this.juegosCustom.map(j => ({
      name: j.nombre,
      background_image: j.imagen,
      released: j.fechaLanzamiento?.replace(/\//g, '-'),
      esCustom: true,
      genres: (j.generos ?? []).map(g => ({ name: g })),
      platforms: (j.plataformas ?? []).map(p => ({ platform: { name: p } })),
    }));
    return [...this.juegos, ...customMapeados].filter(j => this.juegoSuperaFiltros(j)).length;
  }

  ngOnInit(): void {
    this.generarCalendario();
    this.cargarJuegos();
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => { this.juegosCustom = juegos; this.cdr.detectChanges(); },
      error: (err) => console.error('Error obteniendo juegos:', err)
    });
    this.firebase.obtenerFavoritos().subscribe({
      next: (favs) => {
        this.favoritosIds = new Set(favs.map(f => f.released + '_' + f.name.replace(/\s/g, '_')));
        this.cdr.detectChanges();
      }
    });

    // Rankings
    this.masAnadidosSub = this.firebase.obtenerRankingMasAnadidos(5).subscribe(ranking => {
      this.rankingMasAnadidos = ranking;
      this.cdr.detectChanges();
    });

    this.masHypeSub = this.firebase.obtenerRankingMasHype(5).subscribe(ranking => {
      this.rankingMasHype = ranking.map(r => {
        // Buscar en juegos de RAWG cargados
        const enRawg = this.juegos.find(j => j.slug === r.slug);
        if (enRawg) {
          return { ...r, name: enRawg.name, background_image: enRawg.background_image };
        }
        // Buscar en juegos custom
        const enCustom = this.juegosCustom.find(j =>
          ('custom_' + j.nombre.toLowerCase().trim().replace(/\s+/g, '_')) === r.slug
        );
        if (enCustom) {
          return { ...r, name: enCustom.nombre, background_image: enCustom.imagen };
        }
        return { ...r, name: r.slug.replace(/^custom_/, '').replace(/_/g, ' '), background_image: '' };
      });
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.masAnadidosSub?.unsubscribe();
    this.masHypeSub?.unsubscribe();
  }

  generarCalendario() {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    let primerDiaSemana = new Date(`${año}-${String(mes + 1).padStart(2, '0')}-01T12:00:00`).getDay();
    primerDiaSemana = (primerDiaSemana + 6) % 7;
    const vacias: null[] = Array(primerDiaSemana).fill(null);
    const dias: number[] = Array.from({ length: ultimoDia }, (_, i) => i + 1);
    this.diasMes = [...vacias, ...dias];
  }

  cargarJuegos() {
    this.cargando = true;
    this.rawg.nuevosLanzamientos(this.fechaActual).subscribe({
      next: (juegos) => { this.juegos = juegos; this.cargando = false; },
      error: (err) => { console.error('Error al cargar los juegos: ', err); this.cargando = false; }
    });
  }

  buscar() {
    this.queryActiva = this.query;
    if (!this.query.trim()) {
      this.sinResultados = false;
      this.queryActiva = '';
      this.fechaActual = new Date();
      this.generarCalendario();
      this.cargarJuegos();
      return;
    }
    this.cargando = true;
    this.sinResultados = false;
    this.rawg.buscarJuegos(this.query).subscribe({
      next: (juegos) => {
        this.juegos = juegos;
        if (juegos.length > 0 && juegos[0].released) {
          const fecha = new Date(juegos[0].released + 'T12:00:00');
          this.fechaActual = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
          this.generarCalendario();
        }
        const hayCustom = this.juegosCustom.some(j =>
          j.nombre.toLowerCase().includes(this.queryActiva.toLowerCase())
        );
        this.sinResultados = juegos.length === 0 && !hayCustom;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al buscar:', err);
        this.cargando = false;
        this.sinResultados = true;
        this.cdr.detectChanges();
      }
    });
  }

  esDiaActual(dia: number | null): boolean {
    if (!dia) return false;
    const hoy = new Date();
    return dia === hoy.getDate() &&
      this.fechaActual.getMonth() === hoy.getMonth() &&
      this.fechaActual.getFullYear() === hoy.getFullYear();
  }

  obtenerJuegosDelDia(dia: number | null) {
    if (!dia) return [];
    const mesActual = this.fechaActual.getMonth();
    const añoActual = this.fechaActual.getFullYear();

    const customFiltrados = this.juegosCustom
      .filter(j => !this.queryActiva.trim() ||
        j.nombre.toLowerCase().includes(this.queryActiva.toLowerCase()))
      .map(j => ({
        name: j.nombre,
        background_image: j.imagen,
        released: j.fechaLanzamiento?.replace(/\//g, '-'),
        esCustom: true,
        genres: (j.generos ?? []).map(g => ({ name: g })),
        platforms: (j.plataformas ?? []).map(p => ({ platform: { name: p } })),
        esCustom: true,
        genres: (j.generos ?? []).map(g => ({ name: g })),
        platforms: (j.plataformas ?? []).map(p => ({ platform: { name: p } })),
      }));

    const todos = [...this.juegos, ...customFiltrados];

    return todos
      .filter(juego => {
        if (!juego.released) return false;
        const fechaJuego = new Date(juego.released + 'T12:00:00');
        return fechaJuego.getDate() === dia &&
          fechaJuego.getMonth() === mesActual &&
          fechaJuego.getFullYear() === añoActual;
      })
      .filter(juego => this.juegoSuperaFiltros(juego));
    return todos
      .filter(juego => {
        if (!juego.released) return false;
        const fechaJuego = new Date(juego.released + 'T12:00:00');
        return fechaJuego.getDate() === dia &&
          fechaJuego.getMonth() === mesActual &&
          fechaJuego.getFullYear() === añoActual;
      })
      .filter(juego => this.juegoSuperaFiltros(juego));
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.juegoSeleccionado = null;
    this.diasSeleccionado = [];
  }

  obtenerGeneros(juego: any): string {
    return juego.genres?.map((g: any) => g.name).join(', ') || 'No disponible';
  }

  obtenerPlataformas(juego: any): string {
    return juego.platforms?.map((p: any) => p.platform.name).join(', ') || 'No disponible';
  }

  mesAnterior() {
    this.fechaActual = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() - 1, 1);
    this.generarCalendario();
    this.cargarJuegos();
  }

  mesSiguiente() {
    this.fechaActual = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() + 1, 1);
    this.generarCalendario();
    this.cargarJuegos();
  }

  async abrirModal(juegos: any[]) {
    if (juegos.length === 1) { this.irADetalle(juegos[0]); return; }
    this.diasSeleccionado = juegos;
    this.mostrarModal = true;
    this.juegoSeleccionado = null;
  }

  async seleccionarJuego(juego: any) {
    this.juegoSeleccionado = juego;
    this.cargandoFavorito = true;
    this.esFavoritoActual = await this.firebase.esFavorito(juego);
    this.cargandoFavorito = false;
    this.cdr.detectChanges();
  }

  async toggleFavorito() {
    if (!this.juegoSeleccionado) return;
    if (this.esFavoritoActual) await this.firebase.quitarFavorito(this.juegoSeleccionado);
    else await this.firebase.añadirFavorito(this.juegoSeleccionado);
    this.cerrarModal();
    this.cdr.detectChanges();
  }

  irADetalle(juego: any): void {
    if (juego.esCustom) {
      const juegoCompleto = this.juegosCustom.find(j => j.nombre === juego.name) || juego;
      const normalizado = {
        name: juegoCompleto.nombre || juego.name,
        background_image: juegoCompleto.imagen || juego.background_image,
        released: juegoCompleto.fechaLanzamiento || juego.released,
        rating: null,
        genres: (juegoCompleto.generos || []).map((g: string) => ({ name: g })),
        platforms: (juegoCompleto.plataformas || []).map((p: string) => ({ platform: { name: p } })),
        description_raw: juegoCompleto.descripcion || '',
        urlSteam: juegoCompleto.urlSteam || '',
        precio: juegoCompleto.precio ?? null,
        slug: null,
        esCustom: true
      };
      this.router.navigate(['/dashboard/juego-custom'], { state: { juego: normalizado } });
    } else {
      this.router.navigate(['/dashboard/juego', juego.slug]);
    }
  }

  irADetalleDesdeRanking(item: any): void {
    if (item.slug && item.slug.startsWith('custom_')) {
      // Custom: necesitamos pasar el objeto completo por state
      const nombreLimpio = item.slug.replace(/^custom_/, '').replace(/_/g, ' ');
      const custom = this.juegosCustom.find(j =>
        j.nombre.toLowerCase().trim() === nombreLimpio.toLowerCase().trim()
      );
      if (custom) {
        this.irADetalle({ ...custom, name: custom.nombre, esCustom: true });
      }
    } else if (item.slug) {
      this.router.navigate(['/dashboard/juego', item.slug]);
    } else {
      const enRawg = this.juegos.find(j => j.name === item.name);
      if (enRawg) {
        this.router.navigate(['/dashboard/juego', enRawg.slug]);
        return;
      }
      const enCustom = this.juegosCustom.find(j => j.nombre === item.name);
      if (enCustom) {
        this.irADetalle({ ...enCustom, name: enCustom.nombre, esCustom: true });
      }
    }
  }
}
