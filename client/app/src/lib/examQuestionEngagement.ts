import type { ExamQuestion } from "src/data/examSampleQuestions";
import type { AccountType } from "src/types/auth.types";
import type { PaginatedList } from "src/types/pagination.types";
import { vivaApiJson } from "src/lib/vivaApi";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";

export type ExamQuestionComment = {
  id: number;
  questionId: string;
  text: string;
  createdAt: string;
  commenter: {
    id: number;
    name: string;
    role: AccountType;
  };
};

export type PaginatedQuestionComments = PaginatedList<ExamQuestionComment>;

type ExamQuestionDto = {
  id: string;
  text: Record<string, string>;
  options: Record<string, string[]>;
  explanation?: string;
  correctIndex: number;
  category: "rules" | "signs" | "safety";
  topicId?: string;
  imageUrl?: string | null;
};

function mapDto(q: ExamQuestionDto): ExamQuestion {
  const image = sameOriginStaffUploadUrl(q.imageUrl ?? null);
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    explanation: q.explanation,
    correctIndex: q.correctIndex,
    category: q.category,
    topicId: q.topicId,
    imageUrl: image ?? undefined,
  };
}

export async function loadQuestionById(questionId: string): Promise<ExamQuestion> {
  const row = await vivaApiJson<ExamQuestionDto>(`/exam-questions/${encodeURIComponent(questionId)}`);
  return mapDto(row);
}

export async function loadQuestionComments(
  questionId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedQuestionComments> {
  return vivaApiJson<PaginatedQuestionComments>(
    `/exam-questions/${encodeURIComponent(questionId)}/comments?page=${page}&pageSize=${pageSize}`,
  );
}

export async function addQuestionComment(questionId: string, text: string): Promise<ExamQuestionComment> {
  return vivaApiJson<ExamQuestionComment>(`/exam-questions/${encodeURIComponent(questionId)}/comments`, {
    method: "POST",
    body: { text },
  });
}

export async function deleteQuestionComment(questionId: string, commentId: number): Promise<void> {
  await vivaApiJson<void>(`/exam-questions/${encodeURIComponent(questionId)}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export async function getQuestionSavedState(questionId: string): Promise<boolean> {
  const row = await vivaApiJson<{ saved: boolean }>(`/exam-questions/${encodeURIComponent(questionId)}/saved`);
  return Boolean(row.saved);
}

export async function setQuestionSavedState(questionId: string, saved: boolean): Promise<boolean> {
  const row = await vivaApiJson<{ saved: boolean }>(`/exam-questions/${encodeURIComponent(questionId)}/saved`, {
    method: "PUT",
    body: { saved },
  });
  return Boolean(row.saved);
}

export async function loadMySavedQuestions(): Promise<ExamQuestion[]> {
  const rows = await vivaApiJson<ExamQuestionDto[]>("/exam-questions/saved/mine");
  return rows.map(mapDto);
}
