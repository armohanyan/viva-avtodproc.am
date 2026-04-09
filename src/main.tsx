import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { WouterAppNavigationProvider } from "src/lib/navigation/WouterAppNavigationProvider";
import "./styles.css";
import App from "./app.tsx";
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Router>
			<WouterAppNavigationProvider>
				<App />
			</WouterAppNavigationProvider>
		</Router>
	</StrictMode>,
);
