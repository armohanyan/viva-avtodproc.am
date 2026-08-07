import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { absWouterHref } from "src/lib/wouterFullPath";
import { useInstructorTeachingScope } from "./useInstructorTeachingScope";

type Scope = "practical" | "theory";

type Props = {
	readonly require: Scope;
	readonly children: ReactNode;
};

/** Redirects instructors who lack the required teaching flag to the dashboard. */
export function InstructorScopeGuard({ require, children }: Props) {
	const { loading, teachesPractical, teachesTheory } = useInstructorTeachingScope();
	const [, setLocation] = useLocation();
	const allowed = require === "practical" ? teachesPractical : teachesTheory;

	useEffect(() => {
		if (loading) return;
		if (!allowed) {
			setLocation(absWouterHref("/instructor/dashboard"));
		}
	}, [loading, allowed, setLocation]);

	if (loading || !allowed) {
		return (
			<div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
				<Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden />
			</div>
		);
	}

	return <>{children}</>;
}
