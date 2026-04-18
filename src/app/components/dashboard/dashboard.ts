import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Rawg } from '../../services/rawg';
import { FirebaseService, JuegoCustom } from '../../services/firebase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private rawg = inject(Rawg);
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  juegos: any[] = [];
  diasMes: (number | null)[] = [];
  fechaActual: Date = new Date();
  cargando: boolean = true;
  query: string = '';

  juegosCustom: JuegoCustom[] = [];
  formulario: Partial<JuegoCustom> = this.formularioVacio();
  imagenArchivo: File | null = null;
  previstaImagen: string | null = null;
  modoEdicion = false;
  guardando = false;
  subiendoImagen = false;
  adminAbierto = false;

  ngOnInit(): void {
    this.generarCalendario();
    this.cargarJuegos();
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => {
        this.juegosCustom = juegos;
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

  formularioVacio(): Partial<JuegoCustom> {
    return { nombre: '', descripcion: '', imagen: '', imagenPath: '', fechaLanzamiento: '', esCustom: true };
  }

  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.imagenArchivo = input.files[0];
    const reader = new FileReader();
    reader.onload = () => this.previstaImagen = reader.result as string;
    reader.readAsDataURL(this.imagenArchivo);
  }

  editarJuego(juego: JuegoCustom) {
    this.modoEdicion = true;
    this.formulario = { ...juego };
    this.previstaImagen = juego.imagen || null;
    this.imagenArchivo = null;
    setTimeout(() => {
      document.querySelector('.modal-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  cancelar() {
    this.modoEdicion = false;
    this.formulario = this.formularioVacio();
    this.previstaImagen = null;
    this.imagenArchivo = null;
  }

  async guardar() {
    if (!this.formulario.nombre?.trim()) return;
    this.guardando = true;
    let exito = false;
    try {
      if (this.imagenArchivo) {
        this.subiendoImagen = true;
        const { url, path } = await this.firebase.subirImagen(this.imagenArchivo);
        this.formulario.imagen = url;
        this.formulario.imagenPath = path;
      }
      if (this.modoEdicion && this.formulario.id) {
        const { id, ...cambios } = this.formulario as JuegoCustom;
        await this.firebase.editarJuego(id!, cambios);
      } else {
        await this.firebase.agregarJuego(this.formulario as Omit<JuegoCustom, 'id'>);
      }
      exito = true;
    } catch (err) {
      console.error('Error al guardar:', err);
    } finally {
      this.subiendoImagen = false;
      this.guardando = false;
      if (exito) this.cancelar();
      this.cdr.detectChanges();
    }
  }

  async eliminarJuego(juego: JuegoCustom) {
    if (!confirm(`¿Eliminar "${juego.nombre}"?`)) return;
    await this.firebase.eliminarJuego(juego).catch(console.error);
  }

  abrirAdmin() {
    this.adminAbierto = true;
  }

  cerrarAdmin(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.adminAbierto = false;
    }
  }
}