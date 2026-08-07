import { useMemo } from "react";
import { useAccount } from "src/modules/accounts";
import { useInstructors } from "src/modules/instructors/useInstructors";

export type InstructorTeachingScope = {
	/** Profile still loading — treat as unknown (show shared nav only until resolved). */
	loading: boolean;
	teachesPractical: boolean;
	teachesTheory: boolean;
};

/**
 * Resolves the logged-in instructor's practical/theory flags from `/instructors`.
 * Defaults to both false while loading so practical-only pages don't flash for theory teachers.
 */
export function useInstructorTeachingScope(): InstructorTeachingScope {
	const { user } = useAccount();
	const { instructors, loading } = useInstructors();

	return useMemo(() => {
		if (!user || user.accountType !== "instructor") {
			return { loading: false, teachesPractical: false, teachesTheory: false };
		}
		const me = instructors.find((i) => i.id === user.id);
		if (!me) {
			return { loading, teachesPractical: false, teachesTheory: false };
		}
		return {
			loading: false,
			teachesPractical: Boolean(me.teachesPractical),
			teachesTheory: Boolean(me.teachesTheory),
		};
	}, [user, instructors, loading]);
}
