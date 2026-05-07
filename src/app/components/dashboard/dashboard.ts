import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';
import { Subscription, combineLatest } from 'rxjs';
import { BtnCerrarSesion } from '../cerrar-sesion/cerrar-sesion';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, BtnCerrarSesion],
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
  private peticionesSub?: Subscription;

  readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  ngOnInit(): void {
    combineLatest([
      this.firebase.usuario$,
      this.firebase.rol$,
      this.firebase.obtenerAvatarUsuario()
    ]).subscribe(([usuario, rol, avatarUrl]) => {
      this.usuario = usuario ?? null;
      this.rol = rol;

      const guardado = (avatarUrl && avatarUrl !== 'null' && avatarUrl.trim() !== '') ? avatarUrl : null;
      const porRol = this.avataresPorRol[rol ?? 'usuario'] ?? 'assets/user.png';
      this.avatarSidebar = guardado ?? porRol;

      if (rol === 'admin') {
        this.escucharPeticiones();
      } else {
        this.peticionesSub?.unsubscribe();
        this.peticionesCount = 0;
      }

      this.cdr.detectChanges();
    });
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

  ngOnDestroy(): void {
    this.peticionesSub?.unsubscribe();
  }
}