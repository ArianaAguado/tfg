import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rawg } from '../../services/rawg';
import { FirebaseService, JuegoCustom } from '../../services/firebase.service';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario.html',
  styleUrl: './calendario.css',
})

export class Calendario implements OnInit {
  private rawg = inject(Rawg);
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  juegos: any[] = [];
  diasMes: (number | null)[] = [];
  fechaActual: Date = new Date();
  cargando: boolean = true;
  query: string = '';
  juegosCustom: JuegoCustom[] = [];
  juegoSeleccionado: any = null;
  diasSeleccionado: any[] = [];
  mostrarModal: boolean = false;
  favoritosIds: Set<string> = new Set();
  cargandoFavorito: boolean = false;

  ngOnInit(): void {
    this.generarCalendario();
    this.cargarJuegos();
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => { this.juegosCustom = juegos; this.cdr.detectChanges(); },
      error: (err) => console.error('Error obteniendo juegos:', err)
    });
    // Cargamos los ids de favoritos en local
    this.firebase.obtenerFavoritos().subscribe({
      next: (favs) => {
        this.favoritosIds = new Set(favs.map(f => f.released + '_' + f.name.replace(/\s/g, '_')));
        this.cdr.detectChanges();
      }
    });
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
      next: (juegos) => {
        this.juegos = juegos;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar los juegos: ', err);
        this.cargando = false;
      }
    });
  }

  buscar() {
    if (!this.query.trim()) {
      this.cargarJuegos();
      return;
    }
    this.cargando = true;
    this.rawg.buscarJuegos(this.query, this.fechaActual).subscribe({
      next: (juegos) => {
        this.juegos = juegos;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al buscar:', err);
        this.cargando = false;
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

    const todos = [
      ...this.juegos,
      ...this.juegosCustom.map(j => ({
        name: j.nombre,
        background_image: j.imagen,
        released: j.fechaLanzamiento?.replace(/\//g, '-'),
        esCustom: true
      }))
    ];

    return todos.filter(juego => {
      if (!juego.released) return false;
      const fechaJuego = new Date(juego.released + 'T12:00:00');
      return fechaJuego.getDate() === dia &&
        fechaJuego.getMonth() === mesActual &&
        fechaJuego.getFullYear() === añoActual;
    });
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
    this.fechaActual = new Date(
      this.fechaActual.getFullYear(),
      this.fechaActual.getMonth() - 1,
      1
    );
    this.generarCalendario();
    this.cargarJuegos();
  }

  mesSiguiente() {
    this.fechaActual = new Date(
      this.fechaActual.getFullYear(),
      this.fechaActual.getMonth() + 1,
      1
    );
    this.generarCalendario();
    this.cargarJuegos();
  }

  esFavoritoActual: boolean = false;

  async abrirModal(juegos: any[]) {
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
    if (this.esFavoritoActual) {
      await this.firebase.quitarFavorito(this.juegoSeleccionado);
    } else {
      await this.firebase.añadirFavorito(this.juegoSeleccionado);
    }
    this.cerrarModal();
    this.cdr.detectChanges();
  }
}