import { useEffect, useMemo, useState } from "react";
import { Link, Redirect, useLocation, useRoute } from "wouter";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import ExamQuestionFigure from "src/components/ExamQuestionFigure";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";
import { getQuestionInLang, type ExamQuestion } from "src/data/examSampleQuestions";
import { useLang } from "src/lib/i18n";
import { useExamQuizQuestionPool } from "src/modules/exam/useExamQuestionPacks";
import { cn } from "src/lib/utils";
import {
	usePanelFocusMode,
	usePanelFocusModeCleanupOnUnmount,
} from "src/components/panel/PanelFocusModeContext";

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

function questionIdFromSearch(): string | null {
	if (typeof window === "undefined") return null;
	const q = new URLSearchParams(window.location.search).get("q");
	return q?.trim() || null;
}

export default function InstructorQuestionPresent() {
	return (
		<InstructorPanelLayout>
			<InstructorScopeGuard require="theory">
				<InstructorQuestionPresentView />
			</InstructorScopeGuard>
		</InstructorPanelLayout>
	);
}

function InstructorQuestionPresentView() {
	const { t, lang } = useLang();
	const route = usePresentRoute();
	const [, setLocation] = useLocation();
	const { active: focusMode, toggle: toggleFocusMode } = usePanelFocusMode();
	usePanelFocusModeCleanupOnUnmount();

	const [revealAnswer, setRevealAnswer] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(() => questionIdFromSearch());

	const { pool, loading } = useExamQuizQuestionPool({
		mode: "topics",
		thematicTopicId: route?.kind === "thematic" ? route.slotId : undefined,
		signCategoryTopicId: route?.kind === "signs" ? route.slotId : undefined,
		examTicketActive: false,
		examTicketMetaPending: false,
		examTicketQuestionIds: [],
	});

	useEffect(() => {
		setSelectedId(questionIdFromSearch());
		setRevealAnswer(false);
	}, [route?.kind, route?.slotId]);

	useEffect(() => {
		if (loading || pool.length === 0) return;
		if (selectedId && pool.some((q) => q.id === selectedId)) return;
		const first = pool[0]?.id;
		if (first) setSelectedId(first);
	}, [loading, pool, selectedId]);

	const index = useMemo(() => {
		if (!selectedId) return -1;
		return pool.findIndex((q) => q.id === selectedId);
	}, [pool, selectedId]);

	const question: ExamQuestion | null = index >= 0 ? (pool[index] ?? null) : null;

	const categoryHref = route ? `/instructor/questions/${route.kind}/${route.slotId}` : "/instructor/questions";

	const goToIndex = (nextIndex: number) => {
		const next = pool[nextIndex];
		if (!next || !route) return;
		setRevealAnswer(false);
		setSelectedId(next.id);
		setLocation(`${categoryHref}/present?q=${encodeURIComponent(next.id)}`);
	};

	if (!route) {
		return <Redirect to="/instructor/questions" />;
	}

	const localized = question ? getQuestionInLang(question, lang) : null;

	return (
		<div className={cn("mx-auto", focusMode ? "max-w-4xl" : "max-w-3xl")}>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<Link href={categoryHref}>
					<Button variant="outline" size="sm" className="gap-1.5">
						<ArrowLeft className="w-4 h-4" aria-hidden />
						{t("instructorQuestionsBack")}
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<Button type="button" variant="outline" size="sm" onClick={toggleFocusMode}>
						{focusMode ? t("examQuizExitFocus") : t("examQuizFocusMode")}
					</Button>
					{!loading && pool.length > 0 ? (
						<p className="text-sm text-muted-foreground tabular-nums">
							{Math.max(index + 1, 1)} / {pool.length}
						</p>
					) : null}
				</div>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">{t("loading")}</p>
			) : !question || !localized ? (
				<Card className="p-6 border-border">
					<p className="text-sm text-muted-foreground">{t("instructorQuestionsEmptyCategory")}</p>
				</Card>
			) : (
				<Card className="border-border p-5 sm:p-8">
					<p className="text-lg sm:text-xl font-semibold text-foreground leading-snug mb-5">{localized.text}</p>

					{question.imageUrl ? (
						<ExamQuestionFigure url={question.imageUrl} alt={t("examQuizQuestionImageAlt")} />
					) : null}

					<ul className="space-y-2.5 mb-6">
						{localized.options.map((opt, i) => {
							const isCorrect = i === question.correctIndex;
							const showCorrect = revealAnswer && isCorrect;
							return (
								<li
									key={`${question.id}-${i}`}
									className={cn(
										"rounded-lg border px-4 py-3 text-sm sm:text-base transition-colors",
										showCorrect
											? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
											: "border-border bg-card text-foreground",
									)}
								>
									<span className="inline-flex items-start gap-2">
										{showCorrect ? (
											<CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
										) : (
											<span className="w-5 h-5 rounded-full border border-border shrink-0 mt-0.5" aria-hidden />
										)}
										<span>{opt}</span>
									</span>
								</li>
							);
						})}
					</ul>

					{revealAnswer && localized.explanation ? (
						<p className="text-sm text-muted-foreground mb-6 rounded-lg bg-muted/40 border border-border px-4 py-3">
							{localized.explanation}
						</p>
					) : null}

					<div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
						<Button
							type="button"
							variant={revealAnswer ? "outline" : "default"}
							className="gap-2"
							onClick={() => setRevealAnswer((v) => !v)}
						>
							{revealAnswer ? (
								<>
									<EyeOff className="w-4 h-4" aria-hidden />
									{t("instructorQuestionsHideAnswer")}
								</>
							) : (
								<>
									<Eye className="w-4 h-4" aria-hidden />
									{t("instructorQuestionsRevealAnswer")}
								</>
							)}
						</Button>

						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={index <= 0}
								onClick={() => goToIndex(index - 1)}
								className="gap-1"
							>
								<ChevronLeft className="w-4 h-4" aria-hidden />
								{t("instructorQuestionsPrev")}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={index < 0 || index >= pool.length - 1}
								onClick={() => goToIndex(index + 1)}
								className="gap-1"
							>
								{t("instructorQuestionsNext")}
								<ChevronRight className="w-4 h-4" aria-hidden />
							</Button>
						</div>
					</div>
				</Card>
			)}
		</div>
	);
}
