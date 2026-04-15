import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "src/components/ui/sheet";
import { Button } from "src/components/ui/button";
import { Menu } from "lucide-react";
import { useLang } from "src/lib/i18n";

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
	card: "w-[min(20rem,86vw)] p-0",
	hero: "w-[min(20rem,86vw)] p-0 bg-hero",
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
							<SheetContent side="left" className={sheetClass[sidebarSurface]}>
								<div className="h-full pt-12 flex flex-col min-h-0">{renderSidebar(ctx)}</div>
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
