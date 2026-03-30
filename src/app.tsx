import { Route, Switch } from "wouter";
import { AgentFeedback } from "@runablehq/website-runtime";
import { AppProviders } from "src/core/providers/AppProviders";
import { appRoutes } from "src/core/routing/app.routes";

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
			<AnimatedRoutes />

      {import.meta.env.DEV && <AgentFeedback />}
    </AppProviders>
  );
}

export default App;
