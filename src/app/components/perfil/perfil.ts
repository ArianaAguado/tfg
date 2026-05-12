import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';
import { combineLatest } from 'rxjs';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';

type RedesSociales = {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  twitch?: string;
  steam?: string;
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, BtnCerrarSesion],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private firebase = inject(FirebaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  usuario: User | null = null;
  rol: string | null = null;
  cargando = true;

  // Avatar
  avatarGuardado: string | null = null;
  modoSeleccionAvatar = false;
  archivoImagen: File | null = null;
  previewImagen: string | null = null;
  estaSubiendoAvatar = false;

  // Perfil extra
  bio = '';
  generosFav: string[] = [];
  plataformasFav: string[] = [];
  redesSociales: RedesSociales = {};
  modoEditarPerfil = false;
  bioTemp = '';
  generosFavTemp: string[] = [];
  plataformasFavTemp: string[] = [];
  redesSocialesTemp: RedesSociales = {};
  guardandoPerfil = false;

  // Editar nombre
  modoEditarNombre = false;
  nombreTemp = '';
  guardandoNombre = false;

  readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  readonly generosList = [
    'Acción', 'Aventura', 'RPG', 'Estrategia', 'Simulación',
    'Deportes', 'Carreras', 'Plataformas', 'Puzzle', 'Terror',
    'Shooter', 'Lucha', 'Indie', 'Sandbox', 'MMORPG'
  ];

  readonly plataformasList = [
    'PC', 'PS5', 'PS4', 'Xbox Series X', 'Xbox One',
    'Nintendo Switch', 'Mobile', 'Mac', 'VR'
  ];

  readonly redesList: { key: keyof RedesSociales; label: string; placeholder: string; icon: string }[] = [
    { key: 'twitter',   label: 'X / Twitter', placeholder: 'https://x.com/tuusuario',                 icon: 'fa-brands fa-x-twitter' },
    { key: 'instagram', label: 'Instagram',   placeholder: 'https://instagram.com/tuusuario',         icon: 'fa-brands fa-instagram' },
    { key: 'youtube',   label: 'YouTube',     placeholder: 'https://youtube.com/@tucanal',            icon: 'fa-brands fa-youtube'   },
    { key: 'twitch',    label: 'Twitch',      placeholder: 'https://twitch.tv/tuusuario',             icon: 'fa-brands fa-twitch'    },
    { key: 'steam',     label: 'Steam',       placeholder: 'https://steamcommunity.com/id/tuusuario', icon: 'fa-brands fa-steam'     },
  ];

  get avatarActual(): string {
    const guardado = this.avatarGuardado;
    if (guardado && guardado !== 'null' && guardado.trim() !== '') return guardado;
    return this.avatarPorRol;
  }

  get avatarPorRol(): string {
    const rol = this.rol ?? 'usuario';
    return this.avataresPorRol[rol] ?? 'assets/user.png';
  }

  get tieneRedes(): boolean {
    return this.redesList.some(r => !!this.redesSociales[r.key]);
  }

  ngOnInit(): void {
    combineLatest([
      this.firebase.usuario$,
      this.firebase.rol$,
      this.firebase.obtenerAvatarUsuario(),
      this.firebase.obtenerPerfil()
    ]).subscribe(([usuario, rol, avatarUrl, perfil]) => {
      this.usuario = usuario ?? null;
      this.rol = rol;
      this.avatarGuardado = (avatarUrl && avatarUrl !== 'null' && avatarUrl.trim() !== '') ? avatarUrl : null;
      this.bio = perfil?.bio ?? '';
      this.generosFav = perfil?.generosFav ?? [];
      this.plataformasFav = perfil?.plataformasFav ?? [];
      this.redesSociales = perfil?.redesSociales ?? {};
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  // ── AVATAR ──

  abrirSelectorAvatar() {
    this.modoSeleccionAvatar = true;
    this.previewImagen = null;
    this.archivoImagen = null;
    this.cdr.detectChanges();
  }

  cerrarSelectorAvatar() {
    this.modoSeleccionAvatar = false;
    this.previewImagen = null;
    this.archivoImagen = null;
    this.cdr.detectChanges();
  }

  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.archivoImagen = input.files[0];
    const lector = new FileReader();
    lector.onload = () => {
      this.previewImagen = lector.result as string;
      this.cdr.detectChanges();
    };
    lector.readAsDataURL(this.archivoImagen);
  }

  async subirImagenPersonalizada() {
    if (!this.archivoImagen) return;
    this.estaSubiendoAvatar = true;
    this.cdr.detectChanges();
    try {
      const { url } = await this.firebase.subirImagen(this.archivoImagen);
      await this.firebase.actualizarAvatar(url);
      this.avatarGuardado = url;
      this.cerrarSelectorAvatar();
    } catch (err) {
      console.error('Error al subir imagen:', err);
    } finally {
      this.estaSubiendoAvatar = false;
      this.cdr.detectChanges();
    }
  }

  async quitarAvatar() {
    try {
      await this.firebase.actualizarAvatar('');
      this.avatarGuardado = null;
      this.cerrarSelectorAvatar();
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error al quitar avatar:', err);
    }
  }

  // ── NOMBRE ──

  abrirEditarNombre() {
    this.nombreTemp = this.usuario?.displayName || '';
    this.modoEditarNombre = true;
    this.cdr.detectChanges();
  }

  cerrarEditarNombre() {
    this.modoEditarNombre = false;
    this.nombreTemp = '';
    this.cdr.detectChanges();
  }

  async guardarNombre() {
    if (!this.nombreTemp.trim()) return;
    this.guardandoNombre = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.actualizarNombre(this.nombreTemp.trim());
      if (this.usuario) {
        (this.usuario as any).displayName = this.nombreTemp.trim();
      }
      this.cerrarEditarNombre();
    } catch (err) {
      console.error('Error al guardar nombre:', err);
    } finally {
      this.guardandoNombre = false;
      this.cdr.detectChanges();
    }
  }

  // ── PERFIL ──

  abrirEditarPerfil() {
    this.bioTemp = this.bio;
    this.generosFavTemp = [...this.generosFav];
    this.plataformasFavTemp = [...this.plataformasFav];
    this.redesSocialesTemp = { ...this.redesSociales };
    this.modoEditarPerfil = true;
    this.cdr.detectChanges();
  }

  cerrarEditarPerfil() {
    this.modoEditarPerfil = false;
    this.cdr.detectChanges();
  }

  toggleGenero(genero: string) {
    const i = this.generosFavTemp.indexOf(genero);
    if (i >= 0) this.generosFavTemp.splice(i, 1);
    else if (this.generosFavTemp.length < 5) this.generosFavTemp.push(genero);
    this.cdr.detectChanges();
  }

  togglePlataforma(plataforma: string) {
    const i = this.plataformasFavTemp.indexOf(plataforma);
    if (i >= 0) this.plataformasFavTemp.splice(i, 1);
    else this.plataformasFavTemp.push(plataforma);
    this.cdr.detectChanges();
  }

  estaGeneroActivo(genero: string) {
    return this.generosFavTemp.includes(genero);
  }

  estaPlataformaActiva(plataforma: string) {
    return this.plataformasFavTemp.includes(plataforma);
  }

  async guardarPerfil() {
    this.guardandoPerfil = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.actualizarPerfil({
        bio: this.bioTemp,
        generosFav: this.generosFavTemp,
        plataformasFav: this.plataformasFavTemp,
        redesSociales: this.redesSocialesTemp
      });
      this.bio = this.bioTemp;
      this.generosFav = [...this.generosFavTemp];
      this.plataformasFav = [...this.plataformasFavTemp];
      this.redesSociales = { ...this.redesSocialesTemp };
      this.cerrarEditarPerfil();
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    } finally {
      this.guardandoPerfil = false;
      this.cdr.detectChanges();
    }
  }

  async cerrarSesion() {
    await this.firebase.cerrarSesion();
    this.router.navigate(['/']);
  }
}