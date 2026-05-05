import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';
import { Subscription } from 'rxjs'; // Importante para limpiar la suscripción

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  usuario: User | null = null;
  rol: string | null = null;
  
  // 1. Definimos la variable que falta
  peticionesCount: number = 0;
  private peticionesSub?: Subscription;

  ngOnInit(): void {
    // Suscripción al usuario
    this.firebase.usuario$.subscribe(u => {
      this.usuario = u;
      this.cdr.detectChanges();
    });

    // Suscripción al rol
    this.firebase.rol$.subscribe(r => {
      this.rol = r;
      
      // 2. Si el usuario es admin, empezamos a contar peticiones
      if (r === 'admin') {
        this.escucharPeticiones();
      } else {
        this.peticionesSub?.unsubscribe();
        this.peticionesCount = 0;
      }
      
      this.cdr.detectChanges();
    });
  }

  // 3. Método para escuchar el conteo en tiempo real
  escucharPeticiones() {
    this.peticionesSub = this.firebase.obtenerPeticiones().subscribe({
      next: (peticiones) => {
        this.peticionesCount = peticiones.length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error contando peticiones:', err)
    });
  }

  // Limpieza al destruir el componente
  ngOnDestroy() {
    this.peticionesSub?.unsubscribe();
  }
}