"use client";

import {
  isToday,
  parseISO,
  format,
  getHours,
  getMinutes,
  differenceInMinutes,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarItem } from "@/types/calendar";
import { getCalendarItemColor, CALENDAR_SOURCE_LABELS } from "@/lib/constants";

interface CalendarDayViewProps {
  currentDate: Date;
  items: CalendarItem[];
  onSlotClick: (date: Date, hour: number) => void;
  onItemClick: (item: CalendarItem) => void;
}

const START_HOUR = 8;
const END_HOUR = 19;
const HOUR_HEIGHT = 72;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

export function CalendarDayView({
  currentDate,
  items,
  onSlotClick,
  onItemClick,
}: CalendarDayViewProps) {
  const allDayItems = items.filter(
    (it) => it.all_day && isSameDay(parseISO(it.start_date), currentDate)
  );
  const timedItems = items.filter(
    (it) => !it.all_day && isSameDay(parseISO(it.start_date), currentDate)
  );

  function getItemStyle(item: CalendarItem) {
    const start = parseISO(item.start_date);
    const end = parseISO(item.end_date);
    const top =
      (getHours(start) - START_HOUR) * HOUR_HEIGHT +
      (getMinutes(start) / 60) * HOUR_HEIGHT;
    const duration = Math.max(differenceInMinutes(end, start), 30);
    const height = (duration / 60) * HOUR_HEIGHT;

    return { top: `${top}px`, height: `${Math.max(height, 36)}px` };
  }

  const today = isToday(currentDate);

  return (
    <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[80px_1fr] border-b border-border">
        <div className="border-r border-border" />
        <div className={`px-4 py-3 ${today ? "bg-brand-primary/5" : ""}`}>
          <div className="text-xs font-medium text-foreground-tertiary uppercase">
            {format(currentDate, "EEEE", { locale: ptBR })}
          </div>
          <div
            className={`text-2xl font-bold mt-0.5 ${
              today ? "text-brand-primary" : "text-foreground-primary"
            }`}
          >
            {format(currentDate, "d 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* All-day events */}
      {allDayItems.length > 0 && (
        <div className="grid grid-cols-[80px_1fr] border-b border-border">
          <div className="border-r border-border px-2 py-2 text-[11px] text-foreground-tertiary text-right">
            Dia todo
          </div>
          <div className="p-2 space-y-1">
            {allDayItems.map((item) => (
              <button
                key={`${item.source_type}-${item.id}`}
                onClick={() => onItemClick(item)}
                className={`
                  w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium
                  text-white flex items-center gap-2
                  ${getCalendarItemColor(item)}
                  hover:opacity-80 transition-opacity
                `}
              >
                <span className="truncate">{item.title}</span>
                <span className="text-[10px] opacity-80 shrink-0">
                  {CALENDAR_SOURCE_LABELS[item.source_type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[80px_1fr] overflow-y-auto max-h-[600px]">
        {/* Hour gutter */}
        <div className="border-r border-border">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b border-border px-2 text-right text-xs text-foreground-tertiary"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="relative -top-2">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className={`relative ${today ? "bg-brand-primary/[0.02]" : ""}`}>
          {/* Hour slots */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              onClick={() => onSlotClick(currentDate, hour)}
              className="border-b border-border hover:bg-background-secondary cursor-pointer transition-colors"
              style={{ height: `${HOUR_HEIGHT}px` }}
            />
          ))}

          {/* Positioned events */}
          {timedItems.map((item) => {
            const style = getItemStyle(item);
            return (
              <button
                key={`${item.source_type}-${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item);
                }}
                className={`
                  absolute left-1 right-1 rounded-lg px-3 py-1.5
                  text-sm font-medium text-white overflow-hidden
                  ${getCalendarItemColor(item)}
                  hover:opacity-80 transition-opacity cursor-pointer
                `}
                style={style}
                title={item.title}
              >
                <div className="font-semibold truncate">{item.title}</div>
                <div className="text-xs opacity-80">
                  {format(parseISO(item.start_date), "HH:mm")} -{" "}
                  {format(parseISO(item.end_date), "HH:mm")}
                </div>
                {item.description && (
                  <div className="text-xs opacity-70 truncate mt-0.5">
                    {item.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
