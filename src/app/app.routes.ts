import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Calendario } from './components/calendario/calendario';
import { Perfil } from './components/perfil/perfil';
import { Biblioteca } from './components/biblioteca/biblioteca';
import { CrearJuegosComponent } from './components/crearjuegos/crearjuegos';
import { PeticionesJuegosComponent } from './components/peticionesjuegos/peticionesjuegos';
import { ProponerJuegoComponent } from './components/proponerjuego/proponerjuego';
import { DetalleJuego } from './components/detalle-juego/detalle-juego';
import { PerfilPublico } from './components/perfil-publico/perfil-publico';
import { Amigos } from './components/amigos/amigos';
import { SoporteComponent } from './components/soporte/soporte';
import { AdminSoporteComponent } from './components/admin-soporte/admin-soporte';
import { AdminPanelComponent } from './components/admin-panel.component/admin-panel.component';
import { EstadisticasComponent } from './components/estadisticas.component/estadisticas.component';
import { authGuard } from './guards/auth.guard';
import { SoporteComponent } from './components/soporte/soporte';
import { AdminSoporteComponent } from './components/admin-soporte/admin-soporte';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'calendario', pathMatch: 'full' },
      { path: 'calendario', component: Calendario },
      { path: 'perfil', component: Perfil },
      { path: 'biblioteca', component: Biblioteca },
      { path: 'amigos', component: Amigos },
      { path: 'usuario/:uid', component: PerfilPublico },
      { path: 'crear-juegos', component: CrearJuegosComponent },
      { path: 'peticiones', component: PeticionesJuegosComponent },
      { path: 'proponer-juego', component: ProponerJuegoComponent },
      { path: 'juego/:slug', component: DetalleJuego },
      { path: 'juego-custom', component: DetalleJuego },
      { path: 'soporte', component: SoporteComponent },
      { path: 'admin-soporte', component: AdminSoporteComponent },
    ]
  },
];