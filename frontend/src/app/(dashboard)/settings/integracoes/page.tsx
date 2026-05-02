"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Cloud,
  Mail,
  MessageSquare,
  HardDrive,
  Calendar,
  Database,
  RefreshCw,
  Instagram,
  LogOut,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickTooltip } from "@/components/ui/tooltip";

interface IntegrationItem {
  key: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  statusEndpoint: string;
  configKeys: string[];
  oauthConnect?: boolean;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    key: "supabase",
    name: "Supabase Financeiro",
    description: "Conexão com o banco de dados financeiro (ataticagestao.com) para leitura de dados de clientes, dashboard financeiro e WhatsApp.",
    icon: Database,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    statusEndpoint: "/financeiro/status",
    configKeys: ["SUPABASE_FINANCEIRO_URL", "SUPABASE_FINANCEIRO_SERVICE_KEY"],
  },
  {
    key: "smtp",
    name: "Email (SMTP)",
    description: "Envio de emails via SMTP para comunicação com clientes. Suporta Gmail, Outlook e servidores customizados.",
    icon: Mail,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    statusEndpoint: "/comunicacao/email-status",
    configKeys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"],
  },
  {
    key: "onedrive",
    name: "OneDrive / SharePoint",
    description: "Armazenamento de documentos na nuvem via Microsoft Graph API. Pastas organizadas por cliente.",
    icon: HardDrive,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    statusEndpoint: "/onedrive/status",
    configKeys: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
  },
  {
    key: "whatsapp",
    name: "WhatsApp (Leitura)",
    description: "Leitura de mensagens e contatos do WhatsApp via Supabase. Somente leitura — o envio é feito pelo sistema financeiro.",
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    statusEndpoint: "/whatsapp/status",
    configKeys: ["SUPABASE_FINANCEIRO_URL"],
  },
  {
    key: "google",
    name: "Google Calendar",
    description: "Sincronização bidirecional com Google Calendar. Crie eventos com Google Meet automaticamente.",
    icon: Calendar,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    statusEndpoint: "/google-calendar/status",
    configKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    oauthConnect: true,
  },
  {
    key: "instagram",
    name: "Instagram Business",
    description: "Métricas do perfil, posts recentes e insights da conta Instagram Business da Tática. Somente leitura via Graph API v21.0.",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    statusEndpoint: "/instagram/status",
    configKeys: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "INSTAGRAM_PAGE_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
  },
];

interface StatusResult {
  key: string;
  connected: boolean;
  details: Record<string, unknown>;
}

