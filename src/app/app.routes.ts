import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Inicio } from './inicio/inicio';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'login', component: Login }
];
