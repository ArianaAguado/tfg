import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Routes } from '@angular/router';

// 1. Importaciones necesarias de Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// 2. Importa tu configuración de entorno
import { environment } from '../environments/environments'; 
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(),

    // 3. Inicialización de Firebase con tu objeto de entorno
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),

    // 4. Proveedores de servicios
    provideAuth(() => getAuth()),           
    provideFirestore(() => getFirestore())  
  ],
};