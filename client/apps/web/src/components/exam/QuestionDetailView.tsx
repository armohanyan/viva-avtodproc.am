import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Loader2, MessageSquare, Send, Share2, Trash2 } from "lucide-react";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import ExamQuestionFigure from "src/components/ExamQuestionFigure";
import { useAccount } from "src/modules/accounts";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage } from "src/lib/vivaApi";
import {
  addQuestionComment,
  deleteQuestionComment,
  getQuestionSavedState,
  loadQuestionById,
  loadQuestionComments,
  setQuestionSavedState,
  type ExamQuestionComment,
} from "src/lib/examQuestionEngagement";
import { getQuestionInLang, type ExamQuestion } from "src/data/examSampleQuestions";

type Props = {
  questionId: string;
  backHref: string;
  savedHref?: string;
};

export default function QuestionDetailView({ questionId, backHref, savedHref }: Props) {
  const roleLabel = (role: ExamQuestionComment["commenter"]["role"]): string => {
    if (role === "super_admin" || role === "admin") return t("roleAdmin");
    if (role === "instructor") return t("roleInstructor");
    return t("roleStudent");
  };

  const { t, lang } = useLang();
  const { user } = useAccount();
  const { showToast } = useToast();
  const [question, setQuestion] = useState<ExamQuestion | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [comments, setComments] = useState<ExamQuestionComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const COMMENTS_PAGE_SIZE = 8;
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingBusy, setSavingBusy] = useState(false);

  const canComment = user?.accountType === "student" || user?.accountType === "instructor" || user?.accountType === "admin" || user?.accountType === "super_admin";
  const canModerate = user?.accountType === "admin" || user?.accountType === "super_admin";
  const canSave = user?.accountType === "student";

  useEffect(() => {
    setCommentsPage(1);
  }, [questionId]);

  useEffect(() => {
    let mounted = true;
    setLoadingQuestion(true);
    setQuestionError(null);
    void loadQuestionById(questionId)
      .then((row) => {
        if (!mounted) return;
        setQuestion(row);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setQuestionError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingQuestion(false);
      });
    return () => {
      mounted = false;
    };
  }, [questionId]);

  useEffect(() => {
    let mounted = true;
    setLoadingComments(true);
    setCommentsError(null);
    void loadQuestionComments(questionId, commentsPage, COMMENTS_PAGE_SIZE)
      .then((rows) => {
        if (!mounted) return;
        setComments(rows.items);
        setCommentsTotal(rows.total);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setCommentsError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingComments(false);
      });
    return () => {
      mounted = false;
    };
  }, [COMMENTS_PAGE_SIZE, commentsPage, questionId]);

  useEffect(() => {
    if (!canSave) {
      setSaved(false);
      return;
    }
    let mounted = true;
    void getQuestionSavedState(questionId)
      .then((v) => {
        if (mounted) setSaved(v);
      })
      .catch(() => {
        if (mounted) setSaved(false);
      });
    return () => {
      mounted = false;
    };
  }, [canSave, questionId]);

  const localized = useMemo(() => (question ? getQuestionInLang(question, lang) : null), [question, lang]);

  const toggleSaved = async () => {
    if (!canSave || savingBusy) return;
    setSavingBusy(true);
    try {
      const next = await setQuestionSavedState(questionId, !saved);
      setSaved(next);
      showToast(next ? t("questionSavedToast") : t("questionUnsavedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSavingBusy(false);
    }
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("questionShareCopiedToast"), "success");
    } catch {
      showToast(t("questionShareCopyFailedToast"), "error");
    }
  };

  const submitComment = async () => {
    if (!canComment || commentBusy) return;
    const text = commentText.trim();
    if (text.length < 2) {
      showToast(t("questionCommentTooShort"), "error");
      return;
    }
    if (text.length > 2000) {
      showToast(t("questionCommentTooLong"), "error");
      return;
    }
    setCommentBusy(true);
    try {
      const created = await addQuestionComment(questionId, text);
      if (commentsPage === 1) {
        setComments((prev) => [...prev, created]);
      }
      setCommentsTotal((v) => v + 1);
      setCommentText("");
      showToast(t("questionCommentAddedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setCommentBusy(false);
    }
  };

  const removeComment = async (commentId: number) => {
    if (!canModerate) return;
    setCommentBusy(true);
    try {
      await deleteQuestionComment(questionId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsTotal((v) => Math.max(0, v - 1));
      showToast(t("questionCommentDeletedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setCommentBusy(false);
    }
  };

  if (loadingQuestion) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div className="flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("questionDetailLoadingQuestion")}</span>
        </div>
      </div>
    );
  }

  if (questionError || !question || !localized) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{questionError || t("questionDetailNotFound")}</p>
          <Link href={backHref}>
            <Button variant="outline">{t("examQuizBackToList")}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">{t("examQuizBackToList")}</Button>
        </Link>
        {savedHref ? (
          <Link href={savedHref}>
            <Button variant="outline" size="icon" title={t("questionSavedListTitle")} aria-label={t("questionSavedListTitle")}>
              <Bookmark className="w-4 h-4" />
            </Button>
          </Link>
        ) : null}
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {canSave ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleSaved}
              disabled={savingBusy}
              title={saved ? t("questionUnsaveAction") : t("questionSaveAction")}
              aria-label={saved ? t("questionUnsaveAction") : t("questionSaveAction")}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onShare}
            title={t("questionShareAction")}
            aria-label={t("questionShareAction")}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {question.imageUrl ? <ExamQuestionFigure url={question.imageUrl} alt={t("examQuizQuestionImageAlt")} /> : null}
        <h1 className="text-lg font-semibold text-foreground mb-4">{localized.text}</h1>
        <div className="space-y-2">
          {localized.options.map((opt, idx) => (
            <div
              key={idx}
              className={`rounded-lg border px-3 py-2 text-sm ${
                idx === question.correctIndex ? "border-emerald-500/60 bg-emerald-500/5" : "border-border"
              }`}
            >
              <p>{opt}</p>
              {idx === question.correctIndex && localized.explanation ? (
                <p className="text-xs text-muted-foreground mt-1">{localized.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4" />
          <h2 className="font-semibold">{t("questionCommentsTitle")}</h2>
        </div>

        {canComment ? (
          <div className="mb-4">
            <textarea
              className="w-full rounded-lg border border-border bg-background p-3 text-sm min-h-[88px]"
              placeholder={t("questionCommentPlaceholder")}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={2000}
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                size="icon"
                onClick={submitComment}
                disabled={commentBusy || commentText.trim().length < 2}
                title={t("questionCommentSubmit")}
                aria-label={t("questionCommentSubmit")}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">{t("questionCommentAuthHint")}</p>
        )}

        {loadingComments ? (
          <div className="text-sm text-muted-foreground">{t("questionCommentsLoading")}</div>
        ) : commentsError ? (
          <div className="text-sm text-rose-500">{commentsError}</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("questionCommentsEmpty")}</div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">
                    {c.commenter.name} <span className="text-muted-foreground font-normal">({roleLabel(c.commenter.role)})</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                    {canModerate ? (
                      <button
                        type="button"
                        className="text-rose-500 hover:text-rose-600"
                        title={t("questionCommentDelete")}
                        aria-label={t("questionCommentDelete")}
                        onClick={() => void removeComment(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>
        )}
        {!loadingComments && !commentsError && commentsTotal > COMMENTS_PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
              disabled={commentsPage <= 1}
              aria-label={t("questionCommentsPrev")}
              title={t("questionCommentsPrev")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {commentsPage} / {Math.max(1, Math.ceil(commentsTotal / COMMENTS_PAGE_SIZE))}
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={() =>
                setCommentsPage((p) => Math.min(Math.max(1, Math.ceil(commentsTotal / COMMENTS_PAGE_SIZE)), p + 1))
              }
              disabled={commentsPage >= Math.max(1, Math.ceil(commentsTotal / COMMENTS_PAGE_SIZE))}
              aria-label={t("questionCommentsNext")}
              title={t("questionCommentsNext")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
