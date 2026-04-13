import { useEffect, type ComponentType } from "react";
import { Route, Switch } from "wouter";
import { AgentFeedback } from "@runablehq/website-runtime";
import { AppProviders } from "src/core/providers/AppProviders";
import { ProtectedRoute } from "src/core/routing/ProtectedRoute";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { appRoutes } from "src/core/routing/app.routes";
import type { AppRoute } from "src/shared/types/router.types";
import RedirectToMarketing from "src/pages/RedirectToMarketing";

const guardedByPath = new Map<string, ComponentType>();

function componentForRoute(route: AppRoute): ComponentType {
	let G = guardedByPath.get(route.path);
	if (!G) {
		const Inner = route.component;
		G = function GuardedAppRoute() {
			return <ProtectedRoute allowedAccountTypes={route.allowedAccountTypes} component={Inner} />;
		};
		G.displayName = `Guarded(${route.path})`;
		guardedByPath.set(route.path, G);
	}
	return G;
}

function ScrollToTopOnRouteChange() {
	const { pathname: location } = useAppNavigation();

	useEffect(() => {
		// Wouter navigation doesn't automatically reset scroll position in SPAs.
		// Reset to top so the user doesn't land at the previous page's bottom.
		window.scrollTo(0, 0);
	}, [location]);

	return null;
}

function AnimatedRoutes() {
	return (
		<Switch>
			{appRoutes.map((route) => (
				<Route key={route.path} path={route.path} component={componentForRoute(route)} />
			))}
			<Route>
				<RedirectToMarketing />
			</Route>
		</Switch>
	);
}

function App() {
  return (
    <AppProviders>
			<ScrollToTopOnRouteChange />
			<AnimatedRoutes />

      {import.meta.env.DEV && <AgentFeedback />}
    </AppProviders>
  );
}

export default App;
