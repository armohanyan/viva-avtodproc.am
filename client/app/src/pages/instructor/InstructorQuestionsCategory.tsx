import { useEffect, useMemo, useState } from "react";
import { Link, Redirect, useRoute } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";
import { getQuestionInLang } from "src/data/examSampleQuestions";
import {
	THEMATIC_TOPIC_IDS,
	THEMATIC_TOPIC_TITLE_KEYS,
} from "src/data/thematicTopics";
import { loadExamQuestionMeta } from "src/lib/examQuestionMeta";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useExamQuizQuestionPool } from "src/modules/exam/useExamQuestionPacks";

type Kind = "thematic" | "signs";

function useCategoryRoute(): { kind: Kind; slotId: string } | null {
	const [thematicMatch, thematicParams] = useRoute("/instructor/questions/thematic/:slotId");
	const [signsMatch, signsParams] = useRoute("/instructor/questions/signs/:slotId");
	if (thematicMatch && thematicParams?.slotId) {
		return { kind: "thematic", slotId: thematicParams.slotId.trim() };
	}
	if (signsMatch && signsParams?.slotId) {
		return { kind: "signs", slotId: signsParams.slotId.trim() };
	}
	return null;
}

export default function InstructorQuestionsCategory() {
	const { t, lang } = useLang();
	const route = useCategoryRoute();
	const [categoryTitle, setCategoryTitle] = useState("");

	const { pool, loading } = useExamQuizQuestionPool({
		mode: "topics",
		thematicTopicId: route?.kind === "thematic" ? route.slotId : undefined,
		signCategoryTopicId: route?.kind === "signs" ? route.slotId : undefined,
		examTicketActive: false,
		examTicketMetaPending: false,
		examTicketQuestionIds: [],
	});

	useEffect(() => {
		if (!route) return;
		let mounted = true;
		void loadExamQuestionMeta().then((meta) => {
			if (!mounted) return;
			const idx = Number.parseInt(route.slotId, 10) - 1;
			if (route.kind === "thematic") {
				const fromMeta = meta.thematicCardTitles[idx]?.trim() ?? "";
				const fallback =
					idx >= 0 && idx < THEMATIC_TOPIC_TITLE_KEYS.length
						? t(THEMATIC_TOPIC_TITLE_KEYS[idx] as TranslationKey)
						: t("instructorQuestionsThematicHeading");
				const generic = /^(Թեմա|Тема|Theme)\s*\d+$/i.test(fromMeta);
				setCategoryTitle(!fromMeta || generic ? fallback : fromMeta);
				return;
			}
			const fromMeta = meta.signsCardTitles[idx]?.trim() ?? "";
			setCategoryTitle(fromMeta || `${t("dashboardLearnRoadSigns")} ${route.slotId}`);
		});
		return () => {
			mounted = false;
		};
	}, [route, t]);

	const presentBase = useMemo(() => {
		if (!route) return "";
		return `/instructor/questions/${route.kind}/${route.slotId}/present`;
	}, [route]);

	if (!route) {
		return <Redirect to="/instructor/questions" />;
	}

	// Guard invalid thematic slot ids early (signs: 1..10, thematic: 1..11).
	const slotNum = Number.parseInt(route.slotId, 10);
	const maxSlot = route.kind === "thematic" ? THEMATIC_TOPIC_IDS.length : 10;
	if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > maxSlot) {
		return <Redirect to="/instructor/questions" />;
	}

	return (
		<InstructorPanelLayout>
			<InstructorScopeGuard require="theory">
				<div className="max-w-3xl mx-auto">
					<div className="mb-3">
						<Link href="/instructor/questions">
							<Button variant="outline" size="icon" aria-label={t("instructorQuestionsBack")}>
								<ArrowLeft className="w-4 h-4" aria-hidden />
							</Button>
						</Link>
					</div>

					<PanelPageHeader
						className="mb-6"
						icon={BookOpen}
						title={categoryTitle || t("instructorQuestionsTitle")}
						subtitle={t("instructorQuestionsCategorySubtitle")}
					/>

					{loading ? (
						<p className="text-sm text-muted-foreground">{t("loading")}</p>
					) : pool.length === 0 ? (
						<Card className="p-6 border-border">
							<p className="text-sm text-muted-foreground">{t("instructorQuestionsEmptyCategory")}</p>
						</Card>
					) : (
						<div className="space-y-2">
							{pool.map((question, idx) => {
								const q = getQuestionInLang(question, lang);
								return (
									<Link
										key={question.id}
										href={`${presentBase}?q=${encodeURIComponent(question.id)}`}
										className="block"
									>
										<Card className="p-4 border-border hover:border-primary/40 transition-colors">
											<p className="text-sm text-foreground leading-snug">
												<span className="text-muted-foreground tabular-nums mr-2">{idx + 1}.</span>
												{q.text}
											</p>
										</Card>
									</Link>
								);
							})}
						</div>
					)}
				</div>
			</InstructorScopeGuard>
		</InstructorPanelLayout>
	);
}
