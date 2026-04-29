import { Switch, Route, useLocation, Redirect } from "wouter";
import DashboardBookingsShell from "src/components/dashboard/DashboardBookingsShell";
import type { BookingsShellActive } from "src/components/dashboard/DashboardBookingsShell";
import { DashboardBookingsListTab } from "./DashboardBookings";
import { DashboardBookingsPackageTab } from "./DashboardBookingsPackage";
import { DashboardBookingsPracticalTab } from "./DashboardBookingsPractical";
import { DashboardBookingsTheoryPersonalTab } from "./DashboardBookingsTheoryPersonal";
import { DashboardBookingsTheoryGroupTab } from "./DashboardBookingsTheoryGroup";

function bookingsActiveFromNestedPath(path: string): BookingsShellActive {
  const p = path.split("?")[0] || "/";
  if (p === "/package") return "package";
  if (p === "/practical") return "practical";
  if (p === "/theory-personal") return "theory-personal";
  if (p === "/theory-group") return "theory-group";
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
        <Route path="/theory-personal">
          <DashboardBookingsTheoryPersonalTab />
        </Route>
        <Route path="/theory-group">
          <DashboardBookingsTheoryGroupTab />
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
