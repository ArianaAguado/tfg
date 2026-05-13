import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, TicketSoporte } from '../../services/firebase.service';

@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-soporte.html',
  styleUrl: './admin-soporte.css',
})
export class AdminSoporteComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr      = inject(ChangeDetectorRef);

  tickets:    TicketSoporte[] = [];
  mensajeExito = '';
  cargando     = false;

  // Filtro de estado
  filtroEstado: 'todos' | 'abierto' | 'respondido' | 'cerrado' = 'abierto';

  // Panel de respuesta
  ticketActivo:  TicketSoporte | null = null;
  textoRespuesta = '';

  // Historial paginado
  verHistorial  = false;
  paginaHistorial = 1;
  readonly porPagina = 8;

  readonly filtrosDisponibles: Array<{ id: 'todos' | 'abierto' | 'respondido' | 'cerrado'; label: string }> = [
  { id: 'todos',      label: 'Todos'       },
  { id: 'abierto',    label: 'Abiertos'    },
  { id: 'respondido', label: 'Respondidos' },
  { id: 'cerrado',    label: 'Cerrados'    },
];

  get ticketsFiltrados(): TicketSoporte[] {
    if (this.filtroEstado === 'todos') return this.tickets;
    return this.tickets.filter(t => t.estado === this.filtroEstado);
  }

  get ticketsPaginados(): TicketSoporte[] {
    const inicio = (this.paginaHistorial - 1) * this.porPagina;
    return this.ticketsFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.ticketsFiltrados.length / this.porPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  get contadorPorEstado() {
    return {
      todos:       this.tickets.length,
      abierto:     this.tickets.filter(t => t.estado === 'abierto').length,
      respondido:  this.tickets.filter(t => t.estado === 'respondido').length,
      cerrado:     this.tickets.filter(t => t.estado === 'cerrado').length,
    };
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaHistorial = p;
    this.cdr.detectChanges();
  }

  cambiarFiltro(f: typeof this.filtroEstado): void {
    this.filtroEstado   = f;
    this.paginaHistorial = 1;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.firebase.obtenerTicketsAdmin().subscribe({
      next: (tickets) => { this.tickets = tickets; this.cdr.detectChanges(); },
      error: (err)    => console.error('Error al cargar tickets:', err),
    });
  }

  abrirRespuesta(ticket: TicketSoporte): void {
    this.ticketActivo   = ticket;
    this.textoRespuesta = ticket.respuesta ?? '';
    this.cdr.detectChanges();
  }

  cerrarRespuesta(): void {
    this.ticketActivo   = null;
    this.textoRespuesta = '';
  }

  async enviarRespuesta(): Promise<void> {
    if (!this.ticketActivo?.id || !this.textoRespuesta.trim()) return;
    this.cargando = true;
    try {
      await this.firebase.responderTicket(this.ticketActivo.id, this.textoRespuesta.trim());
      this.mensajeExito = 'Respuesta enviada correctamente.';
      setTimeout(() => this.mensajeExito = '', 4000);
      this.cerrarRespuesta();
    } catch (e) {
      console.error('Error al responder:', e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async cerrarTicket(ticket: TicketSoporte): Promise<void> {
    if (!ticket.id || !confirm('¿Marcar este ticket como cerrado?')) return;
    try {
      await this.firebase.cerrarTicket(ticket.id);
    } catch (e) {
      console.error('Error al cerrar ticket:', e);
    }
  }

  estadoLabel(e: string): string {
    return { abierto: 'Abierto', respondido: 'Respondido', cerrado: 'Cerrado' }[e] ?? e;
  }

  
}