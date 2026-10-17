import { RouterProvider } from "react-router";
import { ReservationProvider } from "./app/ReservationContext";
import { router } from "./app/routes";

export default function App() {
  return (
    <ReservationProvider>
      <RouterProvider router={router} />
    </ReservationProvider>
  );
}
