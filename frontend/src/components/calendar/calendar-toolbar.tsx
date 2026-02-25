"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarView } from "@/types/calendar";

interface CalendarToolbarProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  sourceFilter: string;
  onSourceFilterChange: (v: string) => void;
  userFilter: string;
  onUserFilterChange: (v: string) => void;
  clientFilter: string;
  onClientFilterChange: (v: string) => void;
  users: { id: string; name: string }[];
  clients: { id: string; trade_name?: string; company_name: string }[];
}

const views: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Dia" },
];

export function CalendarToolbar({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  sourceFilter,
  onSourceFilterChange,
  userFilter,
  onUserFilterChange,
  clientFilter,
  onClientFilterChange,
  users,
  clients,
}: CalendarToolbarProps) {
  const label =
    view === "month"
      ? format(currentDate, "MMMM yyyy", { locale: ptBR })
      : view === "week"
        ? `${format(currentDate, "dd MMM", { locale: ptBR })} - ${format(
            new Date(currentDate.getTime() + 6 * 86400000),
            "dd MMM yyyy",
            { locale: ptBR }
          )}`
        : format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });

  const selectClass =
    "h-9 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  return (
    <div className="bg-background-primary border border-border rounded-xl p-4 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToday}
            className="h-9 px-3 border border-border rounded-lg text-sm font-medium text-foreground-primary hover:bg-background-tertiary transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-secondary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-secondary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-foreground-primary capitalize">
            {label}
          </h2>
        </div>

        {/* Right: View tabs + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {views.map((v) => (
              <button
                key={v.value}
                onClick={() => onViewChange(v.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v.value
                    ? "bg-brand-primary text-white"
                    : "bg-background-primary text-foreground-secondary hover:bg-background-tertiary"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <select
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Todos os tipos</option>
            <option value="task">Tarefas</option>
            <option value="ticket">Solicitacoes</option>
            <option value="event">Eventos</option>
          </select>

          <select
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Responsavel</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={clientFilter}
            onChange={(e) => onClientFilterChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.trade_name || c.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
