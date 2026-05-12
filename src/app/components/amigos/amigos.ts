import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  FirebaseService, UsuarioPublico, SolicitudAmistad
} from '../../services/firebase.service';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';

@Component({
  selector: 'app-amigos',
  standalone: true,
  imports: [CommonModule, RouterLink, BtnCerrarSesion],
  templateUrl: './amigos.html',
  styleUrl: './amigos.css',
})
export class Amigos implements OnInit, OnDestroy {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  amigos: UsuarioPublico[] = [];
  solicitudes: SolicitudAmistad[] = [];

  cargandoAmigos = true;
  cargandoSolicitudes = true;

  procesandoSolicitudId: string | null = null;

  private amigosSub?: Subscription;
  private solicitudesSub?: Subscription;

  // Avatares por rol, mismo criterio que en el resto de la app.
  private readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  ngOnInit(): void {
    this.amigosSub = this.firebase.obtenerAmigos().subscribe(amigos => {
      this.amigos = amigos;
      this.cargandoAmigos = false;
      this.cdr.detectChanges();
    });

    this.solicitudesSub = this.firebase.obtenerSolicitudesRecibidas().subscribe(solicitudes => {
      this.solicitudes = solicitudes;
      this.cargandoSolicitudes = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.amigosSub?.unsubscribe();
    this.solicitudesSub?.unsubscribe();
  }

  /**
   * Avatar de una persona (amigo o emisor de solicitud).
   * Si tiene avatar personalizado lo usa; si no, el del rol.
   */
  avatarAmigo(amigo: UsuarioPublico): string {
    const url = amigo.avatarUrl;
    if (url && url !== 'null' && url.trim() !== '') return url;
    return this.avataresPorRol[amigo.rol] ?? this.avataresPorRol['usuario'];
  }

  /**
   * Para solicitudes solo tenemos foto y nombre denormalizados.
   * No tenemos el rol, así que si no hay foto subida caemos al
   * avatar de usuario por defecto. Si quieres ser estricto y mostrar
   * el rol correcto aquí, habría que denormalizar también el rol
   * en la solicitud o hacer un fetch extra. Para un TFG con perfiles
   * normales el avatar genérico cubre bien el caso.
   */
  avatarSolicitud(s: SolicitudAmistad): string {
    if (s.deFoto && s.deFoto !== 'null' && s.deFoto.trim() !== '') return s.deFoto;
    return this.avataresPorRol['usuario'];
  }

  async aceptar(solicitud: SolicitudAmistad): Promise<void> {
    if (!solicitud.id) return;
    this.procesandoSolicitudId = solicitud.id;
    this.cdr.detectChanges();
    try {
      await this.firebase.aceptarSolicitudAmistad(solicitud);
      // El listener en tiempo real actualizará tanto la lista de
      // amigos como la de solicitudes automáticamente.
    } finally {
      this.procesandoSolicitudId = null;
      this.cdr.detectChanges();
    }
  }

  async rechazar(solicitud: SolicitudAmistad): Promise<void> {
    if (!solicitud.id) return;
    this.procesandoSolicitudId = solicitud.id;
    this.cdr.detectChanges();
    try {
      await this.firebase.rechazarSolicitudAmistad(solicitud);
    } finally {
      this.procesandoSolicitudId = null;
      this.cdr.detectChanges();
    }
  }

  async eliminarAmistad(amigo: UsuarioPublico): Promise<void> {
    if (!confirm(`¿Seguro que quieres eliminar a ${amigo.nombre} de tus amigos?`)) return;
    await this.firebase.eliminarAmistad(amigo.uid);
    // El stream de amigos se actualiza solo.
  }
}