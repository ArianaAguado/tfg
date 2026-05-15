import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  FirebaseService, UsuarioPublico, SolicitudAmistad, EstadoAmistad
} from '../../services/firebase.service';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';

@Component({
  selector: 'app-amigos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, BtnCerrarSesion],
  templateUrl: './amigos.html',
  styleUrl: './amigos.css',
})
export class Amigos implements OnInit, OnDestroy {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  // ── Amigos ──
  amigos: UsuarioPublico[] = [];
  amigosFiltrados: UsuarioPublico[] = [];
  queryAmigos: string = '';
  cargandoAmigos = true;

  // ── Solicitudes recibidas ──
  solicitudes: SolicitudAmistad[] = [];
  cargandoSolicitudes = true;
  procesandoSolicitudId: string | null = null;

  // ── Buscador de usuarios ──
  queryBusqueda: string = '';
  resultadosBusqueda: UsuarioPublico[] = [];
  estadosAmistad: Record<string, EstadoAmistad> = {};
  buscando = false;
  busquedaRealizada = false;
  procesandoUid: string | null = null;

  private amigosSub?: Subscription;
  private solicitudesSub?: Subscription;

  private readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  ngOnInit(): void {
    this.amigosSub = this.firebase.obtenerAmigos().subscribe(amigos => {
      this.amigos = amigos;
      this.amigosFiltrados = [...amigos];
      this.cargandoAmigos = false;
      // Refrescar estados si hay resultados de búsqueda abiertos
      if (this.resultadosBusqueda.length > 0) {
        this.cargarEstados(this.resultadosBusqueda);
      }
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

  // ── Filtro lista de amigos ──
  filtrarAmigos(): void {
    const q = this.queryAmigos.toLowerCase().trim();
    this.amigosFiltrados = q
      ? this.amigos.filter(a => a.nombre?.toLowerCase().includes(q))
      : [...this.amigos];
    this.cdr.detectChanges();
  }

  // ── Buscador de usuarios ──
  onInputBusqueda(): void {
    if (!this.queryBusqueda.trim()) {
      this.resultadosBusqueda = [];
      this.busquedaRealizada = false;
      this.estadosAmistad = {};
      this.cdr.detectChanges();
    }
  }

  async buscarUsuarios(): Promise<void> {
    if (!this.queryBusqueda.trim()) return;
    this.buscando = true;
    this.busquedaRealizada = false;
    this.cdr.detectChanges();

    try {
      const usuarios = await this.firebase.buscarUsuarios(this.queryBusqueda);
      this.resultadosBusqueda = usuarios;
      await this.cargarEstados(usuarios);
      this.busquedaRealizada = true;
    } finally {
      this.buscando = false;
      this.cdr.detectChanges();
    }
  }

  private async cargarEstados(usuarios: UsuarioPublico[]): Promise<void> {
    const entradas = await Promise.all(
      usuarios.map(async u => {
        const estado = await this.firebase.obtenerEstadoAmistad(u.uid);
        return [u.uid, estado] as [string, EstadoAmistad];
      })
    );
    this.estadosAmistad = Object.fromEntries(entradas);
    this.cdr.detectChanges();
  }

  async enviarSolicitud(usuario: UsuarioPublico): Promise<void> {
    this.procesandoUid = usuario.uid;
    this.cdr.detectChanges();
    try {
      await this.firebase.enviarSolicitudAmistad(usuario.uid);
      this.estadosAmistad[usuario.uid] = 'pendiente_enviada';
    } finally {
      this.procesandoUid = null;
      this.cdr.detectChanges();
    }
  }

  async cancelarSolicitud(usuario: UsuarioPublico): Promise<void> {
    this.procesandoUid = usuario.uid;
    this.cdr.detectChanges();
    try {
      await this.firebase.cancelarSolicitudAmistad(usuario.uid);
      this.estadosAmistad[usuario.uid] = 'ninguna';
    } finally {
      this.procesandoUid = null;
      this.cdr.detectChanges();
    }
  }

  // ── Solicitudes recibidas ──
  async aceptar(solicitud: SolicitudAmistad): Promise<void> {
    if (!solicitud.id) return;
    this.procesandoSolicitudId = solicitud.id;
    this.cdr.detectChanges();
    try {
      await this.firebase.aceptarSolicitudAmistad(solicitud);
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
  }

  // ── Avatares ──
  avatarAmigo(amigo: UsuarioPublico): string {
    return this.resolverAvatar(amigo.avatarUrl, amigo.rol);
  }

  avatarUsuario(u: UsuarioPublico): string {
    return this.resolverAvatar(u.avatarUrl, u.rol);
  }

  avatarSolicitud(s: SolicitudAmistad): string {
    if (s.deFoto && s.deFoto !== 'null' && s.deFoto.trim() !== '') return s.deFoto;
    return this.avataresPorRol['usuario'];
  }

  private resolverAvatar(url: string | undefined, rol: string): string {
    if (url && url !== 'null' && url.trim() !== '') return url;
    return this.avataresPorRol[rol] ?? this.avataresPorRol['usuario'];
  }
}