import { Destination, Payment, Reservation, Trip } from '../../shared/models';

export const TRIPS: Trip[] = [
  { id: 1, destinationId: 1, title: 'Échappée sur la côte amalfitaine', location: 'Amalfi', country: 'Italie', category: 'Mer', date: '18 sept. 2025', duration: 7, price: 2480, seats: 6, rating: 4.9, image: 'https://images.unsplash.com/photo-1533656338503-b22f63e96cd8?auto=format&fit=crop&w=1400&q=84', description: 'Un voyage baigné de soleil entre villages suspendus, criques secrètes et saveurs du sud de l’Italie.', highlights: ['Croisière côtière privée', 'Atelier de cuisine locale', 'Hébergements avec vue sur mer'] },
  { id: 2, destinationId: 2, title: 'Lacs et sommets alpins', location: 'Kandersteg', country: 'Suisse', category: 'Montagne', date: '5 oct. 2025', duration: 6, price: 2890, seats: 4, rating: 4.8, image: 'https://images.unsplash.com/photo-1527095655060-4026c4af2b25?auto=format&fit=crop&w=1400&q=84', description: 'Prenez le temps au cœur des lacs turquoise, vallées fleuries et sommets enneigés.', highlights: ['Train panoramique', 'Randonnée alpine guidée', 'Dîner dans un chalet'] },
  { id: 3, destinationId: 3, title: 'Histoires du lac de Brienz', location: 'Iseltwald', country: 'Suisse', category: 'Culture', date: '21 oct. 2025', duration: 5, price: 1950, seats: 9, rating: 4.7, image: 'https://images.unsplash.com/photo-1528493366314-e317cd98dd52?auto=format&fit=crop&w=1400&q=84', description: 'Explorez des villages de conte et des traditions créatives au bord d’un lac spectaculaire.', highlights: ['Visite du village historique', 'Traversée en bateau à vapeur', 'Rencontre avec des artisans'] },
  { id: 4, destinationId: 4, title: 'Rêverie méditerranéenne', location: 'Costa Brava', country: 'Espagne', category: 'Mer', date: '2 nov. 2025', duration: 8, price: 2675, seats: 11, rating: 4.9, image: 'https://images.unsplash.com/photo-1760853708334-d8da4ebe4281?auto=format&fit=crop&w=1400&q=84', description: 'Criques préservées, villages côtiers et gastronomie catalane dans un voyage sans effort.', highlights: ['Kayak dans les criques', 'Déjeuner au domaine', 'Hôtel design en bord de mer'] },
  { id: 5, destinationId: 5, title: 'Les Dolomites en automne', location: 'Tyrol du Sud', country: 'Italie', category: 'Montagne', date: '12 oct. 2025', duration: 7, price: 2350, seats: 3, rating: 4.8, image: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=1400&q=84', description: 'Mélèzes dorés, sommets cinématographiques et chaleureuse hospitalité italienne.', highlights: ['Marche au lever du soleil', 'Dîners de la ferme à la table', 'Auberges historiques'] },
  { id: 6, destinationId: 1, title: 'Week-end à Positano', location: 'Positano', country: 'Italie', category: 'Mer', date: '27 sept. 2025', duration: 4, price: 1720, seats: 8, rating: 4.6, image: 'https://images.unsplash.com/photo-1626628193008-fa2852153d79?auto=format&fit=crop&w=1400&q=84', description: 'Un long week-end de vues sur mer, terrasses élégantes et cuisine inoubliable.', highlights: ['Sortie en bateau au coucher du soleil', 'Sentier des Dieux', 'Dîner à la table du chef'] },
];

export const INITIAL_RESERVATIONS: Reservation[] = [
  { id: 'RSV-2048', tripId: 1, customerId: 1, customer: 'Maya Bennett', guests: 2, bookedOn: '14 juil. 2025', status: 'Confirmée', paymentStatus: 'Payé', total: 4960 },
  { id: 'RSV-2131', tripId: 2, customerId: 1, customer: 'Maya Bennett', guests: 1, bookedOn: '22 juil. 2025', status: 'En attente', paymentStatus: 'En attente', total: 2890 },
];

export const DESTINATIONS: Destination[] = [
  { id: 1, name: 'Côte amalfitaine', country: 'Italie', category: 'Mer', imageUrl: TRIPS[0].image, description: 'Villages colorés, eaux azur et cuisine du sud.' },
  { id: 2, name: 'Alpes suisses', country: 'Suisse', category: 'Montagne', imageUrl: TRIPS[1].image, description: 'Lacs glaciaires et panoramas spectaculaires.' },
  { id: 3, name: 'Lac de Brienz', country: 'Suisse', category: 'Culture', imageUrl: TRIPS[2].image, description: 'Patrimoine, artisanat et villages paisibles.' },
  { id: 4, name: 'Costa Brava', country: 'Espagne', category: 'Mer', imageUrl: TRIPS[3].image, description: 'Criques secrètes et art de vivre catalan.' },
  { id: 5, name: 'Dolomites', country: 'Italie', category: 'Montagne', imageUrl: TRIPS[4].image, description: 'Sommets vertigineux et hospitalité alpine.' },
];

export const PAYMENTS: Payment[] = [
  { id: 'PAY-1001', reservationId: 'RSV-2048', amount: 4960, status: 'Payé', method: 'Carte', paidAt: '14 juil. 2025' },
  { id: 'PAY-1002', reservationId: 'RSV-2131', amount: 2890, status: 'En attente' },
];
