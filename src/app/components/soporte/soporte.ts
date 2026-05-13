import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, TicketSoporte } from '../../services/firebase.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './soporte.html',
  styleUrl: './soporte.css',
})
export class SoporteComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private auth     = inject(Auth);
  private cdr      = inject(ChangeDetectorRef);

  // ── Formulario ──────────────────────────────────────────────────
  asunto          = '';
  descripcion     = '';
  capturas:        string[] = [];
  subiendoCaptura = false;
  enviando        = false;
  enviado         = false;
  error           = '';

  // ── Mis tickets ─────────────────────────────────────────────────
  misTickets:  TicketSoporte[] = [];
  verHistorial = false;
  paginaActual = 1;
  readonly porPagina = 5;

  // ── Paginación ──────────────────────────────────────────────────
  get ticketsPaginados(): TicketSoporte[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.misTickets.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.misTickets.length / this.porPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    this.cdr.detectChanges();
  }

  toggleHistorial(): void {
    this.verHistorial = !this.verHistorial;
    this.paginaActual = 1;
    this.cdr.detectChanges();
  }

  // ── Ciclo de vida ────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarTickets();
  }

  // FIX 3: método separado para poder llamarlo también tras enviar
  private cargarTickets(): void {
    const user = this.auth.currentUser;
    if (!user) return;
    this.firebase.obtenerMisTickets(user.uid).subscribe({
      // FIX 3: spread para crear nueva referencia y forzar detección de cambios
      next:  (tickets) => { this.misTickets = [...tickets]; this.cdr.detectChanges(); },
      error: (err)     => console.error('Error al cargar tickets:', err),
    });
  }

  // ── Capturas ─────────────────────────────────────────────────────
  async onCapturaSeleccionada(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.subiendoCaptura = true;
    this.cdr.detectChanges();
    try {
      for (const file of Array.from(input.files)) {
        const url = await this.firebase.subirCaptura(file);
        this.capturas.push(url);
      }
    } catch (e) {
      this.error = 'Error al subir la imagen.';
    } finally {
      this.subiendoCaptura = false;
      this.cdr.detectChanges();
    }
  }

  eliminarCaptura(i: number): void {
    this.capturas.splice(i, 1);
  }

  // ── Envío ────────────────────────────────────────────────────────
  async enviar(): Promise<void> {
    if (!this.asunto.trim() || !this.descripcion.trim()) {
      this.error = 'El asunto y la descripción son obligatorios.';
      return;
    }
    const user = this.auth.currentUser;
    if (!user) return;

    this.enviando = true;
    this.error    = '';
    try {
      await this.firebase.enviarTicket({
        asunto:        this.asunto.trim(),
        descripcion:   this.descripcion.trim(),
        capturas:      [...this.capturas],
        estado:        'abierto',
        autorId:       user.uid,
        autorNombre:   user.displayName ?? 'Sin nombre',
        autorEmail:    user.email ?? '',
        autorRol:      'usuario',
        fechaCreacion: Date.now(),
      });
      this.enviado     = true;
      this.asunto      = '';
      this.descripcion = '';
      this.capturas    = [];
      // FIX 3: recargar tickets tras enviar para que el botón de historial
      // siga visible cuando el usuario pulse "Enviar otro mensaje"
      this.cargarTickets();
    } catch (e) {
      this.error = 'Error al enviar el mensaje. Inténtalo de nuevo.';
      console.error(e);
    } finally {
      this.enviando = false;
      this.cdr.detectChanges();
    }
  }

  // FIX 1: reset completo del estado para que el botón vuelva a funcionar
  volverAEnviar(): void {
    this.enviado  = false;
    this.enviando = false; // ← evita que el botón quede bloqueado
    this.error    = '';
    this.cdr.detectChanges();
  }

  // ── Helpers ──────────────────────────────────────────────────────
  estadoLabel(e: string): string {
    return { abierto: 'Abierto', respondido: 'Respondido', cerrado: 'Cerrado' }[e] ?? e;
  }

  truncar(texto: string, max = 120): string {
    if (!texto) return '';
    return texto.length > max ? texto.slice(0, max) + '...' : texto;
  }
}