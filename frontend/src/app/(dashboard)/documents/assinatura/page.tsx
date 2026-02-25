"use client";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  FileSignature,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  Users,
  FileText,
  Loader2,
  Plus,
  ChevronRight,
  AlertCircle,
  Link2,
} from "lucide-react";

type SignatureStatus = "pending" | "signed" | "rejected" | "expired";

interface SignatureRequest {
  id: string;
  document_name: string;
  client_name: string;
  signer_name: string;
  signer_email: string;
  status: SignatureStatus;
  sent_at: string;
  signed_at?: string;
}

const STATUS_CONFIG: Record<SignatureStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: "Aguardando", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10", icon: Clock },
  signed: { label: "Assinado", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/10", icon: CheckCircle2 },
  rejected: { label: "Recusado", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/10", icon: XCircle },
  expired: { label: "Expirado", color: "text-foreground-tertiary", bg: "bg-background-secondary", icon: AlertCircle },
};

// Demo data
const DEMO_SIGNATURES: SignatureRequest[] = [
  {
    id: "1",
    document_name: "Contrato de Prestação de Serviços",
    client_name: "Tech Solutions LTDA",
    signer_name: "João Silva",
    signer_email: "joao@techsolutions.com",
    status: "pending",
    sent_at: "2026-02-20T14:30:00",
  },
  {
    id: "2",
    document_name: "Termo de Confidencialidade (NDA)",
    client_name: "Alpha Comércio ME",
    signer_name: "Maria Oliveira",
    signer_email: "maria@alphacomercio.com",
    status: "signed",
    sent_at: "2026-02-15T10:00:00",
    signed_at: "2026-02-16T09:22:00",
  },
  {
    id: "3",
    document_name: "Autorização de Acesso Bancário",
    client_name: "Distribuidora Norte SA",
    signer_name: "Carlos Santos",
    signer_email: "carlos@distnorte.com",
    status: "signed",
    sent_at: "2026-02-10T16:45:00",
    signed_at: "2026-02-11T11:05:00",
  },
  {
    id: "4",
    document_name: "Aditivo Contratual",
    client_name: "Startup XYZ LTDA",
    signer_name: "Ana Costa",
    signer_email: "ana@startupxyz.com",
    status: "expired",
    sent_at: "2026-01-25T08:00:00",
  },
];

export default function AssinaturaDigitalPage() {
  const [connected] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? DEMO_SIGNATURES
    : DEMO_SIGNATURES.filter((s) => s.status === filter);

  const summary = {
    total: DEMO_SIGNATURES.length,
    pending: DEMO_SIGNATURES.filter((s) => s.status === "pending").length,
    signed: DEMO_SIGNATURES.filter((s) => s.status === "signed").length,
    rejected: DEMO_SIGNATURES.filter((s) => s.status === "rejected").length,
    expired: DEMO_SIGNATURES.filter((s) => s.status === "expired").length,
  };

  return (
    <PageWrapper
      title="Assinatura Digital"
      breadcrumb={[
        { label: "Documentos", href: "/documents" },
        { label: "Assinatura Digital" },
      ]}
    >
      {/* Connection Banner */}
      {!connected && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <FileSignature size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground-primary mb-1">
                Configurar Assinatura Digital
              </h3>
              <p className="text-sm text-foreground-secondary mb-4">
                Integre com um provedor de assinatura eletrônica (DocuSign, Clicksign, D4Sign)
                para enviar documentos para assinatura diretamente pelo sistema.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <Link2 size={14} />
                  Configurar Integração
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-foreground-secondary bg-background-secondary border border-border rounded-lg hover:border-brand-primary/30 transition-colors">
                  <Eye size={14} />
                  Ver Provedores Suportados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { key: "all", label: "Total", value: summary.total, color: "text-foreground-primary", bg: "bg-background-secondary" },
          { key: "pending", label: "Aguardando", value: summary.pending, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10" },
          { key: "signed", label: "Assinados", value: summary.signed, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/10" },
          { key: "rejected", label: "Recusados", value: summary.rejected, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/10" },
          { key: "expired", label: "Expirados", value: summary.expired, color: "text-foreground-tertiary", bg: "bg-background-secondary" },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setFilter(card.key)}
            className={`p-3 rounded-xl text-center transition-all ${
              filter === card.key
                ? "ring-2 ring-brand-primary " + card.bg
                : card.bg + " hover:ring-1 hover:ring-border"
            }`}
          >
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-foreground-tertiary mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-secondary">
          {filtered.length} documento{filtered.length !== 1 ? "s" : ""}
        </p>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors">
          <Plus size={14} />
          Nova Solicitação
        </button>
      </div>

      {/* Signatures List */}
      <div className="space-y-2">
        {filtered.map((sig) => {
          const config = STATUS_CONFIG[sig.status];
          const Icon = config.icon;
          return (
            <div
              key={sig.id}
              className={`flex items-center gap-4 p-4 rounded-xl border border-border hover:border-brand-primary/30 transition-colors ${config.bg}`}
            >
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon size={20} className={config.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground-primary truncate">
                  {sig.document_name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-foreground-tertiary">
                    {sig.client_name}
                  </span>
                  <span className="text-xs text-foreground-tertiary">
                    → {sig.signer_name} ({sig.signer_email})
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
                <p className="text-[10px] text-foreground-tertiary mt-0.5">
                  {sig.signed_at
                    ? `Assinado em ${new Date(sig.signed_at).toLocaleDateString("pt-BR")}`
                    : `Enviado em ${new Date(sig.sent_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <ChevronRight size={16} className="text-foreground-tertiary shrink-0" />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <FileSignature size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary">
            Nenhum documento nesta categoria.
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
