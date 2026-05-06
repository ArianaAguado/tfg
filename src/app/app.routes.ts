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

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {
    path: 'dashboard',
    component: Dashboard,
    children: [
      { path: '', redirectTo: 'calendario', pathMatch: 'full' },
      { path: 'calendario', component: Calendario },
      { path: 'perfil', component: Perfil },
      { path: 'biblioteca', component: Biblioteca },
      { path: 'crear-juegos', component: CrearJuegosComponent },
      { path: 'peticiones', component: PeticionesJuegosComponent },  
      { path: 'proponer-juego', component: ProponerJuegoComponent },
    ]
  },
];