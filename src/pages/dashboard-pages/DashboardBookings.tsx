import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const instructors = ["All", "Armen Petrosyan", "Narine Hovhannisyan", "Vardan Grigoryan"];

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

type SlotStatus = "available" | "booked" | "mine";

const slotData: Record<string, Record<string, SlotStatus>> = {
  "09:00": { "2026-03-28": "available", "2026-03-29": "booked", "2026-03-30": "available", "2026-03-31": "available", "2026-04-01": "mine" },
  "10:00": { "2026-03-28": "mine", "2026-03-29": "available", "2026-03-30": "booked", "2026-03-31": "available", "2026-04-01": "available" },
  "11:00": { "2026-03-28": "booked", "2026-03-29": "available", "2026-03-30": "available", "2026-03-31": "booked", "2026-04-01": "available" },
  "12:00": { "2026-03-28": "available", "2026-03-29": "booked", "2026-03-30": "mine", "2026-03-31": "available", "2026-04-01": "booked" },
  "13:00": { "2026-03-28": "available", "2026-03-29": "available", "2026-03-30": "available", "2026-03-31": "booked", "2026-04-01": "available" },
  "14:00": { "2026-03-28": "booked", "2026-03-29": "mine", "2026-03-30": "available", "2026-03-31": "available", "2026-04-01": "booked" },
  "15:00": { "2026-03-28": "available", "2026-03-29": "available", "2026-03-30": "booked", "2026-03-31": "available", "2026-04-01": "available" },
  "16:00": { "2026-03-28": "available", "2026-03-29": "booked", "2026-03-30": "available", "2026-03-31": "booked", "2026-04-01": "mine" },
  "17:00": { "2026-03-28": "booked", "2026-03-29": "available", "2026-03-30": "available", "2026-03-31": "available", "2026-04-01": "available" },
};

function getWeekDays(offset: number) {
  const base = new Date("2026-03-28");
  base.setDate(base.getDate() + offset * 5);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("en", { weekday: "short" });
}

export default function DashboardBookings() {
  const { t } = useLang();
  const [instructor, setInstructor] = useState("Armen Petrosyan");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const days = getWeekDays(weekOffset);

  const getStatus = (time: string, date: string): SlotStatus => {
    return slotData[time]?.[date] || "available";
  };

  const slotStyle = (status: SlotStatus, isSelected: boolean) => {
    if (isSelected) return "bg-blue-600 text-white border-blue-600";
    if (status === "mine") return "bg-blue-100 text-blue-700 border-blue-200 cursor-default";
    if (status === "booked") return "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed";
    return "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer";
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("bookingTitle")}</h2>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left: Instructor + calendar */}
        <div className="xl:col-span-3 space-y-6">
          {/* Instructor Select */}
          <Card className="p-5 border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">{t("selectInstructor")}</h3>
            <div className="flex flex-wrap gap-2">
              {instructors.slice(1).map((ins) => (
                <button
                  key={ins}
                  onClick={() => setInstructor(ins)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${instructor === ins ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}
                >
                  {ins}
                </button>
              ))}
            </div>
          </Card>

          {/* Calendar */}
          <Card className="p-5 border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{t("selectDate")} & {t("selectTime")}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                  disabled={weekOffset === 0}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {days[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – {days[4].toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
                <button
                  onClick={() => setWeekOffset(w => w + 1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-slate-400 font-medium pr-4 py-2 w-16">Time</th>
                    {days.map((d, i) => (
                      <th key={i} className="text-center py-2 px-1">
                        <div className="text-xs text-slate-400 font-medium">{dayLabel(d)}</div>
                        <div className="text-sm font-semibold text-slate-700">{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-t border-slate-50">
                      <td className="text-xs text-slate-400 pr-4 py-1.5 font-medium">{time}</td>
                      {days.map((d, j) => {
                        const dateStr = fmt(d);
                        const status = getStatus(time, dateStr);
                        const isSelected = selected?.date === dateStr && selected?.time === time;
                        return (
                          <td key={j} className="py-1 px-1">
                            <div
                              onClick={() => {
                                if (status === "available") {
                                  setSelected({ date: dateStr, time });
                                  setConfirmed(false);
                                }
                              }}
                              className={`h-8 rounded-md border text-xs text-center flex items-center justify-center transition-colors ${slotStyle(status, isSelected)}`}
                            >
                              {status === "mine" ? "Mine" : status === "booked" ? "—" : ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-5 mt-4">
              {[
                { color: "bg-white border border-slate-200", label: t("available") },
                { color: "bg-blue-100 border border-blue-200", label: "My booking" },
                { color: "bg-slate-100 border border-slate-200", label: t("booked") },
                { color: "bg-blue-600", label: "Selected" },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded ${l.color}`} />
                  <span className="text-xs text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Confirm panel */}
        <div>
          <Card className="p-5 border-slate-100 sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-4">Booking Summary</h3>
            {!selected ? (
              <p className="text-sm text-slate-400">Select a time slot from the calendar to continue.</p>
            ) : confirmed ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900 text-sm">{t("bookingConfirmed")}</p>
                <p className="text-xs text-slate-500 mt-1">{selected.date} at {selected.time}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full text-xs"
                  onClick={() => { setSelected(null); setConfirmed(false); }}
                >
                  Book Another
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Instructor</span>
                    <span className="font-medium text-slate-900 text-xs">{instructor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Date</span>
                    <span className="font-medium text-slate-900 text-xs">{selected.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Time</span>
                    <span className="font-medium text-slate-900 text-xs">{selected.time}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium text-slate-900 text-xs">60 min</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setConfirmed(true)}
                >
                  {t("confirmBooking")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-400 text-xs"
                  onClick={() => setSelected(null)}
                >
                  Clear selection
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
