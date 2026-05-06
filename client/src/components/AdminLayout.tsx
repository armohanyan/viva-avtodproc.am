import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { absWouterHref } from "src/lib/wouterFullPath";
import { cn } from "src/lib/utils";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
	LayoutDashboard,
	Car,
	Calendar,
	Newspaper,
	LogOut,
	GraduationCap,
	UserCog,
	Settings,
	MapPin,
	CarFront,
	Landmark,
	School,
	Sparkles,
	ChevronDown,
	Users,
	PhoneCall,
  Mail,
  Bell,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ADMIN_NAV_LINKS, adminNavAllowedForUser } from "src/modules/admin/admin.consts";
import type { AdminNavigationLink } from "src/modules/admin/admin.types";
import { useAccount } from "src/modules/accounts";
import { PanelShell } from "src/components/panel/PanelShell";
import { initialsFromName } from "src/components/panel/initialsFromName";
import NotificationBell from "src/components/NotificationBell";

interface Props {
	children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
	const { t } = useLang();
	const { showToast } = useToast();
	const { user, signOut } = useAccount();
	const [location, setLocation] = useLocation();

	/**
	 * Manual open/close overrides for collapsible sidebar groups.
	 * `undefined` falls back to route-driven auto-open.
	 */
	const [collapsibleOverrides, setCollapsibleOverrides] = useState<Record<string, boolean>>({});

	const iconByPath = {
		"/admin/dashboard": LayoutDashboard,
		"/admin/branches": MapPin,
		"/admin/cars": CarFront,
		"/admin/bookings": Calendar,
		"/admin/notifications": Bell,
		"/admin/contact-requests": Mail,
		"/admin/booked-calls": PhoneCall,
		"/admin/learn": School,
		"/admin/learn/groups": Users,
		"/admin/instructors": Car,
		"/admin/students": GraduationCap,
		"/admin/finance": Landmark,
		"/admin/blogs": Newspaper,
		"/admin/accounts": UserCog,
		"/admin/marketing-content": Sparkles,
	} as const;

	const adminNavLabels = useMemo(() => {
		const entries: { href: string; label: string }[] = [];
		for (const link of ADMIN_NAV_LINKS) {
			entries.push({ href: link.href, label: t(link.translationKey) });
			if (link.children) {
				for (const c of link.children) {
					entries.push({ href: c.href, label: t(c.translationKey) });
				}
			}
		}
		return entries;
	}, [t]);

