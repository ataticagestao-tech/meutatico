"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarItem } from "@/types/calendar";
import { CALENDAR_SOURCE_COLORS } from "@/lib/constants";

interface CalendarMonthViewProps {
  currentDate: Date;
  items: CalendarItem[];
  onDayClick: (date: Date) => void;
  onItemClick: (item: CalendarItem) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MAX_VISIBLE = 3;

export function CalendarMonthView({
  currentDate,
  items,
  onDayClick,
  onItemClick,
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function getItemsForDay(day: Date): CalendarItem[] {
    return items.filter((item) => {
      const start = parseISO(item.start_date);
      const end = parseISO(item.end_date);
      return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
    });
  }

  return (
    <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2.5 text-center text-xs font-semibold text-foreground-secondary uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayItems = getItemsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer
                transition-colors hover:bg-background-secondary
                ${!inMonth ? "opacity-40" : ""}
                ${idx % 7 === 0 ? "border-l-0" : ""}
              `}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1">
                <span
                  className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${today ? "bg-brand-primary text-white" : "text-foreground-primary"}
                  `}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayItems.slice(0, MAX_VISIBLE).map((item) => (
                  <button
                    key={`${item.source_type}-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    className={`
                      w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium
                      text-white truncate block
                      ${CALENDAR_SOURCE_COLORS[item.source_type] || "bg-gray-500"}
                      hover:opacity-80 transition-opacity
                    `}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > MAX_VISIBLE && (
                  <span className="text-[10px] text-foreground-tertiary px-1.5">
                    +{dayItems.length - MAX_VISIBLE} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
