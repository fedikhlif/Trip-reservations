import { createBrowserRouter } from "react-router";
import Layout from "../components/Layout";
import AdminPage from "../pages/AdminPage";
import DashboardPage from "../pages/DashboardPage";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import PaymentPage from "../pages/PaymentPage";
import ReservationsPage from "../pages/ReservationsPage";
import TripDetailsPage from "../pages/TripDetailsPage";
import TripsPage from "../pages/TripsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "trips", Component: TripsPage },
      { path: "trips/:tripId", Component: TripDetailsPage },
      { path: "reservations", Component: ReservationsPage },
      { path: "payment/:reservationId", Component: PaymentPage },
      { path: "dashboard", Component: DashboardPage },
      { path: "admin", Component: AdminPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
