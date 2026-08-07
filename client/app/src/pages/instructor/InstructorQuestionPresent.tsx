import { Redirect, useRoute } from "wouter";
import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";

type Kind = "thematic" | "signs";

function usePresentRoute(): { kind: Kind; slotId: string } | null {
	const [thematicMatch, thematicParams] = useRoute("/instructor/questions/thematic/:slotId/present");
	const [signsMatch, signsParams] = useRoute("/instructor/questions/signs/:slotId/present");
	if (thematicMatch && thematicParams?.slotId) {
		return { kind: "thematic", slotId: thematicParams.slotId.trim() };
	}
	if (signsMatch && signsParams?.slotId) {
		return { kind: "signs", slotId: signsParams.slotId.trim() };
	}
	return null;
}

/** Legacy present URLs redirect into the category session view. */
export default function InstructorQuestionPresent() {
	const route = usePresentRoute();

	if (!route) {
		return <Redirect to="/instructor/questions" />;
	}

	const search = typeof window !== "undefined" ? window.location.search : "";
	return (
		<InstructorPanelLayout>
			<InstructorScopeGuard require="theory">
				<Redirect to={`/instructor/questions/${route.kind}/${route.slotId}${search}`} />
			</InstructorScopeGuard>
		</InstructorPanelLayout>
	);
}
