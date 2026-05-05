import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService, JuegoCustom } from '../../services/firebase.service';

// Definimos la interfaz para la petición
export interface PeticionJuego extends JuegoCustom {
  desarrolladorNombre: string;
  desarrolladorEmail: string;
  desarrolladorId: string;
  fechaPeticion: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

@Component({
  selector: 'app-peticiones-juegos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './peticionesjuegos.html',
  styleUrl: './peticionesjuegos.css',
})
export class PeticionesJuegos implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  peticiones: PeticionJuego[] = [];
  cargando = false;

  ngOnInit(): void {
    // Aquí deberías tener un método en tu servicio que traiga la colección 'peticiones'
    this.firebase.obtenerPeticiones().subscribe({
      next: (res) => {
        this.peticiones = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar peticiones:', err)
    });
  }

  async aprobarPeticion(peticion: PeticionJuego) {
    if (!confirm(`¿Aprobar y publicar "${peticion.nombre}"?`)) return;
    
    this.cargando = true;
    try {
      // 1. Creamos el objeto para la colección oficial (quitando datos de la petición)
      const { desarrolladorNombre, desarrolladorEmail, desarrolladorId, fechaPeticion, estado, id, ...datosJuego } = peticion;
      
      // 2. Lo añadimos a la colección de juegos oficial
      await this.firebase.agregarJuego(datosJuego);
      
      // 3. Borramos la petición o la marcamos como aprobada
      await this.firebase.eliminarPeticion(peticion.id!);
      
      alert('Juego aprobado y publicado con éxito.');
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