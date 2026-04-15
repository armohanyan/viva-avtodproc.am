import { ReactNode, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
	LayoutDashboard,
	Calendar,
	ShoppingBag,
	CreditCard,
	User,
	BookOpen,
	LogOut,
	Settings,
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

interface Props {
	children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
	const { t } = useLang();
	const { showToast } = useToast();
	const { user, signOut } = useAccount();
	const [location, setLocation] = useLocation();

	const iconByPath = {
		"/dashboard": LayoutDashboard,
		"/dashboard/learn": BookOpen,
		"/dashboard/bookings": Calendar,
		"/dashboard/purchases": ShoppingBag,
		"/dashboard/payments": CreditCard,
		"/dashboard/profile": User,
	} as const;

	const nav = DASHBOARD_NAV_LINKS.map((link) => ({
		href: link.href,
		icon: iconByPath[link.href as keyof typeof iconByPath],
		label: t(link.translationKey),
	}));

	const headerTitle = useMemo(() => {
		if (location.startsWith("/dashboard/learn/exam-tests") || location.startsWith("/dashboard/exam-tests")) {
			return t("dashboardLearnExamTests");
		}
		if (location.startsWith("/dashboard/learn/thematic-tests")) {
			return t("dashboardLearnThematicTests");
		}
		if (location.startsWith("/dashboard/learn")) {
			return t("learn");
		}
		if (location.startsWith("/dashboard/bookings/package")) {
			return t("bookingsSubnavPackage");
		}
		if (location.startsWith("/dashboard/bookings/practical")) {
			return t("bookingsSubnavPractical");
		}
		const hit = DASHBOARD_NAV_LINKS.find((l) => l.href === location);
		return hit ? t(hit.translationKey) : t("dashboard");
	}, [location, t]);

	const isNavActive = (href: string) => {
		if (href === "/dashboard/learn") {
			return location.startsWith("/dashboard/learn") || location.startsWith("/dashboard/exam-tests");
		}
		if (href === "/dashboard/bookings") {
			return location.startsWith("/dashboard/bookings");
		}
		return location === href;
	};

	const handleLogout = () => {
		showToast(t("logoutSuccess"), "info");
		signOut();
		setTimeout(() => setLocation("/"), 800);
	};

	return (
		<PanelShell
			sidebarSurface="card"
			headerTitle={headerTitle}
			headerTrailing={({ closeMobileNav }) => (
				<>
					<LangToggle />
					<ThemeToggle />
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
								<Link href="/dashboard/profile" className="cursor-pointer" onClick={() => closeMobileNav()}>
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
					<div className="p-5 border-b border-border shrink-0">
						<Link href="/dashboard" className="flex items-center gap-2">
							<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
								<img src="/logo.jpg" alt={t("brandName")} className="w-5 h-5 object-contain" />
							</div>
							<div className="min-w-0">
								<span className="font-bold text-foreground block truncate">{t("brandName")}</span>
								<p className="text-xs text-primary font-medium truncate">{t("roleStudent")}</p>
							</div>
						</Link>
					</div>
					<nav className="px-3 py-4 flex-1 min-h-0 overflow-y-auto space-y-1">
						{nav.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => closeMobileNav()}
								className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
									isNavActive(item.href)
										? "bg-primary text-primary-foreground"
										: "text-foreground/80 hover:bg-primary/10 hover:text-foreground"
								}`}
							>
								<item.icon className="w-4 h-4 shrink-0" />
								{item.label}
							</Link>
						))}
					</nav>
				</div>
			)}
		>
			{children}
		</PanelShell>
	);
}
