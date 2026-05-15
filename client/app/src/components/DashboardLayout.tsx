import { ReactNode, useMemo } from "react";
import { Link, useLocation, useRouter } from "wouter";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
	LayoutDashboard,
	Calendar,
	CalendarClock,
	ShoppingBag,
	CreditCard,
	User,
	BookOpen,
	LogOut,
	Settings,
	Briefcase,
	LineChart,
	CalendarDays,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { DASHBOARD_NAV_LINKS } from "src/modules/dashboard/dashboard.consts";
import { useAccount } from "src/modules/accounts";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { PanelShell } from "src/components/panel/PanelShell";
import { initialsFromName } from "src/components/panel/initialsFromName";
import { cn } from "src/lib/utils";
import { absWouterHref, fullBrowserPathFromRouter } from "src/lib/wouterFullPath";
import NotificationBell from "src/components/NotificationBell";
import { PanelFocusModeProvider } from "src/components/panel/PanelFocusModeContext";

interface Props {
	children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
	const { t } = useLang();
	const { showToast } = useToast();
	const { user, signOut } = useAccount();
	const router = useRouter();
	const [locRelative, setLocation] = useLocation();
	const location = useMemo(() => fullBrowserPathFromRouter(router, locRelative), [router, locRelative]);

	const iconByPath = {
		"/dashboard": LayoutDashboard,
		"/dashboard/learn/thematic-tests": BookOpen,
		"/dashboard/services": Briefcase,
		"/dashboard/lessons": CalendarDays,
		"/dashboard/progress": LineChart,
		"/dashboard/bookings": Calendar,
		"/dashboard/bookings/package": ShoppingBag,
		"/dashboard/bookings/practical": CalendarClock,
		"/dashboard/bookings/theory-personal": BookOpen,
		"/dashboard/bookings/theory-group": CalendarDays,
		"/dashboard/payments": CreditCard,
		"/dashboard/profile": User,
	} as const;

	type NavRow =
		| { type: "single"; href: string; label: string; icon: (typeof iconByPath)[keyof typeof iconByPath] }
		| {
				type: "group";
				href: string;
				label: string;
				icon: (typeof iconByPath)[keyof typeof iconByPath];
				children: { href: string; label: string; icon: (typeof iconByPath)[keyof typeof iconByPath] }[];
		  };

	const nav: NavRow[] = DASHBOARD_NAV_LINKS.map((link) => {
		const icon = iconByPath[link.href as keyof typeof iconByPath];

		if (link.children?.length) {
			return {
				type: "group" as const,
				href: link.href,
				label: t(link.translationKey),
				icon,
				children: link.children.map((c) => ({
					href: c.href,
					label: t(c.translationKey),
					icon: iconByPath[c.href as keyof typeof iconByPath] ?? Calendar,
				})),
			};
		}
		return { type: "single" as const, href: link.href, label: t(link.translationKey), icon: icon ?? Calendar };
	});

	const headerTitle = useMemo(() => {
		if (location.startsWith("/dashboard/learn/exam-tests") || location.startsWith("/dashboard/exam-tests")) {
			return t("dashboardLearnExamTests");
		}
		if (location.startsWith("/dashboard/learn/thematic-tests")) {
			return t("dashboardLearnThematicTests");
		}
		if (location.startsWith("/dashboard/services")) {
			return t("dashboardNavServices");
		}
		if (location.startsWith("/dashboard/lessons")) {
			return t("dashboardNavLessons");
		}
		if (location.startsWith("/dashboard/progress")) {
			return t("dashboardNavProgress");
		}
		if (location.startsWith("/dashboard/learn")) {
			return t("learn");
		}
		if (location.startsWith("/dashboard/bookings")) {
			const bookingsEntry = DASHBOARD_NAV_LINKS.find((l) => l.href === "/dashboard/bookings");
			const child = bookingsEntry?.children?.find((c) => location === c.href);
			if (child) return t(child.translationKey);
			return t("bookings");
		}
		if (location.startsWith("/dashboard/notifications")) {
			return t("notifications");
		}
		const hit = DASHBOARD_NAV_LINKS.find((l) => l.href === location);
		return hit ? t(hit.translationKey) : t("dashboard");
	}, [location, t]);

