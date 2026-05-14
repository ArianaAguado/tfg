import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { FirebaseService } from '../../services/firebase.service';
import { Subscription } from 'rxjs';
import { filter, take, switchMap } from 'rxjs/operators';

export interface PropuestaStats {
  id?: string;
  nombre: string;
  imagen?: string;
  plataformas?: string[];
  descripcion?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  visitas?: number;
  interesados?: number;
  likes?: number;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css',
})
export class EstadisticasComponent implements OnInit, OnDestroy {
  private firebase = inject(FirebaseService);
  private auth     = inject(Auth);
  private cdr      = inject(ChangeDetectorRef);

  cargando   = true;
  periodo    = '30d';
  propuestas: PropuestaStats[] = [];
  private sub?: Subscription;

  get totalVisitas(): number {
    return this.propuestas.reduce((s, p) => s + (p.visitas ?? 0), 0);
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
  
  get totalLikes(): number {
  return this.propuestas.reduce((s, p) => s + (p.likes ?? 0), 0);
}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setPeriodo(p: string): void {
    this.periodo = p;
    this.cargarEstadisticas();
  }

  private cargarEstadisticas(): void {
    this.sub?.unsubscribe();
    this.cargando = true;

    this.sub = this.firebase.usuario$.pipe(
      filter(user => user !== undefined && user !== null),
      take(1),
      switchMap(user => this.firebase.getMisPropuestas(user!.uid))
    ).subscribe({
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