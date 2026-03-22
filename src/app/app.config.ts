import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

// 1. Importaciones necesarias de Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// 2. Importa tu configuración de entorno
import { environment } from '../environments/environments'; 

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), 
    provideRouter(routes),

    // 3. Inicialización de Firebase
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),

    // 4. Proveedores de servicios específicos
    provideAuth(() => getAuth()),       // Para el login de usuariosvale, 
    provideFirestore(() => getFirestore()) // Para guardar los eventos del calendario
  ],
};