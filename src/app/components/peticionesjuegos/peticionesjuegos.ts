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
  historial: PeticionJuego[] = [];
  cargando = false;
  mensajeExito = '';
  verHistorial = false;

  // Paginación historial
  paginaHistorial = 1;
  readonly porPagina = 5;

  get historialPaginado(): PeticionJuego[] {
    const inicio = (this.paginaHistorial - 1) * this.porPagina;
    return this.historial.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginasHistorial(): number {
    return Math.ceil(this.historial.length / this.porPagina);
  }

  get paginasHistorial(): number[] {
    return Array.from({ length: this.totalPaginasHistorial }, (_, i) => i + 1);
  }

  cambiarPaginaHistorial(p: number): void {
    if (p < 1 || p > this.totalPaginasHistorial) return;
    this.paginaHistorial = p;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.firebase.obtenerPeticiones().subscribe({
      next: (res) => { this.peticiones = res; this.cdr.detectChanges(); },
      error: (err) => console.error('Error al cargar peticiones:', err),
    });

    this.firebase.obtenerHistorial().subscribe({
      next: (res) => { this.historial = res; this.cdr.detectChanges(); },
      error: (err) => console.error('Error al cargar historial:', err),
    });
  }

  async aprobarPeticion(peticion: PeticionJuego) {
  const errores: string[] = [];

  if (!peticion.nombre?.trim())         errores.push('Nombre obligatorio');
  if (!peticion.imagen?.trim())         errores.push('Imagen obligatoria');
  if (!peticion.descripcion?.trim())    errores.push('Descripción obligatoria');
  if (!peticion.fechaLanzamiento?.trim()) errores.push('Fecha de lanzamiento obligatoria');
  if (!peticion.generos?.length)        errores.push('Al menos un género');
  if (!peticion.plataformas?.length)    errores.push('Al menos una plataforma');

  if (errores.length > 0) {
    alert(`No se puede aprobar esta petición:\n\n• ${errores.join('\n• ')}`);
    return;
  }

  if (!confirm(`¿Aprobar y publicar "${peticion.nombre}"?`)) return;
  if (!peticion.id) {
    console.error('La petición no tiene ID:', peticion);
    return;
  }

  this.cargando = true;
  try {
    const {
      desarrolladorNombre, desarrolladorEmail, desarrolladorId,
      fechaPeticion, estado, id,
      ...datosJuego
    } = peticion;

    await this.firebase.archivarPeticion(peticion, 'aprobado');
    await this.firebase.agregarJuego(datosJuego);

    this.mensajeExito = `"${peticion.nombre}" publicado correctamente.`;
    setTimeout(() => this.mensajeExito = '', 4000);
  } catch (err) {
    console.error('Error al aprobar:', err);
    alert('Error al aprobar la petición. Revisa la consola.');
  } finally {
    this.cargando = false;
    this.cdr.detectChanges();
  }
}

async rechazarPeticion(peticion: PeticionJuego) {
  if (!confirm(`¿Rechazar la solicitud de "${peticion.nombre}"?`)) return;

  if (!peticion.id) {
    console.error('La petición no tiene ID:', peticion);
    return;
  }

  this.cargando = true;
  try {
    await this.firebase.archivarPeticion(peticion, 'rechazado');
  } catch (err) {
    console.error('Error al rechazar:', err);
    alert('Error al rechazar la petición. Revisa la consola.');
  } finally {
    this.cargando = false;
    this.cdr.detectChanges();
  }
}

  toggleHistorial(): void {
    this.verHistorial = !this.verHistorial;
    this.paginaHistorial = 1;
    this.cdr.detectChanges();
  }
}