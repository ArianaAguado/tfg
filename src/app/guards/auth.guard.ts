import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { FirebaseService } from "../services/firebase.service";
import { filter, map, take } from "rxjs/operators";
import { of } from "rxjs";

export const authGuard: CanActivateFn = () => {
  const firebase = inject(FirebaseService);
  const router = inject(Router);

  const usuarioInmediato = firebase.usuarioActual;

  const fuente$ = usuarioInmediato !== null
    ? of(usuarioInmediato)
    : firebase.usuario$.pipe(
        filter(user => user !== undefined),
        take(1)
      );

  return fuente$.pipe(
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      const expiry = localStorage.getItem('sessionExpiry');
      if (expiry && Date.now() > Number(expiry)) {
        localStorage.removeItem('sessionExpiry');
        firebase.cerrarSesion();
        router.navigate(['/login']);
        return false;
      }

      return true;
    })
  );
};