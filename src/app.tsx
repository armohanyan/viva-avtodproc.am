import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { AgentFeedback } from "@runablehq/website-runtime";
import { AppProviders } from "src/core/providers/AppProviders";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { appRoutes } from "src/core/routing/app.routes";
import RedirectToMarketing from "src/pages/RedirectToMarketing";

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
				<Route key={route.path} path={route.path} component={route.component} />
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
