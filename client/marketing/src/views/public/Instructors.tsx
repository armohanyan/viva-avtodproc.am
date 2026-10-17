"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import InstructorLocationFilter from "src/components/InstructorLocationFilter";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { useBranches } from "src/modules/branches";
import { useCities } from "src/modules/cities";
import {
  filterInstructorsByLocation,
  instructorCityGroups,
} from "src/modules/instructors/instructorLocationFilter";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function Instructors({
  initialCity = "",
  initialRegion = "",
}: {
  initialCity?: string;
  initialRegion?: string;
}) {
  const { t } = useLang();
  const router = useRouter();
  const { instructors } = useInstructors();
  const { branches } = useBranches();
  const { cities } = useCities();
  const [cityKey, setCityKey] = useState(initialCity);
  const [regionId, setRegionId] = useState(initialRegion);
  const groups = useMemo(() => instructorCityGroups(cities, branches), [cities, branches]);
  const visibleInstructors = useMemo(
    () => filterInstructorsByLocation(instructors, groups, cityKey, regionId),
    [instructors, groups, cityKey, regionId],
  );

  const writeQuery = (nextCity: string, nextRegion: string) => {
    const params = new URLSearchParams();
    if (nextCity) params.set("city", nextCity);
    if (nextRegion) params.set("region", nextRegion);
    const query = params.toString();
    router.replace(query ? `/instructors?${query}` : "/instructors", { scroll: false });
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold">{t("instructorsTitle")}</h1>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InstructorLocationFilter
            groups={groups}
            cityKey={cityKey}
            regionId={regionId}
            onCityChange={(next) => {
              setCityKey(next);
              setRegionId("");
              writeQuery(next, "");
            }}
            onRegionChange={(next) => {
              setRegionId(next);
              writeQuery(cityKey, next);
            }}
          />
          {visibleInstructors.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {visibleInstructors.map((ins, i) => (
                <Reveal key={ins.id} delay={Math.min(i, 8) * 0.04}>
                  <InstructorCard
                    instructor={ins}
                    showBookButton={true}
                    imageObjectFit="cover"
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">{t("instructorFilterEmpty")}</p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
