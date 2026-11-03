import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'An unexpected error occurred. Please try again.';
  }

  if (!environment.production) {
    console.warn('[TOUR API]', {
      status: error.status,
      url: error.url?.split('?')[0],
      statusText: error.statusText,
    });
  }

  if (typeof error.error?.error === 'string') {
    return error.error.error;
  }

  if (error.status === 0) {
    return 'The server is unreachable. Make sure it is running, then try again.';
  }
  if (error.status === 200) {
    return 'The server returned an unreadable response. Check the API configuration.';
  }
  if (error.status === 400) {
    return 'The submitted information is invalid. Check the fields and try again.';
  }
  if (error.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (error.status === 403) {
    return "You are not authorised to perform this action.";
  }
  if (error.status === 404) {
    return 'This resource no longer exists. Refresh the page.';
  }
  if (error.status === 409) {
    return 'Seat availability has changed. Run your search again.';
  }
  if (error.status >= 500) {
    return 'The service is temporarily unavailable. Please try again later.';
  }
  return 'The request failed. Please try again.';
}
