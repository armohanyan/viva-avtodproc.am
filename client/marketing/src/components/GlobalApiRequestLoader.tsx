"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from "react";
import {
	getGlobalApiRequestLoadingSnapshot,
	subscribeGlobalApiRequestLoading,
} from "src/lib/globalApiRequestLoading";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 280;

/**
 * Thin indeterminate bar at the top of the viewport while API requests are in flight.
 * Shown only after a short delay so fast requests do not flash the UI; stays briefly visible
 * after the last request so the bar does not blink on quick bursts.
 */
export function GlobalApiRequestLoader(): ReactElement | null {
	const loading = useSyncExternalStore(
		subscribeGlobalApiRequestLoading,
		getGlobalApiRequestLoadingSnapshot,
		() => false,
	);

	const [visible, setVisible] = useState(false);
	const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const shownAt = useRef<number | null>(null);

	useEffect(() => {
		if (loading) {
			if (hideTimer.current) {
				clearTimeout(hideTimer.current);
				hideTimer.current = null;
			}
			if (visible) {
				return undefined;
			}
			if (showTimer.current) clearTimeout(showTimer.current);
			showTimer.current = setTimeout(() => {
				showTimer.current = null;
				shownAt.current = Date.now();
				setVisible(true);
			}, SHOW_DELAY_MS);
			return () => {
				if (showTimer.current) {
					clearTimeout(showTimer.current);
					showTimer.current = null;
				}
			};
		}

		if (showTimer.current) {
			clearTimeout(showTimer.current);
			showTimer.current = null;
		}

		if (!visible) {
			shownAt.current = null;
			return undefined;
		}

		const started = shownAt.current ?? Date.now();
		const elapsed = Date.now() - started;
		const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
		hideTimer.current = setTimeout(() => {
			hideTimer.current = null;
			shownAt.current = null;
			setVisible(false);
		}, wait);
		return () => {
			if (hideTimer.current) {
				clearTimeout(hideTimer.current);
				hideTimer.current = null;
			}
		};
	}, [loading, visible]);

	if (!visible) return null;

	return (
		<div
			className="pointer-events-none fixed inset-x-0 top-0 z-[10050] h-[3px] overflow-hidden bg-primary/15"
			role="progressbar"
			aria-valuetext="Loading"
			aria-busy="true"
		>
			<div className="viva-global-api-loader__bar h-full w-[42%] rounded-r-sm bg-primary shadow-[0_0_12px_rgba(244,134,51,0.55)]" />
		</div>
	);
}
