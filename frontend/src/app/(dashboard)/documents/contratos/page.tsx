"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  FileText,
  Loader2,
  Users,
  Eye,
  Download,
  ChevronRight,
  CheckCircle2,
  FileCheck,
  History,
} from "lucide-react";
import api from "@/lib/api";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  version: number;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
}

interface PreviewResult {
  template_name: string;
  client_name: string;
  html: string;
  variables: Record<string, string>;
}

interface GeneratedDoc {
  id: string;
  name: string;
  template_name: string;
  category: string;
  file_url: string;
  version: number;
  client_id: string;
  created_at: string;
}

type Step = "template" | "client" | "preview";

export default function ContratosPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ name: string; file_url: string } | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [tplRes, clientsRes, histRes] = await Promise.all([
          api.get("/templates?category=contrato"),
          api.get("/clients"),
          api.get("/templates/generated/list?category=contrato"),
        ]);
        setTemplates(Array.isArray(tplRes.data) ? tplRes.data : []);
        const list = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.items || [];
        setClients(list);
        setGeneratedDocs(Array.isArray(histRes.data) ? histRes.data : []);
      } catch {
        // Graceful
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function selectTemplate(tpl: TemplateItem) {
    setSelectedTemplate(tpl);
    setStep("client");
    setPreview(null);
    setGeneratedResult(null);
  }

  async function selectClient(client: ClientItem) {
    setSelectedClient(client);
    setStep("preview");
    setPreviewLoading(true);
    try {
      const { data } = await api.get(
        `/templates/${selectedTemplate!.id}/preview/${client.id}`
      );
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate || !selectedClient) return;
    setGenerating(true);
    try {
      const { data } = await api.post(
        `/templates/${selectedTemplate.id}/generate/${selectedClient.id}`
      );
      setGeneratedResult({ name: data.name, file_url: data.file_url });
      // Refresh history
      const histRes = await api.get("/templates/generated/list?category=contrato");
      setGeneratedDocs(Array.isArray(histRes.data) ? histRes.data : []);
    } catch {
      // Handle error
    } finally {
      setGenerating(false);
    }
  }

  function reset() {
    setStep("template");
    setSelectedTemplate(null);
    setSelectedClient(null);
    setPreview(null);
    setGeneratedResult(null);
  }

  if (loading) {
    return (
      <PageWrapper
        title="Gerar Contrato"
        breadcrumb={[
          { label: "Documentos", href: "/documents" },
          { label: "Gerar Contrato" },
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
      title="Gerar Contrato"
      breadcrumb={[
        { label: "Documentos", href: "/documents" },
        { label: "Gerar Contrato" },
      ]}
      actions={
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground-secondary border border-border rounded-lg hover:bg-background-secondary transition-colors"
        >
          <History size={16} />
          Histórico ({generatedDocs.length})
        </button>
      }
    >
      {showHistory ? (
        /* History View */
        <div className="bg-background-primary border border-border rounded-xl">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-primary">
              Contratos Gerados
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-brand-primary hover:underline"
            >
              Voltar
            </button>
          </div>
          {generatedDocs.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
              <p className="text-sm text-foreground-tertiary">Nenhum contrato gerado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {generatedDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground-primary truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-foreground-tertiary mt-0.5">
                      v{doc.version} — {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-primary hover:underline shrink-0"
                  >
                    <Download size={14} />
                    Baixar
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
            {["template", "client", "preview"].map((s, i) => {
              const labels = ["1. Template", "2. Cliente", "3. Preview"];
              const isCurrent = step === s;
              const isPast =
                (s === "template" && (step === "client" || step === "preview")) ||
                (s === "client" && step === "preview");

              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && (
                    <ChevronRight size={14} className="text-foreground-tertiary" />
                  )}
                  <button
                    onClick={() => {
                      if (isPast) setStep(s as Step);
                    }}
                    disabled={!isPast && !isCurrent}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-brand-primary text-white"
                        : isPast
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 cursor-pointer"
                        : "bg-background-secondary text-foreground-tertiary"
                    }`}
                  >
                    {isPast && <CheckCircle2 size={14} />}
                    {labels[i]}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {step === "template" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-full bg-background-primary border border-border rounded-xl p-8 text-center">
                  <FileText size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-sm text-foreground-tertiary">
                    Nenhum template de contrato disponível
                  </p>
                </div>
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className="text-left bg-background-primary border border-border rounded-xl p-5 hover:shadow-md hover:border-brand-primary/50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg shrink-0">
                        <FileCheck size={20} className="text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground-primary group-hover:text-brand-primary transition-colors">
                          {tpl.name}
                        </p>
                        {tpl.description && (
                          <p className="text-xs text-foreground-tertiary mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                        )}
                        <p className="text-[10px] text-foreground-tertiary mt-2">
                          v{tpl.version}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {step === "client" && (
            <div>
              <p className="text-sm text-foreground-secondary mb-4">
                Template selecionado:{" "}
                <strong>{selectedTemplate?.name}</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => selectClient(client)}
                    className="text-left bg-background-primary border border-border rounded-xl p-4 hover:shadow-md hover:border-brand-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background-secondary rounded-lg">
                        <Users size={16} className="text-foreground-tertiary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground-primary truncate">
                          {client.trade_name || client.company_name}
                        </p>
                        {client.trade_name && (
                          <p className="text-xs text-foreground-tertiary truncate">
                            {client.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-foreground-secondary">
                  <strong>{selectedTemplate?.name}</strong> para{" "}
                  <strong>{selectedClient?.trade_name || selectedClient?.company_name}</strong>
                </p>
                <div className="flex items-center gap-2">
                  {generatedResult ? (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                        <CheckCircle2 size={16} />
                        Gerado com sucesso!
                      </span>
                      <a
                        href={generatedResult.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-brand-primary rounded-lg hover:opacity-90"
                      >
                        <Download size={14} />
                        Baixar
                      </a>
                      <button
                        onClick={reset}
                        className="px-3 py-1.5 text-xs font-medium text-foreground-secondary border border-border rounded-lg hover:bg-background-secondary"
                      >
                        Novo contrato
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={generating || previewLoading}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileCheck size={16} />
                      )}
                      {generating ? "Gerando..." : "Gerar Documento"}
                    </button>
                  )}
                </div>
              </div>

              {previewLoading ? (
                <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
                  <Loader2 size={24} className="animate-spin text-brand-primary mx-auto mb-2" />
                  <p className="text-sm text-foreground-tertiary">Renderizando preview...</p>
                </div>
              ) : preview ? (
                <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="p-2 bg-background-secondary border-b border-border flex items-center gap-2">
                    <Eye size={14} className="text-foreground-tertiary" />
                    <span className="text-xs text-foreground-tertiary">Preview do documento</span>
                  </div>
                  <div
                    className="p-6"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </div>
              ) : (
                <div className="bg-background-primary border border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-foreground-tertiary">Erro ao carregar preview</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
