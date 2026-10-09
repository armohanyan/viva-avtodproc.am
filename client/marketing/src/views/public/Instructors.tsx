"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import { useInstructors } from "src/modules/instructors/useInstructors";

export default function Instructors() {
  const { t } = useLang();
  const { instructors } = useInstructors();
  const visibleInstructors = instructors.filter((ins) => ins.status === "active");

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("instructorsTitle")}</h1>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleInstructors.map((ins, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <InstructorCard
                  instructor={ins}
                  showBookButton={true}
                  imageObjectFit="cover"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
