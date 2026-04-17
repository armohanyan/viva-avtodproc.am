import { Switch, Route, useLocation, Redirect } from "wouter";
import DashboardBookingsShell from "src/components/dashboard/DashboardBookingsShell";
import type { BookingsShellActive } from "src/components/dashboard/DashboardBookingsShell";
import { DashboardBookingsListTab } from "./DashboardBookings";
import { DashboardBookingsPackageTab } from "./DashboardBookingsPackage";
import { DashboardBookingsPracticalTab } from "./DashboardBookingsPractical";

function bookingsActiveFromNestedPath(path: string): BookingsShellActive {
  const p = path.split("?")[0] || "/";
  if (p === "/package") return "package";
  if (p === "/practical") return "practical";
  return "home";
}

/**
 * Parent route for `/dashboard/bookings` (wouter `nest` in app routes).
 * Child segments `/package` and `/practical` are nested under this section.
 */
export default function DashboardBookingsOutlet() {
  const [loc] = useLocation();
  const active = bookingsActiveFromNestedPath(loc);

  return (
    <DashboardBookingsShell active={active}>
      <Switch>
        <Route path="/package">
          <DashboardBookingsPackageTab />
        </Route>
        <Route path="/practical">
          <DashboardBookingsPracticalTab />
        </Route>
        <Route path="/">
          <DashboardBookingsListTab />
        </Route>
        <Route path="*">
          <Redirect to="/" />
        </Route>
      </Switch>
    </DashboardBookingsShell>
  );
}
