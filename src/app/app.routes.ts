import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register'; 
import { Dashboard } from './components/dashboard/dashboard';


export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {path: 'dashboard', component: Dashboard}

];