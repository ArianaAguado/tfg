import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from '@angular/fire/auth';
import { Subscription, combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';
import { Notificaciones } from '../notificaciones/notificaciones';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, BtnCerrarSesion, Notificaciones],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  usuario: User | null = null;
  rol: string | null = null;
  avatarSidebar: string = 'assets/user.png';
  peticionesCount = 0;
  solicitudesAmistadCount = 0;
  ticketsAbiertosCount = 0;

  private mainSub?: Subscription;
  private peticionesSub?: Subscription;
  private solicitudesSub?: Subscription;
  private ticketsSub?: Subscription;

  private avatar$ = this.firebase.obtenerAvatarUsuario();

  readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  ngOnInit(): void {
    this.mainSub = combineLatest([
      this.firebase.usuario$,
      this.firebase.rol$,
      this.avatar$
    ]).pipe(
      filter(([usuario]) => usuario !== undefined)
    ).subscribe(([usuario, rol, avatarUrl]) => {

      this.usuario = usuario ?? null;
      this.rol = rol;

      const guardado = (avatarUrl && avatarUrl !== 'null' && avatarUrl.trim() !== '') ? avatarUrl : null;
      const porRol = this.avataresPorRol[rol ?? 'usuario'] ?? 'assets/user.png';
      this.avatarSidebar = guardado ?? porRol;

      if (rol === 'admin') {
        this.escucharPeticiones();
        this.escucharTicketsSoporte();
      } else {
        this.peticionesSub?.unsubscribe();
        this.peticionesCount = 0;
        this.ticketsSub?.unsubscribe();
        this.ticketsAbiertosCount = 0;
      }

      this.cdr.detectChanges();
    });

    // Solicitudes de amistad: badge para todos los usuarios autenticados.
    this.escucharSolicitudesAmistad();
  }

  private escucharPeticiones(): void {
    this.peticionesSub = this.firebase.obtenerPeticiones().subscribe({
      next: (peticiones) => {
        this.peticionesCount = peticiones.length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error contando peticiones:', err)
    });
  }

  private escucharTicketsSoporte(): void {
    this.ticketsSub = this.firebase.obtenerTicketsAdmin().subscribe({
      next: (tickets) => {
        this.ticketsAbiertosCount = tickets.filter(t => t.estado === 'abierto').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error contando tickets soporte:', err)
    });
  }

  private escucharSolicitudesAmistad(): void {
    this.solicitudesSub = this.firebase.obtenerSolicitudesRecibidas().subscribe({
      next: (solicitudes) => {
        this.solicitudesAmistadCount = solicitudes.length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error contando solicitudes de amistad:', err)
    });
  }

  private escucharTicketsSoporte(): void {
    this.ticketsSub = this.firebase.obtenerTicketsAdmin().subscribe({
      next: (tickets) => {
        this.ticketsAbiertosCount = tickets.filter(t => t.estado === 'abierto').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error contando tickets soporte:', err)
    });
  }

  ngOnDestroy(): void {
    this.mainSub?.unsubscribe();
    this.peticionesSub?.unsubscribe();
    this.solicitudesSub?.unsubscribe();
    this.ticketsSub?.unsubscribe();
  }
}