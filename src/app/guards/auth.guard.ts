import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { FirebaseService } from "../services/firebase.service";
import { filter, map, take } from "rxjs/operators";

export const authGuard: CanActivateFn = () => {
  const firebase = inject(FirebaseService);
  const router = inject(Router);

  const expiry = localStorage.getItem('sessionExpiry');
  if (!expiry || Date.now() > Number(expiry)) {
    localStorage.removeItem('sessionExpiry');
    firebase.cerrarSesion();
    router.navigate(['/login']);
    return false;
  }

  return firebase.usuario$.pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => {
      if (user) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};