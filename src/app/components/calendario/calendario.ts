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

  ngOnInit(): void {
    this.generarCalendario();
    this.cargarJuegos();
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => {
        this.juegosCustom = juegos;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error obteniendo juegos:', err)
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
    this.rawg.nuevosLanzamientos().subscribe({
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
    this.rawg.buscarJuegos(this.query).subscribe({
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

  obtenerJuegoDelDia(dia: number | null) {
    if (!dia) return null;
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

    return todos.find(juego => {
      if (!juego.released) return false;
      const fechaJuego = new Date(juego.released + 'T12:00:00');
      return fechaJuego.getDate() === dia &&
             fechaJuego.getMonth() === mesActual &&
             fechaJuego.getFullYear() === añoActual;
    });
  }
}