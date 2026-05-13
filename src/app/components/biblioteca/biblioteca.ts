import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService, JuegoFavorito } from '../../services/firebase.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';


@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, BtnCerrarSesion],
  templateUrl: './biblioteca.html',
  styleUrl: './biblioteca.css',
})
export class Biblioteca implements OnInit, OnDestroy {
  private firebase = inject(FirebaseService);
  private subscription: Subscription | null = null;
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  favoritos: JuegoFavorito[] = [];
  diasMes: (number | null)[] = [];
  fechaActual: Date = new Date();
  cargando: boolean = true;

  juegoSeleccionado: any = null;
  diasSeleccionado: any[] = [];
  mostrarModal: boolean = false;
  esFavoritoActual: boolean = true;

  ngOnInit(): void {
    this.generarCalendario();
    // Pequeño delay para que Firebase restaure la sesión antes de suscribirse
    setTimeout(() => this.suscribirFavoritos(), 300);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  suscribirFavoritos(): void {
    this.cargando = true;
    this.subscription = this.firebase.obtenerFavoritos().subscribe({
      next: (juegos) => {
        this.favoritos = juegos;
        this.cargando = false;
        this.cdr.detectChanges(); // <- añade esto
      },
      error: (err) => {
        console.error('Error cargando favoritos:', err);
        this.cargando = false;
        this.cdr.detectChanges(); // <- y esto
      }
    });
  }

  generarCalendario(): void {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    let primerDiaSemana = new Date(`${año}-${String(mes + 1).padStart(2, '0')}-01T12:00:00`).getDay();
    primerDiaSemana = (primerDiaSemana + 6) % 7;
    const vacias: null[] = Array(primerDiaSemana).fill(null);
    const dias: number[] = Array.from({ length: ultimoDia }, (_, i) => i + 1);
    this.diasMes = [...vacias, ...dias];
  }

  mesAnterior(): void {
    this.fechaActual = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() - 1, 1);
    this.generarCalendario();
    this.cdr.detectChanges();
  }

  mesSiguiente(): void {
    this.fechaActual = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() + 1, 1);
    this.generarCalendario();
    this.cdr.detectChanges();
  }

  esDiaActual(dia: number | null): boolean {
    if (!dia) return false;
    const hoy = new Date();
    return dia === hoy.getDate() &&
      this.fechaActual.getMonth() === hoy.getMonth() &&
      this.fechaActual.getFullYear() === hoy.getFullYear();
  }

  obtenerFavoritosDelDia(dia: number | null): JuegoFavorito[] {
    if (!dia) return [];
    return this.favoritos.filter(juego => {
      if (!juego.released) return false;
      const fecha = new Date(juego.released + 'T12:00:00');
      return fecha.getDate() === dia &&
        fecha.getMonth() === this.fechaActual.getMonth() &&
        fecha.getFullYear() === this.fechaActual.getFullYear();
    });
  }

  abrirModal(juegos: JuegoFavorito[]): void {
    if (juegos.length === 1) {
      this.irADetalle(juegos[0]);
      return;
    }
    this.diasSeleccionado = juegos;
    this.mostrarModal = true;
    this.juegoSeleccionado = null;
    this.cdr.detectChanges();
  }

  seleccionarJuego(juego: any): void {
    this.juegoSeleccionado = juego;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.juegoSeleccionado = null;
    this.diasSeleccionado = [];
    this.cdr.detectChanges();
  }

  async toggleFavorito(): Promise<void> {
    if (!this.juegoSeleccionado) return;
    await this.firebase.quitarFavorito(this.juegoSeleccionado);
    this.favoritos = this.favoritos.filter(j => j.name !== this.juegoSeleccionado.name);
    this.cerrarModal();
  }

  obtenerGeneros(juego: any): string {
    return juego.genres?.map((g: any) => g.name).join(', ') || 'No disponible';
  }

  obtenerPlataformas(juego: any): string {
    return juego.platforms?.map((p: any) => p.platform.name).join(', ') || 'No disponible';
  }

  irADetalle(juego: any): void {
    if (juego.slug) {
      this.router.navigate(['/dashboard/juego', juego.slug]);
    } else {
      const normalizado = {
        name: juego.name,
        background_image: juego.background_image,
        released: juego.released,
        rating: juego.rating ?? null,
        genres: Array.isArray(juego.genres)
          ? juego.genres.map((g: any) => typeof g === 'string' ? { name: g } : g)
          : [],
        platforms: Array.isArray(juego.platforms)
          ? juego.platforms.map((p: any) => typeof p === 'string' ? { platform: { name: p } } : p)
          : [],
        description_raw: juego.descripcion || juego.description_raw || '',
        esCustom: true
      };
      this.router.navigate(['/dashboard/juego-custom'], { state: { juego: normalizado } });
    }
  }

}