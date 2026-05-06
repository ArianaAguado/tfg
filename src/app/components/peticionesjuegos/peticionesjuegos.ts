import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService, PeticionJuego } from '../../services/firebase.service';
@Component({
  selector: 'app-peticiones-juegos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './peticionesjuegos.html',
  styleUrl: './peticionesjuegos.css',
})
export class PeticionesJuegosComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  peticiones: PeticionJuego[] = [];
  cargando = false;
  mensajeExito = '';

  ngOnInit(): void {
    this.firebase.obtenerPeticiones().subscribe({
      next: (res) => { this.peticiones = res; this.cdr.detectChanges(); },
      error: (err) => console.error('Error al cargar peticiones:', err),
    });
  }

  async aprobarPeticion(peticion: PeticionJuego) {
    if (!confirm(`¿Aprobar y publicar "${peticion.nombre}"?`)) return;

    this.cargando = true;
    try {
      const {
        desarrolladorNombre, desarrolladorEmail, desarrolladorId,
        fechaPeticion, estado, id, ...datosJuego
      } = peticion;

      await this.firebase.agregarJuego(datosJuego);
      await this.firebase.eliminarPeticion(peticion.id!);

      this.mensajeExito = `"${peticion.nombre}" publicado correctamente.`;
      setTimeout(() => this.mensajeExito = '', 4000);
    } catch (err) {
      console.error('Error al aprobar:', err);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async rechazarPeticion(peticion: PeticionJuego) {
    if (!confirm(`¿Rechazar la solicitud de "${peticion.nombre}"?`)) return;
    try {
      await this.firebase.eliminarPeticion(peticion.id!);
    } catch (err) {
      console.error('Error al rechazar:', err);
    }
  }
}