	const isNavActive = (href: string) => {
		if (href === "/dashboard/learn/thematic-tests") {
			return location.startsWith("/dashboard/learn") || location.startsWith("/dashboard/exam-tests");
		}
		return location === href;
	};

	const handleLogout = () => {
		showToast(t("logoutSuccess"), "info");
		// Leave protected routes before clearing session so `ProtectedRoute` does not send guests to `/login`.
		setLocation(absWouterHref("/"));
		signOut();
	};

	return (
		<PanelFocusModeProvider>
		<PanelShell
			sidebarSurface="card"
			headerTitle={headerTitle}
			headerTrailing={({ closeMobileNav }) => (
				<>
					<LangToggle />
					<ThemeToggle />
					<NotificationBell listHref={absWouterHref("/dashboard/notifications")} panel="student" onNavigate={closeMobileNav} />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								aria-label={t("profile")}
							>
								{user ? initialsFromName(user.name) : "?"}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel className="font-normal">
								<p className="text-sm font-medium text-foreground truncate">{user?.name ?? "—"}</p>
								<p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href={absWouterHref("/dashboard/profile")} className="cursor-pointer" onClick={() => closeMobileNav()}>
									<Settings className="w-4 h-4" />
									{t("profileSettings")}
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onClick={handleLogout}>
								<LogOut className="w-4 h-4" />
								{t("logout")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</>
			)}
			renderSidebar={({ closeMobileNav }) => (
				<div className="flex flex-col h-full min-h-0 bg-card">
					<div className="px-3 pt-4 pb-2 shrink-0">
						<Link
							href={absWouterHref("/dashboard")}
							onClick={() => closeMobileNav()}
							className="flex items-center gap-2 min-w-0"
						>
							<img src="/logo.svg" alt="" className="h-8 w-8 object-contain shrink-0" aria-hidden />
							<span className="font-bold text-foreground text-sm truncate">{t("brandName")}</span>
						</Link>
					</div>
					<nav className="px-3 pb-4 flex-1 min-h-0 overflow-y-auto space-y-1">
						{nav.map((item) => {
							if (item.type === "single") {
								return (
									<Link
										key={item.href}
										href={absWouterHref(item.href)}
										onClick={() => closeMobileNav()}
										className={cn(
											"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
											isNavActive(item.href)
												? "bg-primary text-primary-foreground"
												: "text-foreground/80 hover:bg-primary/10 hover:text-foreground",
										)}
									>
										<item.icon className="w-4 h-4 shrink-0" />
										{item.label}
									</Link>
								);
							}

							const inBookings = location.startsWith("/dashboard/bookings");
							const onBookingsRoot = location === "/dashboard/bookings" || location === "/dashboard/bookings/";
							return (
								<div key={item.href} className="space-y-0.5">
									<Link
										href={absWouterHref(item.href)}
										onClick={() => closeMobileNav()}
										className={cn(
											"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
											onBookingsRoot
												? "bg-primary text-primary-foreground"
												: inBookings
													? "text-foreground bg-muted/50 hover:bg-muted"
													: "text-foreground/80 hover:bg-primary/10 hover:text-foreground",
										)}
									>
										<item.icon className="w-4 h-4 shrink-0" />
										{item.label}
									</Link>
									<div className="ml-2 pl-2 border-l border-border/80 space-y-0.5 py-0.5">
										{item.children.map((child) => {
											const childActive = location === child.href || location.startsWith(`${child.href}/`);
											return (
												<Link
													key={child.href}
													href={absWouterHref(child.href)}
													onClick={() => closeMobileNav()}
													className={cn(
														"flex items-center gap-2.5 pl-2 pr-2 py-2 rounded-md text-sm transition-colors",
														childActive
															? "bg-primary text-primary-foreground font-medium"
															: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
													)}
												>
													<child.icon className="w-3.5 h-3.5 shrink-0 opacity-90" />
													<span className="truncate">{child.label}</span>
												</Link>
											);
										})}
									</div>
								</div>
							);
						})}
					</nav>
				</div>
			)}
		>
			{children}
		</PanelShell>
		</PanelFocusModeProvider>
	);
}
