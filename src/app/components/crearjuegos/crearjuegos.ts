import { Component, OnInit, inject, ChangeDetectorRef, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, JuegoCustom } from '../../services/firebase.service';

// ── Tipos para filtros ──────────────────────────────────────────────
interface FiltrosActivos {
  generos: string[];
  plataformas: string[];
  precio: string | null;   // id del rango
  fecha: string | null;    // id del rango
}

interface RangoPrecio { id: string; label: string; min: number; max: number | null; }
interface RangoFecha  { id: string; label: string; dias: number | null; }

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

  // ── Búsqueda y paginación ──────────────────────────────────────────
  busqueda: string = '';
  paginaActual: number = 1;
  juegosPorPagina: number = 5;

  // ── Filtros ────────────────────────────────────────────────────────
  filtrosAbiertos = false;

  filtros: FiltrosActivos = {
    generos: [],
    plataformas: [],
    precio: null,
    fecha: null,
  };

  readonly rangosPrecio: RangoPrecio[] = [
    { id: 'gratis',  label: 'Gratis',   min: 0,  max: 0   },
    { id: '0-5',     label: '0 – 5 €',  min: 0,  max: 5   },
    { id: '5-10',    label: '5 – 10 €', min: 5,  max: 10  },
    { id: '10-20',   label: '10 – 20 €',min: 10, max: 20  },
    { id: '20-40',   label: '20 – 40 €',min: 20, max: 40  },
    { id: '40-60',   label: '40 – 60 €',min: 40, max: 60  },
    { id: '+60',     label: '+60 €',     min: 60, max: null},
  ];

  readonly rangosFecha: RangoFecha[] = [
    { id: 'hoy',   label: 'Hoy',       dias: 0   },
    { id: '+7',    label: '+7 días',   dias: 7   },
    { id: '+15',   label: '+15 días',  dias: 15  },
    { id: '+30',   label: '+30 días',  dias: 30  },
    { id: '+90',   label: '+90 días',  dias: 90  },
    { id: 'pasado',label: 'Ya salió',  dias: null},
  ];

  // ── Errores de validación ──────────────────────────────────────────
  errores: { [key: string]: string } = {};

  // ── Listas de géneros/plataformas disponibles (extraídas de la lista) ──
  get generosDisponibles(): string[] {
    const todos = this.listaJuegos.flatMap(j => j.generos ?? []);
    return [...new Set(todos)].sort();
  }

  get plataformasDisponibles(): string[] {
    const todas = this.listaJuegos.flatMap(j => j.plataformas ?? []);
    return [...new Set(todas)].sort();
  }

  get totalFiltrosActivos(): number {
    return this.filtros.generos.length
      + this.filtros.plataformas.length
      + (this.filtros.precio ? 1 : 0)
      + (this.filtros.fecha  ? 1 : 0);
  }

  // ── Filtrado principal ─────────────────────────────────────────────
  get juegosFiltrados(): JuegoCustom[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return this.listaJuegos.filter(j => {
      // Texto
      if (this.busqueda && !j.nombre.toLowerCase().includes(this.busqueda.toLowerCase())) return false;

      // Géneros (debe tener AL MENOS uno de los seleccionados)
      if (this.filtros.generos.length) {
        const match = this.filtros.generos.some(g => j.generos?.includes(g));
        if (!match) return false;
      }

      // Plataformas
      if (this.filtros.plataformas.length) {
        const match = this.filtros.plataformas.some(p => j.plataformas?.includes(p));
        if (!match) return false;
      }

      // Precio
      if (this.filtros.precio) {
        const rango = this.rangosPrecio.find(r => r.id === this.filtros.precio);
        if (rango) {
          const precio = j.precio ?? 0;
          if (rango.id === 'gratis' && precio !== 0) return false;
          if (rango.id !== 'gratis') {
            if (precio < rango.min) return false;
            if (rango.max !== null && precio > rango.max) return false;
          }
        }
      }

      // Fecha
      if (this.filtros.fecha) {
        const rango = this.rangosFecha.find(f => f.id === this.filtros.fecha);
        if (rango && j.fechaLanzamiento) {
          const fechaJuego = new Date(j.fechaLanzamiento);
          fechaJuego.setHours(0, 0, 0, 0);
          const diffDias = Math.round((fechaJuego.getTime() - hoy.getTime()) / 86400000);

          if (rango.id === 'hoy'    && diffDias !== 0)    return false;
          if (rango.id === 'pasado' && diffDias >= 0)     return false;
          if (rango.dias !== null   && rango.id !== 'hoy') {
            if (diffDias < 0 || diffDias > rango.dias)   return false;
          }
        }
      }

      return true;
    });
  }

  get totalPaginas(): number {
    return Math.ceil(this.juegosFiltrados.length / this.juegosPorPagina);
  }

  get juegosPaginados(): JuegoCustom[] {
    const inicio = (this.paginaActual - 1) * this.juegosPorPagina;
    return this.juegosFiltrados.slice(inicio, inicio + this.juegosPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  // ── Acciones de filtros ────────────────────────────────────────────
  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.markForCheck();
  }

  toggleFiltroGenero(g: string): void {
    const idx = this.filtros.generos.indexOf(g);
    if (idx === -1) this.filtros.generos.push(g);
    else this.filtros.generos.splice(idx, 1);
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  toggleFiltroPlataforma(p: string): void {
    const idx = this.filtros.plataformas.indexOf(p);
    if (idx === -1) this.filtros.plataformas.push(p);
    else this.filtros.plataformas.splice(idx, 1);
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  toggleFiltroPrecio(id: string): void {
    this.filtros.precio = this.filtros.precio === id ? null : id;
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  toggleFiltroFecha(id: string): void {
    this.filtros.fecha = this.filtros.fecha === id ? null : id;
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.filtros = { generos: [], plataformas: [], precio: null, fecha: null };
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  // ── Resto de métodos sin cambios ───────────────────────────────────
  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
    this.cdr.markForCheck();
  }

  onBusqueda(): void {
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.firebase.obtenerJuegos().subscribe({
      next: (juegos) => {
        this.listaJuegos = [...juegos];
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
    try { new URL(url); return true; } catch { return false; }
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.archivoImagen = input.files[0];
    delete this.errores['imagen'];
    const lector = new FileReader();
    lector.onload = () => {
      this.previewImagen = lector.result as string;
      this.cdr.detectChanges();
    };
    lector.readAsDataURL(this.archivoImagen);
  }

  prepararEdicion(juego: JuegoCustom): void {
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

  limpiarFormulario(): void {
    this.esEdicion = false;
    this.datosJuego = this.inicializarFormulario();
    this.generosTexto = '';
    this.plataformasTexto = '';
    this.previewImagen = null;
    this.archivoImagen = null;
    this.errores = {};
    this.cdr.detectChanges();
  }

  async guardarJuego(): Promise<void> {
    if (!this.validarFormulario()) { this.cdr.detectChanges(); return; }

    this.datosJuego.generos    = this.generosTexto.split(',').map(g => g.trim()).filter(g => g);
    this.datosJuego.plataformas = this.plataformasTexto.split(',').map(p => p.trim()).filter(p => p);
    this.datosJuego.precio     = Number(this.datosJuego.precio);

    this.estaGuardando = true;
    this.cdr.detectChanges();
    let operacionExitosa = false;

    try {
      if (this.archivoImagen) {
        this.estaSubiendoImagen = true;
        this.cdr.detectChanges();
        const { url, path } = await this.firebase.subirImagen(this.archivoImagen);
        this.datosJuego.imagen     = url;
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
      this.estaGuardando      = false;
      this.estaSubiendoImagen = false;
      if (operacionExitosa) this.limpiarFormulario();
      this.cdr.detectChanges();
    }
  }

  async borrarJuego(juego: JuegoCustom): Promise<void> {
    if (!confirm(`¿Eliminar "${juego.nombre}"?`)) return;
    try {
      await this.firebase.eliminarJuego(juego);
      if (this.juegosPaginados.length === 0 && this.paginaActual > 1) this.paginaActual--;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }
}