"use client";

import { Redirect, useRoute } from "wouter";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import QuestionDetailView from "src/components/exam/QuestionDetailView";

export default function QuestionDetail() {
  const [examMatch, examParams] = useRoute("/exam-tests/question/:id");
  const [themeMatch, themeParams] = useRoute("/thematic-questions/question/:id");
  const [roadSignsMatch, roadSignsParams] = useRoute("/road-signs/question/:id");
  const match = examMatch || themeMatch || roadSignsMatch;
  const params = roadSignsMatch ? roadSignsParams : examMatch ? examParams : themeParams;
  const questionId = (params?.id ?? "").trim();

  if (!match || !questionId) {
    return <Redirect to="/thematic-questions" />;
  }

  const backHref = roadSignsMatch ? "/road-signs" : themeMatch ? "/thematic-questions" : "/exam-tests";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <QuestionDetailView questionId={questionId} backHref={backHref} />
      <Footer />
    </div>
  );
}
