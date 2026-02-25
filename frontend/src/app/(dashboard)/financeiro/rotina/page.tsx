"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronRightIcon,
  Users,
  CalendarDays,
} from "lucide-react";
import api from "@/lib/api";

interface RoutineSummary {
  client_id: string;
  client_name: string;
  client_trade_name: string | null;
  month: number;
  year: number;
  total_steps: number;
  completed_steps: number;
}

interface RoutineStep {
  field: string;
  label: string;
  is_done: boolean;
  done_at: string | null;
  done_by: string | null;
  done_by_name: string | null;
}

interface RoutineDetail {
  id: string;
  client_id: string;
  client_name: string;
  client_trade_name: string | null;
  month: number;
  year: number;
  steps: RoutineStep[];
  total_steps: number;
  completed_steps: number;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function RotinaPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RoutineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function fetchRoutines() {
    setLoading(true);
    try {
      const { data } = await api.get(`/financeiro/rotina?mes=${mes}&ano=${ano}`);
      setRoutines(Array.isArray(data) ? data : []);
    } catch {
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRoutines();
    setSelectedClientId(null);
    setDetail(null);
  }, [mes, ano]);

  async function loadDetail(clientId: string) {
    setSelectedClientId(clientId);
    setDetailLoading(true);
    try {
      const { data } = await api.get(
        `/financeiro/rotina/${clientId}?mes=${mes}&ano=${ano}`
      );
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleStep(field: string, isDone: boolean) {
    if (!selectedClientId) return;
    setToggling(field);
    try {
      await api.patch(
        `/financeiro/rotina/${selectedClientId}/${field}?mes=${mes}&ano=${ano}&is_done=${isDone}`
      );
      // Refresh detail
      const { data } = await api.get(
        `/financeiro/rotina/${selectedClientId}?mes=${mes}&ano=${ano}`
      );
      setDetail(data);
      // Update summary
      setRoutines((prev) =>
        prev.map((r) =>
          r.client_id === selectedClientId
            ? { ...r, completed_steps: data.completed_steps }
            : r
        )
      );
    } catch (err) {
      console.error("Failed to toggle step:", err);
    } finally {
      setToggling(null);
    }
  }

  function prevMonth() {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  }

  function nextMonth() {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  }

  // Count overall progress
  const totalSteps = routines.reduce((acc, r) => acc + r.total_steps, 0);
  const completedSteps = routines.reduce((acc, r) => acc + r.completed_steps, 0);
  const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <PageWrapper
      title="Rotina Mensal"
      breadcrumb={[
        { label: "Financeiro", href: "/financeiro" },
        { label: "Rotina Mensal" },
      ]}
    >
      {/* Period Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <ChevronLeft size={18} className="text-foreground-secondary" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-primary" />
            <span className="text-lg font-semibold text-foreground-primary">
              {MESES[mes - 1]} {ano}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <ChevronRightIcon size={18} className="text-foreground-secondary" />
          </button>
        </div>

        {/* Overall progress */}
        {routines.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground-secondary">
              Progresso geral:
            </span>
            <div className="w-32 h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overallProgress === 100 ? "bg-green-500" : "bg-brand-primary"
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground-primary">
              {overallProgress}%
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="lg:col-span-1">
            <div className="bg-background-primary border border-border rounded-xl">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground-primary">
                  Clientes ({routines.length})
                </h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {routines.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                    <p className="text-sm text-foreground-tertiary">
                      Nenhum cliente com rotina
                    </p>
                  </div>
                ) : (
                  routines.map((routine) => {
                    const progress =
                      routine.total_steps > 0
                        ? Math.round(
                            (routine.completed_steps / routine.total_steps) * 100
                          )
                        : 0;
                    const isSelected = selectedClientId === routine.client_id;
                    const allDone = routine.completed_steps === routine.total_steps;

                    return (
                      <button
                        key={routine.client_id}
                        onClick={() => loadDetail(routine.client_id)}
                        className={`w-full text-left p-4 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                          isSelected ? "bg-background-secondary" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {allDone && (
                              <CheckCircle2
                                size={14}
                                className="text-green-500 shrink-0"
                              />
                            )}
                            <span className="text-sm font-medium text-foreground-primary truncate">
                              {routine.client_trade_name || routine.client_name}
                            </span>
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-foreground-tertiary shrink-0"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                allDone ? "bg-green-500" : "bg-brand-primary"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-foreground-tertiary whitespace-nowrap">
                            {routine.completed_steps}/{routine.total_steps}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Routine Detail */}
          <div className="lg:col-span-2">
            {!selectedClientId ? (
              <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
                <Users
                  size={48}
                  className="mx-auto mb-3 text-foreground-tertiary opacity-40"
                />
                <p className="text-sm text-foreground-tertiary">
                  Selecione um cliente para ver o checklist da rotina mensal
                </p>
              </div>
            ) : detailLoading ? (
              <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
                <Loader2
                  size={24}
                  className="animate-spin text-brand-primary mx-auto"
                />
              </div>
            ) : detail ? (
              <div className="bg-background-primary border border-border rounded-xl">
                {/* Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground-primary">
                        {detail.client_trade_name || detail.client_name}
                      </h3>
                      {detail.client_trade_name && (
                        <p className="text-xs text-foreground-tertiary">
                          {detail.client_name}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-foreground-tertiary">
                      {MESES[detail.month - 1]} {detail.year}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          detail.completed_steps === detail.total_steps
                            ? "bg-green-500"
                            : "bg-brand-primary"
                        }`}
                        style={{
                          width: `${
                            detail.total_steps > 0
                              ? Math.round(
                                  (detail.completed_steps / detail.total_steps) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground-secondary whitespace-nowrap">
                      {detail.completed_steps}/{detail.total_steps} etapas
                    </span>
                  </div>
                </div>

                {/* Steps */}
                <div className="p-5 space-y-2">
                  {detail.steps.map((step) => (
                    <div
                      key={step.field}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
                        step.is_done
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
                          : "border-border bg-background-secondary"
                      }`}
                    >
                      <button
                        onClick={() => toggleStep(step.field, !step.is_done)}
                        disabled={toggling === step.field}
                        className="mt-0.5 shrink-0"
                      >
                        {toggling === step.field ? (
                          <Loader2
                            size={20}
                            className="animate-spin text-brand-primary"
                          />
                        ) : step.is_done ? (
                          <CheckCircle2 size={20} className="text-green-500" />
                        ) : (
                          <Circle
                            size={20}
                            className="text-foreground-tertiary hover:text-brand-primary transition-colors"
                          />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            step.is_done
                              ? "text-green-700 dark:text-green-400 line-through"
                              : "text-foreground-primary"
                          }`}
                        >
                          {step.label}
                        </p>
                        {step.is_done && step.done_by_name && step.done_at && (
                          <p className="text-xs text-foreground-tertiary mt-1">
                            Concluído por {step.done_by_name} em{" "}
                            {new Date(step.done_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
