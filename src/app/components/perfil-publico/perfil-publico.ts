import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  FirebaseService, UsuarioPublico, EstadoAmistad, JuegoFavorito
} from '../../services/firebase.service';

type RedesSociales = {
  twitter?: string; instagram?: string; youtube?: string; twitch?: string; steam?: string;
};

@Component({
  selector: 'app-perfil-publico',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './perfil-publico.html',
  styleUrl: './perfil-publico.css',
})
export class PerfilPublico implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  cargando = true;
  perfil: UsuarioPublico | null = null;
  estadoAmistad: EstadoAmistad = 'ninguna';
  procesandoAmistad = false;

  biblioteca: JuegoFavorito[] = [];
  cargandoBiblioteca = false;


  private solicitudIdRecibida: string | null = null;
  private rutaSub?: Subscription;

  // Avatares por rol, mismo criterio que el resto de la app.
  private readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  readonly redesList: { key: keyof RedesSociales; label: string; icon: string }[] = [
    { key: 'twitter',   label: 'X / Twitter', icon: 'fa-brands fa-x-twitter' },
    { key: 'instagram', label: 'Instagram',   icon: 'fa-brands fa-instagram' },
    { key: 'youtube',   label: 'YouTube',     icon: 'fa-brands fa-youtube'   },
    { key: 'twitch',    label: 'Twitch',      icon: 'fa-brands fa-twitch'    },
    { key: 'steam',     label: 'Steam',       icon: 'fa-brands fa-steam'     },
  ];

  ngOnInit(): void {

    this.rutaSub = this.route.paramMap.subscribe(params => {
      const uid = params.get('uid');
      if (!uid) {
        this.router.navigate(['/dashboard/calendario']);
        return;
      }
      this.cargarPerfil(uid);
    });
  }

  ngOnDestroy(): void {
    this.rutaSub?.unsubscribe();
  }

  private async cargarPerfil(uid: string): Promise<void> {
    this.cargando = true;
    this.perfil = null;
    this.biblioteca = [];
    this.cdr.detectChanges();

    this.perfil = await this.firebase.obtenerUsuarioPublico(uid);

    if (!this.perfil) {

      this.cargando = false;
      this.cdr.detectChanges();
      this.router.navigate(['/dashboard/calendario']);
      return;
    }


    const miUid = this.firebase.usuarioActual?.uid;
    if (miUid === uid) {
      this.router.navigate(['/dashboard/perfil']);
      return;
    }

    this.estadoAmistad = await this.firebase.obtenerEstadoAmistad(uid);


    if (this.estadoAmistad === 'pendiente_recibida') {
      await this.localizarSolicitudRecibida(uid);
    }

    if (this.estadoAmistad === 'amigos') {
      await this.cargarBiblioteca(uid);
    }

    this.cargando = false;
    this.cdr.detectChanges();
  }

  private async localizarSolicitudRecibida(deUid: string): Promise<void> {

    const sub = this.firebase.obtenerSolicitudesRecibidas().subscribe(solicitudes => {
      const mia = solicitudes.find(s => s.deUid === deUid);
      this.solicitudIdRecibida = mia?.id ?? null;
      sub.unsubscribe();
    });
  }

  private async cargarBiblioteca(uid: string): Promise<void> {
    this.cargandoBiblioteca = true;
    this.cdr.detectChanges();
    try {
      this.biblioteca = await this.firebase.obtenerFavoritosDeUsuario(uid);
    } catch (err) {
      console.error('Error cargando biblioteca del amigo:', err);
      this.biblioteca = [];
    } finally {
      this.cargandoBiblioteca = false;
      this.cdr.detectChanges();
    }
  }

  get avatarPerfil(): string {
    const url = this.perfil?.avatarUrl;
    if (url && url !== 'null' && url.trim() !== '') return url;
    const rol = this.perfil?.rol ?? 'usuario';
    return this.avataresPorRol[rol] ?? this.avataresPorRol['usuario'];
  }

  get tieneRedes(): boolean {
    const r = this.perfil?.redesSociales ?? {};
    return this.redesList.some(red => !!(r as any)[red.key]);
  }


  async enviarSolicitud(): Promise<void> {
    if (!this.perfil) return;
    this.procesandoAmistad = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.enviarSolicitudAmistad(this.perfil.uid);
      this.estadoAmistad = 'pendiente_enviada';
    } finally {
      this.procesandoAmistad = false;
      this.cdr.detectChanges();
    }
  }

  async cancelarSolicitud(): Promise<void> {
    if (!this.perfil) return;
    this.procesandoAmistad = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.cancelarSolicitudAmistad(this.perfil.uid);
      this.estadoAmistad = 'ninguna';
    } finally {
      this.procesandoAmistad = false;
      this.cdr.detectChanges();
    }
  }

  async aceptarSolicitud(): Promise<void> {
    if (!this.perfil || !this.solicitudIdRecibida) return;
    this.procesandoAmistad = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.aceptarSolicitudAmistad({
        id: this.solicitudIdRecibida,
        deUid: this.perfil.uid,
        deNombre: this.perfil.nombre,
        deFoto: this.perfil.avatarUrl ?? '',
        paraUid: this.firebase.usuarioActual!.uid,
        fecha: 0 // no relevante para aceptar
      });
      this.estadoAmistad = 'amigos';
      this.solicitudIdRecibida = null;
      await this.cargarBiblioteca(this.perfil.uid);
    } finally {
      this.procesandoAmistad = false;
      this.cdr.detectChanges();
    }
  }

  async rechazarSolicitud(): Promise<void> {
    if (!this.perfil || !this.solicitudIdRecibida) return;
    this.procesandoAmistad = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.rechazarSolicitudAmistad({
        id: this.solicitudIdRecibida,
        deUid: this.perfil.uid,
        deNombre: this.perfil.nombre,
        deFoto: this.perfil.avatarUrl ?? '',
        paraUid: this.firebase.usuarioActual!.uid,
        fecha: 0
      });
      this.estadoAmistad = 'ninguna';
      this.solicitudIdRecibida = null;
    } finally {
      this.procesandoAmistad = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarAmistad(): Promise<void> {
    if (!this.perfil) return;
    if (!confirm(`¿Seguro que quieres eliminar a ${this.perfil.nombre} de tus amigos?`)) return;
    this.procesandoAmistad = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.eliminarAmistad(this.perfil.uid);
      this.estadoAmistad = 'ninguna';
      this.biblioteca = [];
    } finally {
      this.procesandoAmistad = false;
      this.cdr.detectChanges();
    }
  }

  abrirDetalle(juego: JuegoFavorito): void {
    if (juego.slug) {
      this.router.navigate(['/dashboard/juego', juego.slug]);
    } else {
      this.router.navigate(['/dashboard/juego-custom'], { state: { juego } });
    }
  }
}