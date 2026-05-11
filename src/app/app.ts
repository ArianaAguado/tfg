import { Component, EnvironmentInjector, inject, OnInit, runInInjectionContext, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Auth, getRedirectResult } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('mi-proyecto-tfg');

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  // Necesitamos el EnvironmentInjector para poder envolver las llamadas
  // a Firebase que ocurren después de un await. Sin esto, @angular/fire
  // pierde el contexto de inyección y se queja con "Calling Firebase APIs
  // outside of an Injection context", lo que en signInWithRedirect provoca
  // que getRedirectResult no procese bien la sesión y nos quedemos en /login.
  private injector = inject(EnvironmentInjector);

  async ngOnInit() {
    // getRedirectResult tiene que ejecutarse al arrancar la app porque
    // cuando Google redirige de vuelta tras signInWithRedirect, el usuario
    // aterriza en la URL raíz ('/'), no en /login.
    try {
      // runInInjectionContext mantiene el contexto de Angular a través de
      // los awaits. Todas las llamadas a Firebase deben ir dentro.
      const credenciales = await runInInjectionContext(this.injector, () =>
        getRedirectResult(this.auth)
      );

      if (credenciales?.user) {
        const user = credenciales.user;

        // Crear documento en Firestore si es la primera vez con Google.
        const docRef = await runInInjectionContext(this.injector, () =>
          doc(this.firestore, 'usuarios', user.uid)
        );
        const snap = await runInInjectionContext(this.injector, () =>
          getDoc(docRef)
        );

        if (!snap.exists()) {
          await runInInjectionContext(this.injector, () =>
            setDoc(docRef, {
              uid: user.uid,
              nombre: user.displayName ?? '',
              email: user.email,
              rol: 'usuario',
              fechaRegistro: new Date().toISOString()
            })
          );
        }

        localStorage.setItem('sessionExpiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Error procesando redirect de Google:', error);
    }
  }
}