"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  setHours,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import { CalendarDayView } from "@/components/calendar/calendar-day-view";
import { CalendarCreateModal } from "@/components/calendar/calendar-create-modal";
import { CalendarDetailModal } from "@/components/calendar/calendar-detail-modal";
import api from "@/lib/api";
import type { CalendarItem, CalendarView } from "@/types/calendar";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [sourceFilter, setSourceFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  // Reference data
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<
    { id: string; trade_name?: string; company_name: string }[]
  >([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDate, setCreateDate] = useState(new Date());
  const [createHour, setCreateHour] = useState<number | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch reference data
  useEffect(() => {
    api
      .get("/clients?per_page=100")
      .then((r: any) => setClients(r.data.items ?? []))
      .catch(() => {});
    api
      .get("/users")
      .then((r: any) => setUsers(r.data.items ?? r.data ?? []))
      .catch(() => {});
  }, []);

  // Calculate date range based on view
  const getDateRange = useCallback(() => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart, { locale: ptBR }),
        end: endOfWeek(monthEnd, { locale: ptBR }),
      };
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate, { locale: ptBR });
      return {
        start: weekStart,
        end: endOfWeek(currentDate, { locale: ptBR }),
      };
    } else {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      };
    }
  }, [currentDate, view]);

  // Fetch calendar items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams();
      params.set("start", start.toISOString());
      params.set("end", end.toISOString());
      if (sourceFilter) params.set("source_type", sourceFilter);
      if (userFilter) params.set("assigned_user_id", userFilter);
      if (clientFilter) params.set("client_id", clientFilter);

      const { data } = await api.get(`/calendar/events?${params.toString()}`);
      setItems(data.items ?? []);
    } catch (err) {
      console.error("Failed to fetch calendar items:", err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, sourceFilter, userFilter, clientFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Navigation
  function handlePrev() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function handleNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  // Day click → open create modal
  function handleDayClick(date: Date) {
    setCreateDate(date);
    setCreateHour(undefined);
    setShowCreateModal(true);
  }

  // Slot click (week/day) → open create modal with hour
  function handleSlotClick(date: Date, hour: number) {
    setCreateDate(date);
    setCreateHour(hour);
    setShowCreateModal(true);
  }

  // Item click → open detail modal
  function handleItemClick(item: CalendarItem) {
    setSelectedItem(item);
    setShowDetailModal(true);
  }

  return (
    <PageWrapper
      title="Calendario"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Calendario" },
      ]}
      actions={
        <button
          onClick={() => {
            setCreateDate(new Date());
            setCreateHour(undefined);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Novo Evento
        </button>
      }
    >
      {/* Toolbar */}
      <CalendarToolbar
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        userFilter={userFilter}
        onUserFilterChange={setUserFilter}
        clientFilter={clientFilter}
        onClientFilterChange={setClientFilter}
        users={users}
        clients={clients}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Views */}
      {!loading && view === "month" && (
        <CalendarMonthView
          currentDate={currentDate}
          items={items}
          onDayClick={handleDayClick}
          onItemClick={handleItemClick}
        />
      )}

      {!loading && view === "week" && (
        <CalendarWeekView
          currentDate={currentDate}
          items={items}
          onSlotClick={handleSlotClick}
          onItemClick={handleItemClick}
        />
      )}

      {!loading && view === "day" && (
        <CalendarDayView
          currentDate={currentDate}
          items={items}
          onSlotClick={handleSlotClick}
          onItemClick={handleItemClick}
        />
      )}

      {/* Create Modal */}
      <CalendarCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialDate={createDate}
        initialHour={createHour}
        users={users}
        clients={clients}
        onCreated={fetchItems}
      />

      {/* Detail Modal */}
      <CalendarDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        users={users}
        clients={clients}
        onUpdated={fetchItems}
      />
    </PageWrapper>
  );
}
