# Trip Reservation System — Frontend Angular

Frontend Angular 20 autonome pour l’application de réservation de voyages. Le backend Python n’est pas inclus dans ce workspace et n’a pas été déplacé, supprimé ou modifié.

## Prérequis

- Node.js 20 ou supérieur
- npm 10 ou supérieur

## Installation et démarrage

```bash
cd frontend
npm install
npm start
```

L’application est ensuite disponible sur `http://localhost:4200`.

Compilation de production :

```bash
npm run build
```

Les fichiers générés se trouvent dans `dist/trip_reservation_frontend_angular/`.

## Architecture

```text
frontend/
├── angular.json
├── package.json
├── package-lock.json
├── public/
└── src/
    ├── app/
    │   ├── core/
    │   │   ├── data/            # Données de démonstration
    │   │   ├── guards/          # Authentification et rôle administrateur
    │   │   ├── interceptors/    # Jeton Bearer pour les futures requêtes
    │   │   └── services/        # API, auth, voyages, destinations, réservations, paiements
    │   ├── shared/
    │   │   ├── components/      # Navigation, footer, cartes et filtres
    │   │   └── models/          # Modèles TypeScript métier
    │   ├── features/
    │   │   ├── admin-dashboard/
    │   │   ├── auth/
    │   │   ├── customer-dashboard/
    │   │   ├── destinations/
    │   │   ├── home/
    │   │   ├── payments/
    │   │   ├── reservations/
    │   │   └── trips/
    │   ├── app.component.ts
    │   ├── app.component.html
    │   ├── app.config.ts
    │   └── app.routes.ts
    ├── environments/
    ├── index.html
    ├── main.ts
    └── styles.scss
```

Tous les composants sont standalone. Les formulaires de recherche, connexion, réservation et administration utilisent Reactive Forms.

## Routes

| Route | Fonction | Protection |
| --- | --- | --- |
| `/` | Accueil | Publique |
| `/trips` | Recherche et filtres | Publique |
| `/trips/:id` | Détails et réservation | Publique |
| `/destinations` | Catalogue des destinations | Publique |
| `/auth/login` | Connexion de démonstration | Publique |
| `/reservations` | Gestion des réservations | `authGuard` |
| `/payment/:id` | État du paiement | `authGuard` |
| `/dashboard` | Espace client | `authGuard` |
| `/admin` | Espace administrateur | `adminGuard` |

La connexion est simulée. Choisissez un profil client ou administrateur sur l’écran de connexion. Les autorisations réelles devront toujours être validées par le backend.

## Configuration API

Développement :

```text
src/environments/environment.ts
```

Production :

```text
src/environments/environment.prod.ts
```

Configuration actuelle :

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api',
  useMockData: true,
};
```

Le frontend ne se connecte jamais directement à MySQL. `ApiService` utilise uniquement l’API HTTP du backend Python.

Tant que les endpoints ne sont pas disponibles, conservez `useMockData: true`. Les services choisissent alors les données locales. Lorsque l’API est prête, passez cette valeur à `false` et adaptez les contrats de réponse aux modèles du backend.

## Contrat API à prévoir

Les routes ci-dessous sont une proposition de contrat, pas des endpoints supposés existants :

- Authentification : `POST /auth/login`, `GET /auth/me`
- Voyages : `GET /trips`, `GET /trips/{id}`, `POST /trips`, `PATCH /trips/{id}`
- Destinations : `GET /destinations`, `GET /destinations/{id}`
- Clients : `GET /customers/{id}`, `PATCH /customers/{id}`
- Réservations : `GET /reservations`, `GET /reservations/{id}`, `POST /reservations`, `PATCH /reservations/{id}`
- Annulation : `POST /reservations/{id}/cancel`
- Paiements : `GET /reservations/{id}/payment`, `POST /payments`

Le backend devra autoriser `http://localhost:4200` dans sa configuration CORS pendant le développement.
