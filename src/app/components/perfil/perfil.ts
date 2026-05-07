import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  get avatarActual(): string {
    const guardado = this.avatarGuardado;
    if (guardado && guardado !== 'null' && guardado.trim() !== '') return guardado;
    // Si no hay nada guardado, va directo al rol (ignora Google)
    return this.avatarPorRol;
  }

  get avatarPorRol(): string {
    const rol = this.rol ?? 'usuario';
    return this.avataresPorRol[rol] ?? 'assets/user.png';
  }

  ngOnInit(): void {
    combineLatest([
      this.firebase.usuario$,
      this.firebase.rol$,
      this.firebase.obtenerAvatarUsuario()
    ]).subscribe(([usuario, rol, avatarUrl]) => {
      this.usuario = usuario;
      this.rol = rol;
      this.avatarGuardado = (avatarUrl && avatarUrl !== 'null' && avatarUrl.trim() !== '') ? avatarUrl : null;
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  abrirSelectorAvatar() {
    console.log('click avatar');
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

  async cerrarSesion() {
    await this.firebase.cerrarSesion();
    this.router.navigate(['/']);
  }
}