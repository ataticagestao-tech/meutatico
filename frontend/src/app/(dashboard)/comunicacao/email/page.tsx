"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Mail,
  Send,
  Eye,
  Users,
  ChevronRight,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import api from "@/lib/api";

interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_body: string;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
  email: string | null;
}

interface PreviewResult {
  subject: string;
  html_body: string;
  variables: Record<string, string>;
  client_email: string | null;
}

interface EmailStatus {
  smtp_configured: boolean;
  gmail_configured: boolean;
  outlook_configured: boolean;
}

type Step = "template" | "client" | "preview";

export default function EmailPage() {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);

  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateItem | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [toEmail, setToEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [tplRes, clientsRes, statusRes] = await Promise.all([
          api.get("/comunicacao/email-templates"),
          api.get("/clients"),
          api.get("/comunicacao/email-status"),
        ]);
        setTemplates(Array.isArray(tplRes.data) ? tplRes.data : []);
        const list = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.items || [];
        setClients(list);
        setEmailStatus(statusRes.data);
      } catch { /* graceful */ }
      finally { setLoading(false); }
    }
    init();
  }, []);

  function selectTemplate(tpl: EmailTemplateItem) {
    setSelectedTemplate(tpl);
    setStep("client");
    setPreview(null);
    setSent(false);
  }

  async function selectClient(client: ClientItem) {
    setSelectedClient(client);
    setStep("preview");
    setPreviewLoading(true);
    setSent(false);
    try {
      const { data } = await api.get(
        `/comunicacao/email-templates/${selectedTemplate!.id}/preview/${client.id}`
      );
      setPreview(data);
      setToEmail(data.client_email || client.email || "");
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSend() {
    if (!preview || !toEmail) return;
    setSending(true);
    try {
      await api.post("/comunicacao/send-email", {
        to_email: toEmail,
        subject: preview.subject,
        html_body: preview.html_body,
      });
      setSent(true);
    } catch { /* error */ }
    finally { setSending(false); }
  }

  function reset() {
    setStep("template");
    setSelectedTemplate(null);
    setSelectedClient(null);
    setPreview(null);
    setSent(false);
    setToEmail("");
  }

  const CATEGORY_LABELS: Record<string, string> = {
    onboarding: "Onboarding",
    relatorio: "Relatório",
    cobranca: "Cobrança",
    lembrete: "Lembrete",
    comunicado: "Comunicado",
    general: "Geral",
  };

  if (loading) {
    return (
      <PageWrapper title="Email" breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "Email" }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Enviar Email"
      breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "Email" }]}
    >
      {/* Status */}
      {emailStatus && !emailStatus.smtp_configured && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <WifiOff size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">SMTP não configurado</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Configure SMTP_HOST e SMTP_USER para enviar emails. O preview funciona normalmente.
            </p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {(["template", "client", "preview"] as Step[]).map((s, i) => {
          const labels = ["1. Template", "2. Cliente", "3. Enviar"];
          const isCurrent = step === s;
          const isPast = (s === "template" && step !== "template") || (s === "client" && step === "preview");
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-foreground-tertiary" />}
              <button
                onClick={() => { if (isPast) setStep(s); }}
                disabled={!isPast && !isCurrent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent ? "bg-brand-primary text-white"
                  : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 cursor-pointer"
                  : "bg-background-secondary text-foreground-tertiary"
                }`}>
                {isPast && <CheckCircle2 size={14} />}
                {labels[i]}
              </button>
            </div>
          );
        })}
      </div>

      {step === "template" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <button key={tpl.id} onClick={() => selectTemplate(tpl)}
              className="text-left bg-background-primary border border-border rounded-xl p-5 hover:shadow-md hover:border-brand-primary/50 transition-all group">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg shrink-0">
                  <Mail size={20} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-primary group-hover:text-brand-primary">{tpl.name}</p>
                  <p className="text-xs text-foreground-tertiary mt-0.5">{tpl.subject}</p>
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-background-secondary text-foreground-tertiary">
                    {CATEGORY_LABELS[tpl.category] || tpl.category}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "client" && (
        <div>
          <p className="text-sm text-foreground-secondary mb-4">
            Template: <strong>{selectedTemplate?.name}</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((c) => (
              <button key={c.id} onClick={() => selectClient(c)}
                className="text-left bg-background-primary border border-border rounded-xl p-4 hover:shadow-md hover:border-brand-primary/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background-secondary rounded-lg">
                    <Users size={16} className="text-foreground-tertiary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground-primary truncate">{c.trade_name || c.company_name}</p>
                    {c.email && <p className="text-xs text-foreground-tertiary truncate">{c.email}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "preview" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm text-foreground-secondary">
              <strong>{selectedTemplate?.name}</strong> para <strong>{selectedClient?.trade_name || selectedClient?.company_name}</strong>
            </p>
            <div className="flex items-center gap-2">
              {sent ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <CheckCircle2 size={16} /> Enviado!
                  </span>
                  <button onClick={reset} className="px-3 py-1.5 text-xs font-medium text-foreground-secondary border border-border rounded-lg hover:bg-background-secondary">
                    Novo email
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="Email de destino"
                    className="w-60 h-9 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm"
                  />
                  <button onClick={handleSend} disabled={sending || !toEmail || previewLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:opacity-90 disabled:opacity-50">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {previewLoading ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <Loader2 size={24} className="animate-spin text-brand-primary mx-auto" />
            </div>
          ) : preview ? (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-3 bg-background-secondary border-b border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Eye size={14} className="text-foreground-tertiary" />
                  <span className="text-xs text-foreground-tertiary">Preview</span>
                </div>
                <p className="text-sm font-medium text-foreground-primary">{preview.subject}</p>
              </div>
              <div className="p-6" dangerouslySetInnerHTML={{ __html: preview.html_body }} />
            </div>
          ) : null}
        </div>
      )}
    </PageWrapper>
  );
}