	const renderAdminNavItem = (link: AdminNavigationLink, closeMobileNav: () => void) => {
		if (!adminNavAllowedForUser(user, link.allowedAccountTypes)) {
			return null;
		}
		const visibleChildren =
			link.children?.filter((c) => adminNavAllowedForUser(user, c.allowedAccountTypes)) ?? [];
		const Icon = iconByPath[link.href as keyof typeof iconByPath];
		const hasChildren = Boolean(visibleChildren.length);

		if (link.collapsible && link.children?.length) {
			if (!visibleChildren.length) return null;
			const onParent = location === link.href;
			const underParent = visibleChildren.some(
				(c) => location === c.href || location.startsWith(`${c.href}/`),
			);
			const routeBasedOpen = onParent || underParent;
			const override = collapsibleOverrides[link.href];
			const isOpen = override ?? routeBasedOpen;
			const childOwnsParentPath = visibleChildren.some((c) => c.href === link.href && location === link.href);
			const parentStrong = onParent && !childOwnsParentPath;
			const parentSoft = underParent && !onParent;

			return (
				<div key={link.href} className="space-y-0.5">
					<div
						className={cn(
							"w-full flex items-center gap-2 px-1 py-1 rounded-lg text-sm font-medium transition-colors",
							parentStrong
								? "bg-primary text-primary-foreground"
								: parentSoft
									? "bg-white/10 text-hero-foreground"
									: "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground",
						)}
					>
						<Link
							href={link.href}
							onClick={(e) => {
								// When already inside this section, clicking parent label acts as collapse/expand.
								if (onParent || underParent) {
									e.preventDefault();
									setCollapsibleOverrides((prev) => ({ ...prev, [link.href]: !isOpen }));
									return;
								}
								closeMobileNav();
							}}
							className="flex-1 flex items-center gap-3 px-2 py-1.5 rounded-md"
						>
							<Icon className="w-4 h-4 shrink-0" />
							<span className="flex-1 text-left">{t(link.translationKey)}</span>
						</Link>
						<button
							type="button"
							aria-expanded={isOpen}
							aria-label={t(link.translationKey)}
							onClick={() => {
								setCollapsibleOverrides((prev) => ({ ...prev, [link.href]: !isOpen }));
							}}
							className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10"
						>
							<ChevronDown
								className={cn("w-4 h-4 shrink-0 transition-transform opacity-80", isOpen && "rotate-180")}
								aria-hidden
							/>
						</button>
					</div>
					{isOpen ? (
						<div className="ml-3 pl-3 border-l border-white/15 space-y-0.5">
							{visibleChildren.map((child) => {
								const childActive = location === child.href;
								return (
									<Link
										key={child.translationKey}
										href={child.href}
										onClick={() => closeMobileNav()}
										className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
											childActive
												? "bg-primary text-primary-foreground"
												: "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
										}`}
									>
										{t(child.translationKey)}
									</Link>
								);
							})}
						</div>
					) : null}
				</div>
			);
		}

		if (!hasChildren) {
			if (link.children?.length && !visibleChildren.length) return null;
			const active = location === link.href;
			return (
				<Link
					key={link.href}
					href={link.href}
					onClick={() => closeMobileNav()}
					className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
						active
							? "bg-primary text-primary-foreground"
							: "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
					}`}
				>
					<Icon className="w-4 h-4 shrink-0" />
					{t(link.translationKey)}
				</Link>
			);
		}

		const onParent = location === link.href;
		const underParent = visibleChildren.some(
			(c) => location === c.href || location.startsWith(`${c.href}/`),
		);
		const parentSoft = underParent && !onParent;
		const parentStrong = onParent;

		return (
			<div key={link.href} className="space-y-0.5">
				<Link
					href={link.href}
					onClick={() => closeMobileNav()}
					className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
						parentStrong
							? "bg-primary text-primary-foreground"
							: parentSoft
								? "bg-white/10 text-hero-foreground"
								: "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
					}`}
				>
					<Icon className="w-4 h-4 shrink-0" />
					{t(link.translationKey)}
				</Link>
				<div className="ml-3 pl-3 border-l border-white/15 space-y-0.5">
					{visibleChildren.map((child) => {
						const childActive = location === child.href;
						return (
							<Link
								key={child.href}
								href={child.href}
								onClick={() => closeMobileNav()}
								className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									childActive
										? "bg-primary text-primary-foreground"
										: "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
								}`}
							>
								{t(child.translationKey)}
							</Link>
						);
					})}
				</div>
			</div>
		);
	};

	const handleLogout = () => {
		showToast(t("logoutSuccess"), "info");
		setLocation(absWouterHref("/"));
		signOut();
	};

	const headerTitle = useMemo(() => {
		if (location === "/admin/profile") return t("adminProfileTitle");
		if (location === "/admin/learn/exam-questions") return t("adminExamQuestionsTitle");
		if (location === "/admin/learn/groups") return t("adminSidebarGroups");
		if (location === "/admin/learn/packages") return t("packages");
		if (location === "/admin/finance/income") return t("adminFinanceIncomeTitle");
		if (location === "/admin/finance/outcomes") return t("adminFinanceOutcomesTitle");
		if (location === "/admin/finance/transactions") return t("adminFinanceTransactionsTitle");
		if (location === "/admin/finance") return t("adminFinanceOverviewTitle");
		return adminNavLabels.find((n) => n.href === location)?.label || t("adminDashboard");
	}, [location, t, adminNavLabels]);

	return (
		<PanelShell
			sidebarSurface="hero"
			headerTitle={headerTitle}
			headerTrailing={({ closeMobileNav }) => (
				<>
					<ThemeToggle />
					<NotificationBell listHref="/admin/notifications" panel="admin" onNavigate={closeMobileNav} />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
								<Link href="/admin/profile" className="cursor-pointer" onClick={() => closeMobileNav()}>
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
				<div className="flex flex-col h-full min-h-0 bg-hero">
					<div className="px-3 pt-4 pb-2 shrink-0">
						<Link
							href="/admin/dashboard"
							onClick={() => closeMobileNav()}
							className="flex items-center gap-2 min-w-0"
						>
							<img src="/logo.svg" alt="" className="h-8 w-8 object-contain shrink-0" aria-hidden />
							<span className="font-bold text-hero-foreground text-sm truncate">{t("brandName")}</span>
						</Link>
					</div>
					<nav className="px-3 pb-4 flex-1 min-h-0 overflow-y-auto space-y-1">
						{ADMIN_NAV_LINKS.map((link) => renderAdminNavItem(link, closeMobileNav))}
					</nav>
				</div>
			)}
		>
			{children}
		</PanelShell>
	);
}
