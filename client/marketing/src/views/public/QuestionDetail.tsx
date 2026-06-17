"use client";

import { Redirect } from "wouter";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import QuestionDetailView from "src/components/exam/QuestionDetailView";

type Props = {
  questionId?: string;
  backHref?: string;
};

export default function QuestionDetail({ questionId: providedQuestionId, backHref: providedBackHref }: Props = {}) {
  if (providedQuestionId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <QuestionDetailView questionId={providedQuestionId} backHref={providedBackHref ?? "/exam-tests"} />
        <Footer />
      </div>
    );
  }

  if (typeof window === "undefined") {
    return null;
  }

  const path = window.location.pathname || "";
  const examMatch = path.match(/^\/exam-tests\/question\/([^/]+)$/);
  const themeMatch = path.match(/^\/thematic-questions\/question\/([^/]+)$/);
  const roadSignsMatch = path.match(/^\/road-signs\/question\/([^/]+)$/);
  const questionId = (
    decodeURIComponent(examMatch?.[1] ?? themeMatch?.[1] ?? roadSignsMatch?.[1] ?? "") || ""
  ).trim();
  const backHref = roadSignsMatch ? "/road-signs" : themeMatch ? "/thematic-questions" : "/exam-tests";

  if (!questionId) {
    return <Redirect to="/thematic-questions" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <QuestionDetailView questionId={questionId} backHref={backHref} />
      <Footer />
    </div>
  );
}
