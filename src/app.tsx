import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { AgentFeedback } from "@runablehq/website-runtime";
import { AppProviders } from "src/core/providers/AppProviders";
import { appRoutes } from "src/core/routing/app.routes";

function ScrollToTopOnRouteChange() {
	const [location] = useLocation();

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
