import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-btn-cerrar-sesion',
  standalone: true,
  templateUrl: './cerrar-sesion.html',
  styleUrl: './cerrar-sesion.css',
})
export class BtnCerrarSesion {
  private firebase = inject(FirebaseService);
  private router = inject(Router);

  async cerrarSesion() {
    await this.firebase.cerrarSesion();
    this.router.navigate(['/']);
  }
}