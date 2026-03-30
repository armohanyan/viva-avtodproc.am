import { Link } from "wouter";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { CountUpText } from "src/lib/motion";
import { useLang } from "src/lib/i18n";
import { Star, CalendarDays, Users, MapPin, Car, Gauge } from "lucide-react";
import type { Instructor } from "src/data/instructors";

type Props = {
  instructor: Instructor;
  showBookButton?: boolean;
  imageHeightClassName?: string;
  className?: string;
};

export default function InstructorCard({
  instructor,
  showBookButton = false,
  imageHeightClassName = "h-60",
  className,
}: Props) {
  const { t } = useLang();

  return (
    <Card className={`rounded-2xl border border-border shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full p-0 gap-0 ${className ?? ""}`}>
      <div className={`${imageHeightClassName} bg-muted overflow-hidden`}>
        <img
          src={instructor.imageSrc}
          alt={instructor.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <h3 className="font-bold text-lg text-foreground">{instructor.name}</h3>
          <div className="flex items-center gap-1 mt-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star
                key={j}
                className={`w-3.5 h-3.5 ${
                  j < Math.floor(instructor.rating)
                    ? "text-primary fill-primary"
                    : "text-muted-foreground fill-muted-foreground"
                }`}
              />
            ))}
            <CountUpText
              value={instructor.rating}
              decimals={1}
              className="text-xs text-muted-foreground ml-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-muted-foreground mb-5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span>{instructor.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary shrink-0" />
            <span>{instructor.car}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary shrink-0" />
            <span>{instructor.transmission}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span>
              <CountUpText value={`${instructor.students}+`} />
            </span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            <span>
              <CountUpText value={instructor.years} /> {t("experience")}
            </span>
          </div>
        </div>

        {showBookButton && (
          <div className="mt-4">
            <Link href="/register">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                {t("bookLesson")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
