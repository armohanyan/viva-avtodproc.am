import { useEffect, useRef, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import type { Lang } from "src/lib/i18n";

type CredentialHandler = (credential: string) => void;

type GoogleId = {
	initialize: (config: {
		client_id: string;
		callback: (response: { credential?: string }) => void;
		auto_select: boolean;
		cancel_on_tap_outside: boolean;
		use_fedcm_for_prompt: boolean;
		ux_mode: "popup";
	}) => void;
	renderButton: (
		parent: HTMLElement,
		options: {
			type: "standard";
			theme: "outline";
			size: "large";
			text: "continue_with";
			shape: "rectangular";
			width: number;
			logo_alignment: "left";
		},
	) => void;
};

declare global {
	interface Window {
		google?: { accounts: { id: GoogleId } };
	}
}

let scriptPromise: Promise<void> | null = null;
let clientIdPromise: Promise<string> | null = null;
let initializedFor: string | null = null;
let credentialHandler: CredentialHandler | null = null;

function googleLocale(lang: Lang): string {
	if (lang === "am") return "hy";
	if (lang === "ru") return "ru";
	return "en";
}

function loadGoogleScript(lang: Lang): Promise<void> {
	if (window.google?.accounts?.id) return Promise.resolve();
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://accounts.google.com/gsi/client?hl=${googleLocale(lang)}`;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => {
			scriptPromise = null;
			reject(new Error("Google sign-in failed to load"));
		};
		document.head.appendChild(script);
	});
	return scriptPromise;
}

function loadClientId(): Promise<string> {
	if (!clientIdPromise) {
		clientIdPromise = vivaApiJson<{ clientId: string }>("/auth/oauth/google/client")
			.then((data) => data.clientId)
			.catch((error: unknown) => {
				clientIdPromise = null;
				throw error;
			});
	}
	return clientIdPromise;
}

function ensureGoogleInit(clientId: string): void {
	const googleId = window.google?.accounts?.id;
	if (!googleId) throw new Error("Google sign-in failed to load");
	if (initializedFor === clientId) return;
	googleId.initialize({
		client_id: clientId,
		callback: (response) => {
			if (response.credential) credentialHandler?.(response.credential);
		},
		auto_select: false,
		cancel_on_tap_outside: true,
		use_fedcm_for_prompt: false,
		ux_mode: "popup",
	});
	initializedFor = clientId;
}

type Props = {
	active: boolean;
	lang: Lang;
	disabled?: boolean;
	unavailableLabel: string;
	onCredential: CredentialHandler;
};

/**
 * Official Sign in with Google button.
 * This returns an ID token in the page. It does not open the OAuth consent
 * screen that was stuck loading on accounts.google.com.
 */
export default function GoogleSignInButton({ active, lang, disabled, unavailableLabel, onCredential }: Props) {
	const hostRef = useRef<HTMLDivElement>(null);
	const [failed, setFailed] = useState(false);
	const onCredentialRef = useRef(onCredential);
	onCredentialRef.current = onCredential;

	useEffect(() => {
		credentialHandler = (credential) => onCredentialRef.current(credential);
	}, []);

	useEffect(() => {
		const host = hostRef.current;
		if (!active || !host) return;
		let cancelled = false;
		setFailed(false);

		void (async () => {
			try {
				const clientId = await loadClientId();
				await loadGoogleScript(lang);
				if (cancelled || !hostRef.current) return;
				ensureGoogleInit(clientId);
				const parent = hostRef.current;
				parent.replaceChildren();
				const width = Math.max(200, Math.min(400, Math.floor(parent.clientWidth || 320)));
				window.google?.accounts.id.renderButton(parent, {
					type: "standard",
					theme: "outline",
					size: "large",
					text: "continue_with",
					shape: "rectangular",
					width,
					logo_alignment: "left",
				});
			} catch {
				if (!cancelled) setFailed(true);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [active, lang]);

	return (
		<div className="relative min-h-11">
			<div ref={hostRef} className="flex min-h-11 w-full justify-center" />
			{failed ? <p className="text-center text-sm text-destructive">{unavailableLabel}</p> : null}
			{disabled ? <div className="absolute inset-0 z-10 cursor-not-allowed bg-background/40" /> : null}
		</div>
	);
}
