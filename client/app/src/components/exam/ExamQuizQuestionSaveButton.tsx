import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useAccount } from "src/modules/accounts";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { loadSavedQuestionIdSet, rememberSavedQuestionId, setQuestionSavedState } from "src/lib/examQuestionEngagement";
import { quizBareIconButton, quizBareIconButtonActive } from "src/components/exam/quizToolbarStyles";
import { cn } from "src/lib/utils";

const SAVE_ROLES = new Set(["student", "instructor", "admin", "super_admin"]);

type Props = {
	questionId: string;
	className?: string;
};

export default function ExamQuizQuestionSaveButton({ questionId, className }: Props) {
	const { t } = useLang();
	const { user } = useAccount();
	const { showToast } = useToast();
	const canSave = Boolean(user && SAVE_ROLES.has(user.accountType));
	const [saved, setSaved] = useState<boolean | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!canSave) return;
		let mounted = true;
		void loadSavedQuestionIdSet()
			.then((ids) => {
				if (mounted) setSaved(ids.has(questionId));
			})
			.catch(() => {
				if (mounted) setSaved(false);
			});
		return () => {
			mounted = false;
		};
	}, [canSave, questionId]);

	if (!canSave) return null;

	const toggle = async () => {
		if (busy || saved === null) return;
		setBusy(true);
		try {
			const next = await setQuestionSavedState(questionId, !saved);
			rememberSavedQuestionId(questionId, next);
			setSaved(next);
			showToast(next ? t("questionSavedToast") : t("questionUnsavedToast"), "success");
		} catch (e) {
			showToast(getApiErrorMessage(e), "error");
		} finally {
			setBusy(false);
		}
	};

	const label = saved ? t("questionUnsaveAction") : t("questionSaveAction");

	return (
		<button
			type="button"
			disabled={busy || saved === null}
			onClick={() => void toggle()}
			className={cn(quizBareIconButton, saved && quizBareIconButtonActive, className)}
			title={label}
			aria-label={label}
			aria-pressed={Boolean(saved)}
		>
			{busy || saved === null ? (
				<Loader2 className="size-5 animate-spin" aria-hidden />
			) : saved ? (
				<BookmarkCheck className="size-5" aria-hidden />
			) : (
				<Bookmark className="size-5" aria-hidden />
			)}
		</button>
	);
}
