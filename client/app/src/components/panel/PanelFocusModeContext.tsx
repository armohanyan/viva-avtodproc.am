import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { useLocation, useRouter } from "wouter";
import { fullBrowserPathFromRouter } from "src/lib/wouterFullPath";

export type PanelFocusModeContextValue = {
	active: boolean;
	setActive: (active: boolean) => void;
	toggle: () => void;
};

const PanelFocusModeContext = createContext<PanelFocusModeContextValue | null>(null);

function isStudentQuizPath(location: string): boolean {
	return /\/quiz\/[^/?#]+/.test(location);
}

export function PanelFocusModeProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [locRelative] = useLocation();
	const location = useMemo(
		() => fullBrowserPathFromRouter(router, locRelative),
		[router, locRelative],
	);
	const [active, setActive] = useState(false);

	const toggle = useCallback(() => setActive((v) => !v), []);

	useEffect(() => {
		if (!isStudentQuizPath(location)) {
			setActive(false);
		}
	}, [location]);

	const value = useMemo(
		(): PanelFocusModeContextValue => ({
			active,
			setActive,
			toggle,
		}),
		[active, toggle],
	);

	return <PanelFocusModeContext.Provider value={value}>{children}</PanelFocusModeContext.Provider>;
}

export function usePanelFocusMode(): PanelFocusModeContextValue {
	const ctx = useContext(PanelFocusModeContext);
	if (!ctx) {
		throw new Error("usePanelFocusMode must be used within PanelFocusModeProvider");
	}
	return ctx;
}

export function useOptionalPanelFocusMode(): PanelFocusModeContextValue | null {
	return useContext(PanelFocusModeContext);
}

/** Restores sidebar/header when the quiz page unmounts. */
export function usePanelFocusModeCleanupOnUnmount(): void {
	const { setActive } = usePanelFocusMode();
	useEffect(() => {
		return () => setActive(false);
	}, [setActive]);
}
