"use client";

import { Redirect, useRoute } from "wouter";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import QuestionDetailView from "src/components/exam/QuestionDetailView";

export default function QuestionDetail() {
  const [examMatch, examParams] = useRoute("/exam-tests/question/:id");
  const [themeMatch, themeParams] = useRoute("/thematic-questions/question/:id");
  const match = examMatch || themeMatch;
  const params = examMatch ? examParams : themeParams;
  const questionId = (params?.id ?? "").trim();

  if (!match || !questionId) {
    return <Redirect to="/thematic-questions" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <QuestionDetailView questionId={questionId} backHref={themeMatch ? "/thematic-questions" : "/exam-tests"} />
      <Footer />
    </div>
  );
}
