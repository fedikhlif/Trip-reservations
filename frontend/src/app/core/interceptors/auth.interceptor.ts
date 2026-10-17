import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Provides a uniform French error structure for all HTTP calls.
 * Only adds Content-Type on requests that have a body (POST/PUT/PATCH)
 * to avoid unnecessary CORS preflight on GET requests.
 *
 * NOTE: No auth token is used in this demo system (the backend uses a
 * hard-coded demo customer). Add Bearer token injection here when
 * authentication is wired up.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only set Content-Type on requests with a body to avoid CORS preflight on GETs
  const needsContentType = ['POST', 'PUT', 'PATCH'].includes(req.method);
  const cloned = needsContentType
    ? req.clone({ setHeaders: { 'Content-Type': 'application/json' }, withCredentials: false })
    : req.clone({ withCredentials: false });

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      let message: string;

      if (err.status === 0) {
        // Network error — server unreachable
        message = 'Impossible de contacter le serveur. Vérifiez que le backend Flask est démarré sur le port 8082.';
      } else if (err.status === 400) {
        message = err.error?.error ?? 'Données invalides. Veuillez vérifier les champs du formulaire.';
      } else if (err.status === 401) {
        message = 'Accès refusé. Veuillez vous authentifier.';
      } else if (err.status === 403) {
        message = err.error?.error ?? 'Action non autorisée.';
      } else if (err.status === 404) {
        message = err.error?.error ?? 'Ressource introuvable.';
      } else if (err.status === 409) {
        message = err.error?.error ?? 'Conflit de réservation. La demande ne peut pas être traitée.';
      } else if (err.status === 503) {
        message = 'Base de données indisponible. Vérifiez la configuration MySQL et les migrations Alembic.';
      } else if (err.status >= 500) {
        message = err.error?.error ?? 'Erreur serveur. Veuillez réessayer ultérieurement.';
      } else {
        message = err.error?.error ?? err.message ?? 'La requête a échoué. Veuillez réessayer.';
      }

      console.error(`[HTTP ${err.status}]`, err.url, err.error ?? err.message);
      return throwError(() => new Error(message));
    })
  );
};
