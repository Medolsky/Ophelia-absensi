"use client";

import { useState } from "react";
import { DutySessionData } from "@/types";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface DutyCalendarProps {
  sessions: DutySessionData[];
}

export function DutyCalendar({ sessions }: DutyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Map duty seconds per day for this month
  const dutySecondsPerDay: Record<number, number> = {};
  sessions.forEach((s) => {
    const sDate = new Date(s.startedAt);
    if (sDate.getFullYear() === year && sDate.getMonth() === month) {
      const day = sDate.getDate();
      dutySecondsPerDay[day] = (dutySecondsPerDay[day] || 0) + s.durationSeconds;
    }
  });

  // Calculate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Adjust so Monday is 0
  const startOffset = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatHoursShort = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (hours === 0 && minutes === 0) return "";
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`;
  };

  const daysOfWeek = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];

  return (
    <div className="rounded-2xl bg-[#111111] border border-[#222] p-3.5 sm:p-6 shadow-xl w-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#FF1E2D]" />
          <h3 className="text-sm sm:text-base font-bold text-white capitalize">{monthName}</h3>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            className="p-1.5 sm:p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#252525] text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            className="p-1.5 sm:p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#252525] text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="min-w-[280px]">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-0.5 sm:py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Leading empty slots */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-14 sm:h-20 rounded-lg sm:rounded-xl bg-[#090909]/50 border border-transparent opacity-30"
              />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const totalSecs = dutySecondsPerDay[dayNum] || 0;
              const hasDuty = totalSecs > 0;
              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              // Color intensity badge based on PRD Section 13 (<4h low, 4-8h normal, >8h high)
              const hours = totalSecs / 3600;
              let badgeColor = "bg-neutral-800 text-neutral-400";
              if (hours > 8) {
                badgeColor = "bg-[#E50914] text-white font-bold glow-red-sm";
              } else if (hours >= 4) {
                badgeColor = "bg-[#E50914]/25 text-[#FF1E2D] font-semibold border border-[#E50914]/40";
              } else if (hours > 0) {
                badgeColor = "bg-neutral-800/90 text-neutral-300 border border-neutral-700/50";
              }

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`h-14 sm:h-20 p-1 sm:p-2 rounded-lg sm:rounded-xl border flex flex-col justify-between transition-colors overflow-hidden ${
                    isToday
                      ? "bg-[#181818] border-[#FF1E2D]/60 ring-1 ring-[#FF1E2D]/30"
                      : "bg-[#141414] border-[#222] hover:border-[#333]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] sm:text-xs font-mono font-bold ${
                        isToday ? "text-[#FF1E2D]" : "text-neutral-300"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[8px] sm:text-[9px] font-mono px-0.5 sm:px-1 bg-[#E50914]/20 text-[#FF1E2D] rounded leading-none">
                        NOW
                      </span>
                    )}
                  </div>

                  {hasDuty ? (
                    <div className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded text-center truncate ${badgeColor}`}>
                      ● {formatHoursShort(totalSecs)}
                    </div>
                  ) : (
                    <div className="text-[8px] sm:text-[10px] text-neutral-700 text-center font-mono">
                      OFF
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
