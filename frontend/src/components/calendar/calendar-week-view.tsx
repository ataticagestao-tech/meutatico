"use client";

import {
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
  format,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarItem } from "@/types/calendar";
import { getCalendarItemColor } from "@/lib/constants";

interface CalendarWeekViewProps {
  currentDate: Date;
  items: CalendarItem[];
  onSlotClick: (date: Date, hour: number) => void;
  onItemClick: (item: CalendarItem) => void;
}

const START_HOUR = 8;
const END_HOUR = 19;
const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

export function CalendarWeekView({
  currentDate,
  items,
  onSlotClick,
  onItemClick,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  // Monday to Friday only (skip Sunday=index 0, Saturday=index 6)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(
    (day) => day.getDay() !== 0 && day.getDay() !== 6
  );

  const allDayItems = items.filter((it) => it.all_day);
  const timedItems = items.filter((it) => !it.all_day);

  function getItemsForDay(day: Date, list: CalendarItem[]): CalendarItem[] {
    return list.filter((item) => {
      const start = parseISO(item.start_date);
      return isSameDay(start, day);
    });
  }

  function getItemStyle(item: CalendarItem) {
    const start = parseISO(item.start_date);
    const end = parseISO(item.end_date);
    const top =
      (getHours(start) - START_HOUR) * HOUR_HEIGHT +
      (getMinutes(start) / 60) * HOUR_HEIGHT;
    const duration = Math.max(differenceInMinutes(end, start), 30);
    const height = (duration / 60) * HOUR_HEIGHT;

    return { top: `${top}px`, height: `${height}px` };
  }

  return (
    <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
      {/* Header with day names */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border">
        <div className="border-r border-border" />
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={`
              px-2 py-3 text-center border-r border-border last:border-r-0
              ${isToday(day) ? "bg-brand-primary/5" : ""}
            `}
          >
            <div className="text-xs font-medium text-foreground-tertiary uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div
              className={`
                text-lg font-semibold mt-0.5
                ${isToday(day) ? "text-brand-primary" : "text-foreground-primary"}
              `}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      {allDayItems.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border">
          <div className="border-r border-border px-1 py-1.5 text-[10px] text-foreground-tertiary text-right">
            Dia todo
          </div>
          {weekDays.map((day, i) => {
            const dayAllDay = getItemsForDay(day, allDayItems);
            return (
              <div key={i} className="border-r border-border last:border-r-0 p-1 space-y-0.5">
                {dayAllDay.map((item) => (
                  <button
                    key={`${item.source_type}-${item.id}`}
                    onClick={() => onItemClick(item)}
                    className={`
                      w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium
                      text-white truncate block
                      ${getCalendarItemColor(item)}
                      hover:opacity-80 transition-opacity
                    `}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)] overflow-y-auto max-h-[600px]">
        {/* Hour gutter + day columns */}
        <div className="border-r border-border">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b border-border px-2 text-right text-[11px] text-foreground-tertiary"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="relative -top-2">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {weekDays.map((day, dayIdx) => {
          const dayTimed = getItemsForDay(day, timedItems);
          return (
            <div
              key={dayIdx}
              className={`relative border-r border-border last:border-r-0 ${
                isToday(day) ? "bg-brand-primary/[0.02]" : ""
              }`}
            >
              {/* Hour slots (clickable) */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  onClick={() => onSlotClick(day, hour)}
                  className="border-b border-border hover:bg-background-secondary cursor-pointer transition-colors"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Positioned events */}
              {dayTimed.map((item) => {
                const style = getItemStyle(item);
                return (
                  <button
                    key={`${item.source_type}-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    className={`
                      absolute left-0.5 right-0.5 rounded px-1.5 py-0.5
                      text-[11px] font-medium text-white overflow-hidden
                      ${getCalendarItemColor(item)}
                      hover:opacity-80 transition-opacity cursor-pointer
                    `}
                    style={style}
                    title={item.title}
                  >
                    <div className="truncate">{item.title}</div>
                    <div className="text-[10px] opacity-80">
                      {format(parseISO(item.start_date), "HH:mm")} -{" "}
                      {format(parseISO(item.end_date), "HH:mm")}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
