import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { FirebaseService } from '../../services/firebase.service';

export interface PropuestaStats {
  id?: string;
  nombre: string;
  imagen?: string;
  plataformas?: string[];
  descripcion?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  visitas?: number;
  valoracionMedia?: number;
  numValoraciones?: number;
  interesados?: number;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css',
})
export class EstadisticasComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private auth     = inject(Auth);
  private cdr      = inject(ChangeDetectorRef);

  cargando   = true;
  periodo    = '30d';
  propuestas: PropuestaStats[] = [];

  // ── KPIs calculados ─────────────────────────────────────────────
  get totalVisitas(): number {
    return this.propuestas.reduce((s, p) => s + (p.visitas ?? 0), 0);
  }

  get mediaValoracion(): number {
    const con = this.propuestas.filter(p => (p.numValoraciones ?? 0) > 0);
    if (!con.length) return 0;
    return con.reduce((s, p) => s + (p.valoracionMedia ?? 0), 0) / con.length;
  }

  get totalInteresados(): number {
    return this.propuestas.reduce((s, p) => s + (p.interesados ?? 0), 0);
  }

  get topPropuesta(): PropuestaStats | null {
    if (!this.propuestas.length) return null;
    return [...this.propuestas].sort(
      (a, b) => (b.visitas ?? 0) - (a.visitas ?? 0)
    )[0];
  }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  setPeriodo(p: string): void {
    this.periodo = p;
    this.cargarEstadisticas();
  }

  private cargarEstadisticas(): void {
    const user = this.auth.currentUser;
    if (!user) return;
    this.cargando = true;

    // Carga las propuestas del desarrollador actual.
    // Ajusta el método de firebase.service según tu implementación:
    // - getMisPropuestas(uid) si tienes un campo autorId en la colección juegos/propuestas
    this.firebase.getMisPropuestas(user.uid).subscribe({
      next: (data: PropuestaStats[]) => {
        this.propuestas = data;
        this.cargando   = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Error cargando estadísticas:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  estadoLabel(estado?: string): string {
    return (
      { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' }[
        estado ?? ''
      ] ?? estado ?? '—'
    );
  }

  truncar(texto: string, max = 120): string {
    if (!texto) return '';
    return texto.length > max ? texto.slice(0, max) + '...' : texto;
  }
}