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
  await new Promise(resolve => setTimeout(resolve, 300)); // pequeña espera
  this.router.navigate(['/']);
}
}