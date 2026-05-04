import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "src/components/ui/sheet";
import { Button } from "src/components/ui/button";
import { Menu, X } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

export type PanelShellSidebarContext = {
	/** Close the mobile drawer after navigation. */
	closeMobileNav: () => void;
};

export type PanelShellProps = {
	children: ReactNode;
	/** Rendered in desktop aside and mobile sheet (separate React trees). */
	renderSidebar: (ctx: PanelShellSidebarContext) => ReactNode;
	headerTitle: ReactNode;
	/** Static node, or a function so actions (e.g. profile link) can close the mobile drawer. */
	headerTrailing: ReactNode | ((ctx: PanelShellSidebarContext) => ReactNode);
	/** Matches existing admin (hero) vs student/instructor (card) chrome. */
	sidebarSurface?: "card" | "hero";
};

const asideClass: Record<NonNullable<PanelShellProps["sidebarSurface"]>, string> = {
	card: "hidden lg:flex w-64 shrink-0 fixed inset-y-0 left-0 z-30 border-r border-border bg-card flex-col",
	hero: "hidden lg:flex w-64 shrink-0 fixed inset-y-0 left-0 z-30 border-r border-border bg-hero flex-col",
};

const sheetClass: Record<NonNullable<PanelShellProps["sidebarSurface"]>, string> = {
	card: "w-[min(21rem,92vw)] max-w-[min(21rem,92vw)] border-r border-border bg-card p-0 gap-0",
	hero: "w-[min(21rem,92vw)] max-w-[min(21rem,92vw)] border-r border-white/10 bg-hero p-0 text-hero-foreground gap-0",
};

const mobileDrawerChrome: Record<
	NonNullable<PanelShellProps["sidebarSurface"]>,
	{ bar: string; closeClass: string }
> = {
	card: {
		bar: "border-border bg-card",
		closeClass: "text-foreground hover:bg-muted",
	},
	hero: {
		bar: "border-white/15 bg-hero",
		closeClass: "text-hero-foreground hover:bg-white/10 hover:text-hero-foreground",
	},
};

/**
 * Shared responsive shell: fixed sidebar on large screens, sheet drawer on small screens,
 * sticky header, scrollable `<main>` with scroll reset on route change.
 */
export function PanelShell({
	children,
	renderSidebar,
	headerTitle,
	headerTrailing,
	sidebarSurface = "card",
}: PanelShellProps) {
	const { t } = useLang();
	const [location] = useLocation();
	const [open, setOpen] = useState(false);
	const mainRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		mainRef.current?.scrollTo(0, 0);
	}, [location]);

	const closeMobileNav = () => setOpen(false);
	const ctx: PanelShellSidebarContext = { closeMobileNav };
	const trailing =
		typeof headerTrailing === "function" ? headerTrailing(ctx) : headerTrailing;

	return (
		<div className="flex h-[100dvh] overflow-hidden bg-background">
			<aside className={asideClass[sidebarSurface]}>{renderSidebar(ctx)}</aside>
			<div className="flex flex-col flex-1 min-w-0 min-h-0 lg:pl-64">
				<header className="bg-card border-b border-border px-3 sm:px-6 min-h-14 h-14 sm:h-16 sm:min-h-16 flex items-center justify-between gap-2 shrink-0 z-20">
					<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
						<Sheet open={open} onOpenChange={setOpen}>
							<SheetTrigger asChild className="lg:hidden shrink-0">
								<Button variant="ghost" size="icon-lg" aria-label={t("openMenu")}>
									<Menu className="h-6 w-6" />
								</Button>
							</SheetTrigger>
							<SheetContent side="left" showCloseButton={false} className={sheetClass[sidebarSurface]}>
								<SheetTitle className="sr-only">{t("mainNavigation")}</SheetTitle>
								<div
									className={cn(
										"flex h-full min-h-0 flex-col overflow-hidden",
										"pt-[env(safe-area-inset-top,0px)]",
									)}
								>
									<div
										className={cn(
											"flex shrink-0 items-center justify-end border-b px-1 pb-2 pt-1",
											mobileDrawerChrome[sidebarSurface].bar,
										)}
									>
										<Button
											type="button"
											variant="ghost"
											size="icon-lg"
											className={cn("shrink-0", mobileDrawerChrome[sidebarSurface].closeClass)}
											aria-label={t("closeMenu")}
											onClick={closeMobileNav}
										>
											<X className="h-6 w-6" aria-hidden />
										</Button>
									</div>
									<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y [&_nav_a]:flex [&_nav_a]:min-h-11 [&_nav_a]:items-center [&_nav_button]:min-h-11 [&_nav_button]:min-w-11">
										{renderSidebar(ctx)}
									</div>
								</div>
							</SheetContent>
						</Sheet>
						<h1 className="font-semibold text-foreground text-sm sm:text-base truncate min-w-0">{headerTitle}</h1>
					</div>
					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{trailing}</div>
				</header>
				<main
					ref={mainRef}
					className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
				>
					{children}
				</main>
			</div>
		</div>
	);
}
