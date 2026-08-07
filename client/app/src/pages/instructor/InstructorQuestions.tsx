import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, BookOpen, Signpost } from "lucide-react";
import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";
import {
	THEMATIC_TOPIC_ICON,
	THEMATIC_TOPIC_IDS,
	THEMATIC_TOPIC_TITLE_KEYS,
} from "src/data/thematicTopics";
import { SIGNS_CARD_COUNT } from "src/data/signCategories";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { Reveal } from "src/lib/motion";

function isGenericTopicTitle(title: string): boolean {
	return /^(Թեմա|Тема|Theme)\s*\d+$/i.test(title.trim());
}

export default function InstructorQuestions() {
	const { t } = useLang();
	const [thematicCardTitles, setThematicCardTitles] = useState(() => defaultExamQuestionMeta().thematicCardTitles);
	const [thematicCardQuestionIds, setThematicCardQuestionIds] = useState(
		() => defaultExamQuestionMeta().thematicCardQuestionIds,
	);
	const [signsCardTitles, setSignsCardTitles] = useState(() => defaultExamQuestionMeta().signsCardTitles);
	const [signsCardQuestionIds, setSignsCardQuestionIds] = useState(() => defaultExamQuestionMeta().signsCardQuestionIds);

	useEffect(() => {
		let mounted = true;
		const sync = async () => {
			const meta = await loadExamQuestionMeta();
			if (!mounted) return;
			setThematicCardTitles(meta.thematicCardTitles);
			setThematicCardQuestionIds(meta.thematicCardQuestionIds);
			setSignsCardTitles(meta.signsCardTitles);
			setSignsCardQuestionIds(meta.signsCardQuestionIds);
		};
		void sync();
		const off = subscribeExamQuestionMetaUpdated(() => void sync());
		return () => {
			mounted = false;
			off();
		};
	}, []);

	const thematicTopics = useMemo(
		() =>
			THEMATIC_TOPIC_IDS.map((topicId, i) => {
				const slotId = String(i + 1);
				const titleFromMeta = thematicCardTitles[i]?.trim() ?? "";
				const fallbackTitle = t(THEMATIC_TOPIC_TITLE_KEYS[i] as TranslationKey);
				return {
					slotId,
					iconSrc: THEMATIC_TOPIC_ICON[topicId],
					title: !titleFromMeta || isGenericTopicTitle(titleFromMeta) ? fallbackTitle : titleFromMeta,
					total: (thematicCardQuestionIds[i] ?? []).length,
				};
			}),
		[t, thematicCardQuestionIds, thematicCardTitles],
	);

	const signCategories = useMemo(
		() =>
			Array.from({ length: SIGNS_CARD_COUNT }, (_, i) => {
				const slotId = String(i + 1);
				const titleFromMeta = signsCardTitles[i]?.trim() ?? "";
				return {
					slotId,
					title: titleFromMeta || `${t("dashboardLearnRoadSigns")} ${slotId}`,
					total: (signsCardQuestionIds[i] ?? []).length,
				};
			}),
		[signsCardQuestionIds, signsCardTitles, t],
	);

	return (
		<InstructorPanelLayout>
			<InstructorScopeGuard require="theory">
				<div className="max-w-4xl mx-auto">
					<PanelPageHeader
						className="mb-6"
						icon={BookOpen}
						title={t("instructorQuestionsTitle")}
						subtitle={t("instructorQuestionsSubtitle")}
					/>

					<section className="mb-10">
						<h2 className="text-lg font-semibold text-foreground mb-3">{t("instructorQuestionsThematicHeading")}</h2>
						<div className="space-y-3">
							{thematicTopics.map((topic, i) => (
								<Reveal key={topic.slotId} delay={i * 0.03}>
									<Card className="border-border hover:border-primary/40 transition-colors">
										<Link
											href={`/instructor/questions/thematic/${topic.slotId}`}
											className="flex items-center gap-3 p-4"
										>
											<div className="w-9 h-9 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
												{topic.iconSrc ? (
													<img src={topic.iconSrc} alt="" className="w-5 h-5" />
												) : (
													<BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden />
												)}
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-foreground">{topic.title}</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{topic.total} {t("instructorQuestionsCountLabel")}
												</p>
											</div>
											<ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
										</Link>
									</Card>
								</Reveal>
							))}
						</div>
					</section>

					<section>
						<h2 className="text-lg font-semibold text-foreground mb-3">{t("instructorQuestionsSignsHeading")}</h2>
						<div className="space-y-3">
							{signCategories.map((category, i) => (
								<Reveal key={category.slotId} delay={i * 0.03}>
									<Card className="border-border hover:border-primary/40 transition-colors">
										<Link
											href={`/instructor/questions/signs/${category.slotId}`}
											className="flex items-center gap-3 p-4"
										>
											<div className="w-9 h-9 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0 text-foreground/70">
												<Signpost className="w-5 h-5" aria-hidden />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-foreground">{category.title}</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{category.total} {t("instructorQuestionsCountLabel")}
												</p>
											</div>
											<ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
										</Link>
									</Card>
								</Reveal>
							))}
						</div>
					</section>
				</div>
			</InstructorScopeGuard>
		</InstructorPanelLayout>
	);
}
