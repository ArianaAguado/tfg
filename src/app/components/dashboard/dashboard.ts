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
  diasMes: (number | null)[] = [];
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

    let primerDiaSemana = new Date(`${año}-${String(mes + 1).padStart(2, '0')}-01T12:00:00`).getDay();
    //se pone T12:00:00 para evitar problemas de desfase horario que pueden hacer que el primer día del mes aparezca como domingo (0) en lugar de lunes (1)
    primerDiaSemana=(primerDiaSemana+6)%7;

    const vacias: null[] = Array(primerDiaSemana).fill(null);
    const dias: number[]= Array.from({length:ultimoDia}, (_, i) => i + 1);
    this.diasMes = [...vacias, ...dias];
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

  esDiaActual(dia:number|null): boolean {
    if(!dia) return false;
    const hoy=new Date();
    return dia===hoy.getDate() &&
           this.fechaActual.getMonth()===hoy.getMonth() &&
            this.fechaActual.getFullYear()===hoy.getFullYear();
    }



  obtenerJuegoDelDia(dia: number | null) {
  if (!dia || !this.juegos || this.juegos.length === 0) return null;

  const mesActual = this.fechaActual.getMonth();
  const añoActual = this.fechaActual.getFullYear();

  return this.juegos.find(juego => {
    if (!juego.released) return false;
    // Añadimos T12:00:00 igual que en generarCalendario para evitar desfase
    const fechaJuego = new Date(juego.released + 'T12:00:00');
    return fechaJuego.getDate() === dia &&
           fechaJuego.getMonth() === mesActual &&
           fechaJuego.getFullYear() === añoActual;
  });

  
}
}