export default function IntegracoesPage() {
  const [statuses, setStatuses] = useState<Record<string, StatusResult>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function checkStatus(integration: IntegrationItem): Promise<StatusResult> {
    if (!integration.statusEndpoint) {
      return { key: integration.key, connected: false, details: { reason: "Sem endpoint de status" } };
    }
    try {
      const { data } = await api.get(integration.statusEndpoint);
      const connected =
        data.configured === true ||
        data.connected === true ||
        data.smtp_configured === true ||
        data.authenticated === true ||
        false;
      return { key: integration.key, connected, details: data };
    } catch {
      return { key: integration.key, connected: false, details: {} };
    }
  }

  async function checkAll() {
    setLoading(true);
    try {
      const results = await Promise.all(INTEGRATIONS.map((i) => checkStatus(i)));
      const map: Record<string, StatusResult> = {};
      results.forEach((r) => { map[r.key] = r; });
      setStatuses(map);
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }

  useEffect(() => { checkAll(); }, []);

  // Handle OAuth redirect params
  useEffect(() => {
    const googleParam = searchParams.get("google");
    if (googleParam === "connected") {
      // Re-check Google status after OAuth redirect
      const googleIntegration = INTEGRATIONS.find((i) => i.key === "google");
      if (googleIntegration) {
        checkStatus(googleIntegration).then((result) => {
          setStatuses((prev) => ({ ...prev, [result.key]: result }));
        });
      }
    }
  }, [searchParams]);

  async function refresh(integration: IntegrationItem) {
    setRefreshing(integration.key);
    const result = await checkStatus(integration);
    setStatuses((prev) => ({ ...prev, [integration.key]: result }));
    setRefreshing(null);
  }

  async function handleGoogleConnect() {
    try {
      // Cookie httpOnly é enviado automaticamente pelo browser
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      window.location.href = `${baseUrl}/google-calendar/authorize-redirect`;
    } catch (err) {
      console.error("Failed to start Google OAuth:", err);
    }
  }

  async function handleGoogleDisconnect() {
    setDisconnecting("google");
    try {
      await api.post("/google-calendar/disconnect");
      setStatuses((prev) => ({
        ...prev,
        google: { key: "google", connected: false, details: {} },
      }));
    } catch { /* graceful */ }
    finally { setDisconnecting(null); }
  }

  if (loading) {
    return (
      <PageWrapper
        title="Integrações"
        breadcrumb={[{ label: "Configurações", href: "/settings" }, { label: "Integrações" }]}
      >
        <div className="mb-6">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-background-primary border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full max-w-md" />
                  <Skeleton className="h-3 w-3/4 max-w-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  const connectedCount = Object.values(statuses).filter((s) => s.connected).length;

  return (
    <PageWrapper
      title="Integrações"
      breadcrumb={[{ label: "Configurações", href: "/settings" }, { label: "Integrações" }]}
    >
      {/* Summary */}
      <div className="mb-6 flex items-center gap-4 p-4 bg-background-primary border border-border rounded-xl">
        <Cloud size={24} className="text-brand-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground-primary">
            {connectedCount} de {INTEGRATIONS.length} integrações ativas
          </p>
          <p className="text-xs text-foreground-tertiary mt-0.5">
            Configure as variáveis de ambiente no arquivo .env do backend para ativar cada integração.
          </p>
        </div>
      </div>

      {/* Integration cards */}
      <div className="space-y-4">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const status = statuses[integration.key];
          const isConnected = status?.connected;
          const isRefreshing = refreshing === integration.key;
          const googleEmail = integration.key === "google" && isConnected
            ? (status?.details?.email as string)
            : null;

          return (
            <div
              key={integration.key}
              className="bg-background-primary border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${integration.bgColor}`}>
                    <Icon size={24} className={integration.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground-primary">{integration.name}</h3>
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-green-600 bg-green-100 dark:bg-green-900/30">
                          <CheckCircle2 size={10} /> Conectado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-red-500 bg-red-100 dark:bg-red-900/30">
                          <XCircle size={10} /> Desconectado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-tertiary leading-relaxed max-w-lg">
                      {integration.description}
                    </p>

                    {/* Google email display */}
                    {googleEmail && (
                      <p className="text-xs text-foreground-secondary mt-1">
                        Conta: <span className="font-medium">{googleEmail}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {integration.configKeys.map((key) => (
                        <code key={key} className="text-[10px] px-1.5 py-0.5 bg-background-tertiary rounded text-foreground-tertiary font-mono">
                          {key}
                        </code>
                      ))}
                    </div>

                    {/* Google OAuth actions */}
                    {integration.oauthConnect && (
                      <div className="flex items-center gap-2 mt-3">
                        {isConnected ? (
                          <button
                            onClick={handleGoogleDisconnect}
                            disabled={disconnecting === "google"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 disabled:opacity-50"
                          >
                            <LogOut size={12} />
                            {disconnecting === "google" ? "Desconectando..." : "Desconectar"}
                          </button>
                        ) : (
                          <button
                            onClick={handleGoogleConnect}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <ExternalLink size={12} />
                            Conectar com Google
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <QuickTooltip label="Verificar conexao" side="left">
                  <button
                    onClick={() => refresh(integration)}
                    disabled={isRefreshing}
                    className="p-2 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-secondary rounded-lg shrink-0"
                  >
                    {isRefreshing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </button>
                </QuickTooltip>
              </div>
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}
