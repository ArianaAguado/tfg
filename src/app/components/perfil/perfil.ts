import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private firebase = inject(FirebaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  usuario: User | null = null;
  rol: string | null = null;

  ngOnInit(): void {
    this.firebase.usuario$.subscribe(u => {
      this.usuario = u;
      this.cdr.detectChanges();
    });

    this.firebase.rol$.subscribe(r => {
      this.rol = r;
      this.cdr.detectChanges();
    });
  }

  async cerrarSesion() {
    await this.firebase.cerrarSesion();
    this.router.navigate(['/']);
  }
}