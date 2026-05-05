import { Component, OnInit, inject, ChangeDetectorRef, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, JuegoCustom } from '../../services/firebase.service';

@Component({
  selector: 'app-crear-juegos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crearjuegos.html',
  styleUrl: './crearjuegos.css', 
})
export class CrearJuegosComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false; 
  @Output() cerrarPanel = new EventEmitter<void>();

  listaJuegos: JuegoCustom[] = [];
  datosJuego: Partial<JuegoCustom> = this.inicializarFormulario();
  archivoImagen: File | null = null;
  previewImagen: string | null = null;
  esEdicion = false;
  estaGuardando = false;
  estaSubiendoImagen = false;

  ngOnInit(): void {
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => {
        this.listaJuegos = juegos;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar la lista de juegos:', err)
    });
  }

  inicializarFormulario(): Partial<JuegoCustom> {
    return { 
      nombre: '', 
      descripcion: '', 
      imagen: '', 
      imagenPath: '', 
      fechaLanzamiento: '', 
      esCustom: true 
    };
  }

  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    
    this.archivoImagen = input.files[0];
    const lector = new FileReader();
    lector.onload = () => this.previewImagen = lector.result as string;
    lector.readAsDataURL(this.archivoImagen);
  }

  prepararEdicion(juego: JuegoCustom) {
  this.datosJuego = { ...juego }; 
  this.esEdicion = true;
  this.previewImagen = juego.imagen || null;
  this.archivoImagen = null;
  this.cdr.markForCheck(); 
  this.cdr.detectChanges();

  setTimeout(() => {
    const panel = document.querySelector('.modal-panel');
    if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
  }, 100);
}

limpiarFormulario() {
  this.esEdicion = false;
  this.datosJuego = this.inicializarFormulario();
  this.previewImagen = null;
  this.archivoImagen = null;
  this.cdr.detectChanges();
}

  async guardarJuego() {
    if (!this.datosJuego.nombre?.trim()) return;
    
    this.estaGuardando = true;
    let operacionExitosa = false;
    
    try {
      // 1. Manejo de la imagen
      if (this.archivoImagen) {
        this.estaSubiendoImagen = true;
        const { url, path } = await this.firebase.subirImagen(this.archivoImagen);
        this.datosJuego.imagen = url;
        this.datosJuego.imagenPath = path;
      }

      // 2. Crear o Editar
      if (this.esEdicion && this.datosJuego.id) {
        const { id, ...cambios } = this.datosJuego as JuegoCustom;
        await this.firebase.editarJuego(id!, cambios);
      } else {
        await this.firebase.agregarJuego(this.datosJuego as Omit<JuegoCustom, 'id'>);
      }
      
      operacionExitosa = true;
    } catch (err) {
      console.error('Error en la operación:', err);
    } finally {
      this.estaSubiendoImagen = false;
      this.estaGuardando = false;
      if (operacionExitosa) this.limpiarFormulario();
      this.cdr.detectChanges();
    }
  }

  async borrarJuego(juego: JuegoCustom) {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${juego.nombre}"?`)) return;
    try {
      await this.firebase.eliminarJuego(juego);
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }

  alHacerClickEnFondo(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarPanel.emit();
    }
  }
}