import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Redirect, useLocation, useRoute } from "wouter";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import ExamQuestionFigure from "src/components/ExamQuestionFigure";
import ExamQuizLayoutToggle, { type QuizLayoutMode } from "src/components/exam/ExamQuizLayoutToggle";
import ExamQuestionNumberNav, {
	buildQuestionNavStatuses,
} from "src/components/exam/ExamQuestionNumberNav";
import ExamQuizFocusModeButton from "src/components/exam/ExamQuizFocusModeButton";
import { quizToolbarToolGroup } from "src/components/exam/quizToolbarStyles";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { TooltipProvider } from "src/components/ui/tooltip";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";
import { getQuestionInLang, type ExamQuestion } from "src/data/examSampleQuestions";
import {
	THEMATIC_TOPIC_IDS,
	THEMATIC_TOPIC_TITLE_KEYS,
} from "src/data/thematicTopics";
import { loadExamQuestionMeta } from "src/lib/examQuestionMeta";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useExamQuizQuestionPool } from "src/modules/exam/useExamQuestionPacks";
import { cn } from "src/lib/utils";
import {
	usePanelFocusMode,
	usePanelFocusModeCleanupOnUnmount,
} from "src/components/panel/PanelFocusModeContext";

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

function questionIdFromSearch(): string | null {
	if (typeof window === "undefined") return null;
	const q = new URLSearchParams(window.location.search).get("q");
	return q?.trim() || null;
}

function questionDomId(questionId: string) {
	return `instructor-q-${questionId}`;
}

export default function InstructorQuestionsCategory() {
	return (
		<InstructorPanelLayout>
			<InstructorScopeGuard require="theory">
				<InstructorQuestionsCategoryView />
			</InstructorScopeGuard>
		</InstructorPanelLayout>
	);
}

