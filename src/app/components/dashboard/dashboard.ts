import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rawg } from '../../services/rawg';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private rawg = inject(Rawg);

  juegos: any[] = []; // Inicializado vacío
  diasMes: number[] = [];
  fechaActual: Date = new Date();
  cargando: boolean = true;

  ngOnInit(): void {
    this.generarCalendario();
    this.cargarJuegos();
  }

  generarCalendario() {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    this.diasMes = Array.from({ length: ultimoDia }, (_, i) => i + 1);
  }

  cargarJuegos() {
    this.cargando = true;
    this.rawg.nuevosLanzamientos().subscribe({
      next: (data) => {
        // Guardamos los resultados
        this.juegos = data.results || [];
        this.cargando = false;
        console.log("Datos cargados: ", this.juegos);
      },
      error: (err) => {
        console.error("Error al cargar los juegos: ", err);
        this.cargando = false;
      }
    });
  }

  obtenerJuegoDelDia(dia: number) {
    if (!this.juegos || this.juegos.length === 0) return null;

    const mesActual = this.fechaActual.getMonth();
    const añoActual = this.fechaActual.getFullYear();

    return this.juegos.find(juego => {
      if (!juego.released) return false;
      const fechaJuego = new Date(juego.released);
      // Ajustamos el desfase horario sumando un día si ves que los juegos salen el día anterior
      return fechaJuego.getUTCDate() === dia && 
             fechaJuego.getUTCMonth() === mesActual && 
             fechaJuego.getUTCFullYear() === añoActual;
    });
  }
}