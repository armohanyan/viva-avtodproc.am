import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { absWouterHref } from "src/lib/wouterFullPath";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
	LayoutDashboard,
	BookOpen,
	GraduationCap,
	Car,
	User,
	LogOut,
	Settings,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { INSTRUCTOR_NAV_LINKS } from "src/modules/instructor/instructor.consts";
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
import NotificationBell from "src/components/NotificationBell";

interface Props {
	children: ReactNode;
}

export default function InstructorPanelLayout({ children }: Props) {
	const { t } = useLang();
	const { showToast } = useToast();
	const { user, signOut } = useAccount();
	const [location, setLocation] = useLocation();

	const iconByPath = {
		"/instructor/dashboard": LayoutDashboard,
		"/instructor/students": GraduationCap,
		"/instructor/my-lessons": BookOpen,
		"/instructor/cars": Car,
		"/instructor/profile": User,
	} as const;

	const nav = INSTRUCTOR_NAV_LINKS.map((link) => ({
		href: link.href,
		icon: iconByPath[link.href as keyof typeof iconByPath],
		label: t(link.translationKey),
	}));

	const handleLogout = () => {
		showToast(t("logoutSuccess"), "info");
		setLocation(absWouterHref("/"));
		signOut();
	};

	const headerTitle = location.startsWith("/instructor/notifications")
		? t("notifications")
		: nav.find((n) => n.href === location)?.label || t("instructorDashboardTitle");

	return (
		<PanelShell
			sidebarSurface="card"
			headerTitle={headerTitle}
			headerTrailing={({ closeMobileNav }) => (
				<>
					<ThemeToggle />
					<NotificationBell listHref="/instructor/notifications" panel="instructor" onNavigate={closeMobileNav} />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
								aria-label={t("profile")}
							>
								{user ? (
									<span className="text-xs font-semibold">{initialsFromName(user.name)}</span>
								) : (
									<img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
								)}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel className="font-normal">
								<p className="text-sm font-medium text-foreground truncate">
									{user?.name ?? t("dashboardProfileInstructorDemo")}
								</p>
								<p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/instructor/profile" className="cursor-pointer" onClick={() => closeMobileNav()}>
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
						<Link href="/instructor/dashboard" className="flex items-center gap-2">
							<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
								<img src="/logo.jpg" alt={t("brandName")} className="w-5 h-5 object-contain" />
							</div>
							<div>
								<span className="font-bold text-foreground">{t("brandName")}</span>
								<p className="text-xs text-primary font-medium">{t("instructorPanelBadge")}</p>
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
									location === item.href
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
