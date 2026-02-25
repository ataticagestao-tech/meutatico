"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Users,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

interface OnboardingSummary {
  client_id: string;
  client_name: string;
  client_trade_name: string | null;
  client_status: string;
  total_steps: number;
  completed_steps: number;
}

interface OnboardingStep {
  id: string;
  client_id: string;
  step: string;
  label: string;
  is_done: boolean;
  done_at: string | null;
  done_by: string | null;
  done_by_name: string | null;
  order: string;
}

interface ClientDetail {
  client_id: string;
  client_name: string;
  client_trade_name: string | null;
  client_status: string;
  steps: OnboardingStep[];
  total_steps: number;
  completed_steps: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<OnboardingSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOnboardings() {
      try {
        const { data } = await api.get("/onboarding");
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load onboardings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOnboardings();
  }, []);

  async function loadDetail(clientId: string) {
    setSelectedClientId(clientId);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/onboarding/${clientId}`);
      setDetail(data);
    } catch (err) {
      console.error("Failed to load onboarding detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleStep(stepId: string, isDone: boolean) {
    if (!selectedClientId || !detail) return;
    setToggling(stepId);
    try {
      await api.patch(`/onboarding/${selectedClientId}/steps/${stepId}`, {
        is_done: isDone,
      });
      // Refresh detail
      const { data } = await api.get(`/onboarding/${selectedClientId}`);
      setDetail(data);
      // Update summary list
      setClients((prev) =>
        prev.map((c) =>
          c.client_id === selectedClientId
            ? { ...c, completed_steps: data.completed_steps }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to toggle step:", err);
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <PageWrapper
        title="Onboarding de Clientes"
        breadcrumb={[
          { label: "Clientes", href: "/clients" },
          { label: "Onboarding" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Onboarding de Clientes"
      breadcrumb={[
        { label: "Clientes", href: "/clients" },
        { label: "Onboarding" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <div className="bg-background-primary border border-border rounded-xl">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground-primary">
                Clientes ({clients.length})
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {clients.length === 0 ? (
                <div className="p-8 text-center">
                  <Users size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-sm text-foreground-tertiary">Nenhum cliente cadastrado</p>
                </div>
              ) : (
                clients.map((client) => {
                  const progress =
                    client.total_steps > 0
                      ? Math.round((client.completed_steps / client.total_steps) * 100)
                      : 0;
                  const isSelected = selectedClientId === client.client_id;

                  return (
                    <button
                      key={client.client_id}
                      onClick={() => loadDetail(client.client_id)}
                      className={`w-full text-left p-4 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                        isSelected ? "bg-background-secondary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground-primary truncate">
                          {client.client_trade_name || client.client_name}
                        </span>
                        <ChevronRight size={14} className="text-foreground-tertiary shrink-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progress === 100 ? "bg-green-500" : "bg-brand-primary"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-foreground-tertiary whitespace-nowrap">
                          {client.completed_steps}/{client.total_steps}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Onboarding Detail */}
        <div className="lg:col-span-2">
          {!selectedClientId ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <Users size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
              <p className="text-sm text-foreground-tertiary">
                Selecione um cliente para ver o checklist de onboarding
              </p>
            </div>
          ) : detailLoading ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <Loader2 size={24} className="animate-spin text-brand-primary mx-auto" />
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
                      <p className="text-xs text-foreground-tertiary">{detail.client_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/clients/${detail.client_id}`)}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Ver ficha completa
                  </button>
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
                            ? Math.round((detail.completed_steps / detail.total_steps) * 100)
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
                    key={step.id}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
                      step.is_done
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
                        : "border-border bg-background-secondary"
                    }`}
                  >
                    <button
                      onClick={() => toggleStep(step.id, !step.is_done)}
                      disabled={toggling === step.id}
                      className="mt-0.5 shrink-0"
                    >
                      {toggling === step.id ? (
                        <Loader2 size={20} className="animate-spin text-brand-primary" />
                      ) : step.is_done ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <Circle size={20} className="text-foreground-tertiary hover:text-brand-primary transition-colors" />
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
    </PageWrapper>
  );
}
