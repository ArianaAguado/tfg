import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {  
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  usuario: User | null = null;
  rol: string | null = null;
  peticionesCount = 0;
  private peticionesSub?: Subscription;

  ngOnInit(): void {
    this.firebase.usuario$.subscribe(u => {
      this.usuario = u;
      this.cdr.detectChanges();
    });

    this.firebase.rol$.subscribe(r => {
      this.rol = r;

      if (r === 'admin') {
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