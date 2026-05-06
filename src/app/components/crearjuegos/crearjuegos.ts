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

  generosTexto = '';
  plataformasTexto = '';

  archivoImagen: File | null = null;
  previewImagen: string | null = null;
  esEdicion = false;
  estaGuardando = false;
  estaSubiendoImagen = false;

  // Búsqueda y paginación
  busqueda: string = '';
  paginaActual: number = 1;
  juegosPorPagina: number = 5;

  // Errores de validación
  errores: { [key: string]: string } = {};

  get juegosFiltrados() {
    return this.listaJuegos.filter(j =>
      j.nombre.toLowerCase().includes(this.busqueda.toLowerCase())
    );
  }

  get totalPaginas() {
    return Math.ceil(this.juegosFiltrados.length / this.juegosPorPagina);
  }

  get juegosPaginados() {
    const inicio = (this.paginaActual - 1) * this.juegosPorPagina;
    return this.juegosFiltrados.slice(inicio, inicio + this.juegosPorPagina);
  }

  get paginas() {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
    this.cdr.markForCheck();
  }

  onBusqueda() {
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => {
        this.listaJuegos = [...juegos]; // nueva referencia para forzar detección
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar juegos:', err)
    });
  }

  inicializarFormulario(): Partial<JuegoCustom> {
    return {
      nombre: '',
      descripcion: '',
      imagen: '',
      imagenPath: '',
      fechaLanzamiento: '',
      generos: [],
      plataformas: [],
      urlSteam: '',
      precio: 0,
      esCustom: true
    };
  }

  // ── VALIDACIÓN ──
  validarFormulario(): boolean {
    this.errores = {};

    if (!this.datosJuego.nombre?.trim())
      this.errores['nombre'] = 'El nombre es obligatorio';

    if (!this.datosJuego.fechaLanzamiento)
      this.errores['fecha'] = 'La fecha es obligatoria';

    if (!this.generosTexto.trim())
      this.errores['generos'] = 'Añade al menos un género';

    if (!this.plataformasTexto.trim())
      this.errores['plataformas'] = 'Añade al menos una plataforma';

    if (!this.datosJuego.descripcion?.trim())
      this.errores['descripcion'] = 'La descripción es obligatoria';

    if (this.datosJuego.urlSteam && !this.esUrlValida(this.datosJuego.urlSteam))
      this.errores['urlSteam'] = 'La URL no es válida';

    if (this.datosJuego.precio === null || this.datosJuego.precio === undefined || this.datosJuego.precio < 0)
      this.errores['precio'] = 'El precio debe ser 0 o mayor';

    if (!this.esEdicion && !this.archivoImagen && !this.datosJuego.imagen)
      this.errores['imagen'] = 'La imagen es obligatoria';

    return Object.keys(this.errores).length === 0;
  }

  esUrlValida(url: string): boolean {
    try { new URL(url); return true; }
    catch { return false; }
  }

  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.archivoImagen = input.files[0];
    delete this.errores['imagen'];
    const lector = new FileReader();
    lector.onload = () => {
      this.previewImagen = lector.result as string;
      this.cdr.detectChanges(); // forzar refresco al cargar preview
    };
    lector.readAsDataURL(this.archivoImagen);
  }

  prepararEdicion(juego: JuegoCustom) {
    this.datosJuego = { ...juego };
    this.generosTexto = juego.generos?.join(', ') || '';
    this.plataformasTexto = juego.plataformas?.join(', ') || '';
    this.esEdicion = true;
    this.previewImagen = juego.imagen || null;
    this.archivoImagen = null;
    this.errores = {};
    this.cdr.detectChanges();

    setTimeout(() => {
      const panel = document.querySelector('.modal-panel');
      if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  limpiarFormulario() {
    this.esEdicion = false;
    this.datosJuego = this.inicializarFormulario();
    this.generosTexto = '';
    this.plataformasTexto = '';
    this.previewImagen = null;
    this.archivoImagen = null;
    this.errores = {};
    this.cdr.detectChanges();
  }

  async guardarJuego() {
    if (!this.validarFormulario()) {
      this.cdr.detectChanges();
      return;
    }

    this.datosJuego.generos = this.generosTexto.split(',').map(g => g.trim()).filter(g => g);
    this.datosJuego.plataformas = this.plataformasTexto.split(',').map(p => p.trim()).filter(p => p);
    this.datosJuego.precio = Number(this.datosJuego.precio);

    this.estaGuardando = true;
    this.cdr.detectChanges();
    let operacionExitosa = false;

    try {
      if (this.archivoImagen) {
        this.estaSubiendoImagen = true;
        this.cdr.detectChanges();
        const { url, path } = await this.firebase.subirImagen(this.archivoImagen);
        this.datosJuego.imagen = url;
        this.datosJuego.imagenPath = path;
        this.estaSubiendoImagen = false;
        this.cdr.detectChanges();
      }

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
      this.estaGuardando = false;
      this.estaSubiendoImagen = false;
      if (operacionExitosa) this.limpiarFormulario();
      this.cdr.detectChanges();
    }
  }

  async borrarJuego(juego: JuegoCustom) {
    if (!confirm(`¿Eliminar "${juego.nombre}"?`)) return;
    try {
      await this.firebase.eliminarJuego(juego);
      // Si al borrar la página actual queda vacía, retrocede una
      if (this.juegosPaginados.length === 0 && this.paginaActual > 1) {
        this.paginaActual--;
      }
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }
}