function InstructorQuestionsCategoryView() {
	const { t, lang } = useLang();
	const route = useCategoryRoute();
	const [, setLocation] = useLocation();
	const { active: focusMode, toggle: toggleFocusMode } = usePanelFocusMode();
	usePanelFocusModeCleanupOnUnmount();

	const [categoryTitle, setCategoryTitle] = useState("");
	const [layoutMode, setLayoutMode] = useState<QuizLayoutMode>("step");
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState<(number | null)[]>([]);
	const [revealByIndex, setRevealByIndex] = useState<Record<number, boolean>>({});

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

	useEffect(() => {
		setAnswers([]);
		setRevealByIndex({});
		setIndex(0);
		setLayoutMode("step");
	}, [route?.kind, route?.slotId]);

	useEffect(() => {
		setAnswers((prev) => {
			if (prev.length === pool.length) return prev;
			return pool.map((_, i) => (i < prev.length ? prev[i] ?? null : null));
		});
	}, [pool]);

	useEffect(() => {
		if (loading || pool.length === 0) return;
		const fromUrl = questionIdFromSearch();
		if (!fromUrl) return;
		const found = pool.findIndex((q) => q.id === fromUrl);
		if (found >= 0) setIndex(found);
	}, [loading, pool]);

	const syncUrl = useCallback(
		(nextIndex: number) => {
			if (!route) return;
			const q = pool[nextIndex];
			if (!q) return;
			const base = `/instructor/questions/${route.kind}/${route.slotId}`;
			setLocation(`${base}?q=${encodeURIComponent(q.id)}`);
		},
		[pool, route, setLocation],
	);

	const goToIndex = useCallback(
		(nextIndex: number) => {
			if (nextIndex < 0 || nextIndex >= pool.length) return;
			setIndex(nextIndex);
			syncUrl(nextIndex);
			if (layoutMode === "scroll") {
				const q = pool[nextIndex];
				if (!q) return;
				requestAnimationFrame(() => {
					document.getElementById(questionDomId(q.id))?.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				});
			}
		},
		[layoutMode, pool, syncUrl],
	);

	const setAnswerAt = (qIdx: number, optionIdx: number) => {
		setAnswers((prev) => {
			const next = [...prev];
			while (next.length < pool.length) next.push(null);
			next[qIdx] = optionIdx;
			return next;
		});
	};

	const toggleReveal = (qIdx: number) => {
		setRevealByIndex((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
	};

	const setLayoutModeAndSync = (nextMode: QuizLayoutMode) => {
		setLayoutMode(nextMode);
		if (nextMode === "scroll") {
			const q = pool[index];
			if (q) {
				requestAnimationFrame(() => {
					document.getElementById(questionDomId(q.id))?.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				});
			}
			return;
		}
		const firstUnanswered = answers.findIndex((a) => a === null || a === undefined);
		const nextIndex = firstUnanswered === -1 ? Math.max(0, pool.length - 1) : firstUnanswered;
		setIndex(nextIndex);
		syncUrl(nextIndex);
	};

	const navStatuses = useMemo(
		() => buildQuestionNavStatuses(
			answers,
			pool.map((q) => q.correctIndex),
		),
		[answers, pool],
	);

	if (!route) {
		return <Redirect to="/instructor/questions" />;
	}

	const slotNum = Number.parseInt(route.slotId, 10);
	const maxSlot = route.kind === "thematic" ? THEMATIC_TOPIC_IDS.length : 10;
	if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > maxSlot) {
		return <Redirect to="/instructor/questions" />;
	}

	const question: ExamQuestion | null = pool[index] ?? null;
	const localized = question ? getQuestionInLang(question, lang) : null;
	const revealCurrent = Boolean(revealByIndex[index]);

	return (
		<div className={cn("mx-auto w-full", focusMode ? "max-w-5xl" : "max-w-4xl")}>
			<div className="mb-3">
				<Link href="/instructor/questions">
					<Button variant="outline" size="icon" aria-label={t("instructorQuestionsBack")}>
						<ArrowLeft className="w-4 h-4" aria-hidden />
					</Button>
				</Link>
			</div>

			{!focusMode ? (
				<PanelPageHeader
					className="mb-4"
					icon={BookOpen}
					title={categoryTitle || t("instructorQuestionsTitle")}
					subtitle={t("instructorQuestionsCategorySubtitle")}
				/>
			) : null}

			{loading ? (
				<p className="text-sm text-muted-foreground">{t("loading")}</p>
			) : pool.length === 0 ? (
				<Card className="p-6 border-border">
					<p className="text-sm text-muted-foreground">{t("instructorQuestionsEmptyCategory")}</p>
				</Card>
			) : (
				<>
					<TooltipProvider delayDuration={300}>
						<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
							<p className="text-sm text-muted-foreground tabular-nums">
								{layoutMode === "step" ? (
									<>
										{t("examQuizQuestion")} {index + 1} {t("examQuizOf")} {pool.length}
									</>
								) : (
									<>
										{t("examQuizScrollViewSubtitle")} ({pool.length})
									</>
								)}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<div className={cn(quizToolbarToolGroup, "gap-1")}>
									<ExamQuizLayoutToggle mode={layoutMode} onChange={setLayoutModeAndSync} />
								</div>
								<ExamQuizFocusModeButton active={focusMode} onToggle={toggleFocusMode} />
							</div>
						</div>
					</TooltipProvider>

					<div
						className={cn(
							layoutMode === "scroll" ? "flex flex-col" : "lg:flex lg:items-start lg:gap-4",
						)}
					>
						<ExamQuestionNumberNav
							total={pool.length}
							currentIndex={index}
							statuses={navStatuses}
							onSelect={goToIndex}
							pinned={layoutMode === "scroll"}
						/>

						<div className="min-w-0 flex-1">
							{layoutMode === "step" && question && localized ? (
								<Card className="border-border p-5 sm:p-8">
									<p className="text-lg sm:text-xl font-semibold text-foreground leading-snug mb-5">
										{localized.text}
									</p>

									{question.imageUrl ? (
										<ExamQuestionFigure url={question.imageUrl} alt={t("examQuizQuestionImageAlt")} />
									) : null}

									<ul className="space-y-2.5 mb-6">
										{localized.options.map((opt, i) => {
											const selected = answers[index];
											const isCorrect = i === question.correctIndex;
											const showCorrect = (selected !== null && selected !== undefined) || revealCurrent;
											return (
												<li key={`${question.id}-${i}`}>
													<button
														type="button"
														onClick={() => setAnswerAt(index, i)}
														className={cn(
															"w-full rounded-lg border px-4 py-3 text-left text-sm sm:text-base transition-colors",
															!showCorrect
																? selected === i
																	? "border-primary bg-primary/10 text-foreground"
																	: "border-border bg-card text-foreground hover:border-primary/40"
																: isCorrect
																	? "border-emerald-600 bg-emerald-600 text-white"
																	: selected === i
																		? "border-red-600 bg-red-600 text-white"
																		: "border-border bg-card text-foreground",
														)}
													>
														<span className="inline-flex items-start gap-2">
															{showCorrect && isCorrect ? (
																<CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
															) : (
																<span
																	className={cn(
																		"mt-0.5 size-5 shrink-0 rounded-full border",
																		showCorrect && selected === i && !isCorrect
																			? "border-white/70"
																			: "border-current/30",
																	)}
																	aria-hidden
																/>
															)}
															<span>{opt}</span>
														</span>
													</button>
												</li>
											);
										})}
									</ul>

									{(revealCurrent || answers[index] !== null) && localized.explanation ? (
										<p className="text-sm text-muted-foreground mb-6 rounded-lg bg-muted/40 border border-border px-4 py-3">
											{localized.explanation}
										</p>
									) : null}

									<div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
										<Button
											type="button"
											variant={revealCurrent ? "outline" : "default"}
											className="gap-2"
											onClick={() => toggleReveal(index)}
										>
											{revealCurrent ? (
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
												className="gap-1 flex-1 sm:flex-none"
											>
												<ChevronLeft className="w-4 h-4" aria-hidden />
												{t("instructorQuestionsPrev")}
											</Button>
											<Button
												type="button"
												variant="outline"
												disabled={index >= pool.length - 1}
												onClick={() => goToIndex(index + 1)}
												className="gap-1 flex-1 sm:flex-none"
											>
												{t("instructorQuestionsNext")}
												<ChevronRight className="w-4 h-4" aria-hidden />
											</Button>
										</div>
									</div>
								</Card>
							) : null}

							{layoutMode === "scroll" ? (
								<div className="space-y-6">
									{pool.map((q, qIdx) => {
										const loc = getQuestionInLang(q, lang);
										const selected = answers[qIdx];
										const reveal = Boolean(revealByIndex[qIdx]);
										const showCorrect = (selected !== null && selected !== undefined) || reveal;
										return (
											<Card
												key={q.id}
												id={questionDomId(q.id)}
												className={cn(
													"scroll-mt-24 border-border p-5 sm:p-8",
													qIdx === index && "ring-2 ring-primary/40",
												)}
											>
												<p className="text-xs font-medium text-muted-foreground mb-3">
													{t("examQuizQuestion")} {qIdx + 1} {t("examQuizOf")} {pool.length}
												</p>
												<p className="text-lg sm:text-xl font-semibold text-foreground leading-snug mb-5">
													{loc.text}
												</p>
												{q.imageUrl ? (
													<ExamQuestionFigure url={q.imageUrl} alt={t("examQuizQuestionImageAlt")} />
												) : null}
												<ul className="space-y-2.5 mb-4">
													{loc.options.map((opt, i) => {
														const isCorrect = i === q.correctIndex;
														return (
															<li key={`${q.id}-${i}`}>
																<button
																	type="button"
																	onClick={() => {
																		setAnswerAt(qIdx, i);
																		setIndex(qIdx);
																		syncUrl(qIdx);
																	}}
																	className={cn(
																		"w-full rounded-lg border px-4 py-3 text-left text-sm sm:text-base transition-colors",
																		!showCorrect
																			? selected === i
																				? "border-primary bg-primary/10 text-foreground"
																				: "border-border bg-card text-foreground hover:border-primary/40"
																			: isCorrect
																				? "border-emerald-600 bg-emerald-600 text-white"
																				: selected === i
																					? "border-red-600 bg-red-600 text-white"
																					: "border-border bg-card text-foreground",
																	)}
																>
																	{opt}
																</button>
															</li>
														);
													})}
												</ul>
												{(reveal || selected !== null) && loc.explanation ? (
													<p className="text-sm text-muted-foreground mb-4 rounded-lg bg-muted/40 border border-border px-4 py-3">
														{loc.explanation}
													</p>
												) : null}
												<Button
													type="button"
													variant={reveal ? "outline" : "default"}
													size="sm"
													className="gap-2"
													onClick={() => {
														toggleReveal(qIdx);
														setIndex(qIdx);
														syncUrl(qIdx);
													}}
												>
													{reveal ? (
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
											</Card>
										);
									})}
								</div>
							) : null}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
