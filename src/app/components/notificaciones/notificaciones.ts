import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { FirebaseService, JuegoFavorito } from '../../services/firebase.service';

interface Notificacion {
  id: string;
  juego: JuegoFavorito;
  tipo: 'semana' | 'dia';
  diasRestantes: number;
  mensaje: string;
  fechaLanzamiento: string;
  leida: boolean;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css',
})
export class Notificaciones implements OnInit, OnDestroy {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  notificaciones: Notificacion[] = [];
  abierto = false;
  private sub?: Subscription;

  get noLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  ngOnInit(): void {
    // Combinamos favoritos + notificaciones leídas para calcular la bandeja en vivo
    this.sub = combineLatest([
      this.firebase.obtenerFavoritos(),
      this.firebase.obtenerNotificacionesLeidas()
    ]).subscribe(([favoritos, leidas]) => {
      this.notificaciones = this.calcularNotificaciones(favoritos, leidas);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private calcularNotificaciones(favoritos: JuegoFavorito[], leidas: Set<string>): Notificacion[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // normalizamos a inicio del día

    const lista: Notificacion[] = [];

    for (const juego of favoritos) {
      if (!juego.released) continue;

      const fechaLanzamiento = new Date(juego.released + 'T12:00:00');
      fechaLanzamiento.setHours(0, 0, 0, 0);

      const diffMs = fechaLanzamiento.getTime() - hoy.getTime();
      const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Aviso "1 semana antes": se enseña entre 7 y 2 días antes del lanzamiento
      if (diasRestantes >= 2 && diasRestantes <= 7) {
        const id = `${juego.released}_${juego.name.replace(/\s/g, '_')}_semana`;
        lista.push({
          id,
          juego,
          tipo: 'semana',
          diasRestantes,
          mensaje: `${juego.name} sale en ${diasRestantes} días. ¡No te lo pierdas!`,
          fechaLanzamiento: juego.released,
          leida: leidas.has(id)
        });
      }

      // Aviso "día antes": se enseña 1 día antes y el mismo día del lanzamiento
      if (diasRestantes >= 0 && diasRestantes <= 1) {
        const id = `${juego.released}_${juego.name.replace(/\s/g, '_')}_dia`;
        const msg = diasRestantes === 0
          ? `¡${juego.name} sale HOY!`
          : `¡${juego.name} sale mañana!`;
        lista.push({
          id,
          juego,
          tipo: 'dia',
          diasRestantes,
          mensaje: msg,
          fechaLanzamiento: juego.released,
          leida: leidas.has(id)
        });
      }
    }

    // No leídas primero, dentro de cada grupo las más cercanas primero
    return lista.sort((a, b) => {
      if (a.leida !== b.leida) return a.leida ? 1 : -1;
      return a.diasRestantes - b.diasRestantes;
    });
  }

  toggleAbierto(): void {
    this.abierto = !this.abierto;
    this.cdr.detectChanges();
  }

  async clicNotificacion(n: Notificacion): Promise<void> {
    if (!n.leida) {
      await this.firebase.marcarNotificacionLeida(n.id);
    }
    this.abierto = false;
    this.cdr.detectChanges();

    if (n.juego.slug) {
      this.router.navigate(['/dashboard/juego', n.juego.slug]);
    } else {
      this.router.navigate(['/dashboard/juego-custom'], { state: { juego: n.juego } });
    }
  }

  async marcarTodasLeidas(): Promise<void> {
    const ids = this.notificaciones.filter(n => !n.leida).map(n => n.id);
    if (ids.length === 0) return;
    await this.firebase.marcarTodasLeidas(ids);
  }

  // Cierra el dropdown si el usuario clica fuera de él
  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (this.abierto && !this.elementRef.nativeElement.contains(event.target)) {
      this.abierto = false;
      this.cdr.detectChanges();
    }
  }
}