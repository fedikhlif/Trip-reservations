import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }

  if (!environment.production) {
    console.warn('[TOUR API]', {
      status: error.status,
      url: error.url?.split('?')[0],
      statusText: error.statusText,
    });
  }

  if (error.status === 0) {
    return "Le serveur est injoignable. Vérifiez qu'il est démarré puis réessayez.";
  }
  if (error.status === 200) {
    return 'Le serveur a renvoyé une réponse illisible. Vérifiez la configuration de l’API.';
  }
  if (error.status === 400) {
    return 'Les informations saisies ne sont pas valides. Vérifiez les champs et réessayez.';
  }
  if (error.status === 401) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }
  if (error.status === 403) {
    return "Vous n'êtes pas autorisé à effectuer cette action.";
  }
  if (error.status === 404) {
    return "Cette ressource n'existe plus. Actualisez la page.";
  }
  if (error.status === 409) {
    return "Le nombre de places disponibles a changé. Relancez la recherche.";
  }
  if (error.status >= 500) {
    return 'Le service est momentanément indisponible. Veuillez réessayer plus tard.';
  }
  return 'La requête a échoué. Veuillez réessayer.';
}
