"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Mail,
  FileText,
  Eye,
  Code,
} from "lucide-react";
import api from "@/lib/api";

interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_body: string;
  created_at: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  onboarding: { label: "Onboarding", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  relatorio: { label: "Relatório", color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  cobranca: { label: "Cobrança", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  lembrete: { label: "Lembrete", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  comunicado: { label: "Comunicado", color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  general: { label: "Geral", color: "text-gray-500 bg-gray-50 dark:bg-gray-900/20" },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateItem | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  useEffect(() => {
    async function init() {
      try {
        const { data } = await api.get("/comunicacao/email-templates");
        setTemplates(Array.isArray(data) ? data : []);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        title="Templates de Email"
        breadcrumb={[
          { label: "Comunicação", href: "/comunicacao" },
          { label: "Templates" },
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
      title="Templates de Email"
      breadcrumb={[
        { label: "Comunicação", href: "/comunicacao" },
        { label: "Templates" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-background-primary border border-border rounded-xl">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground-primary">
                Templates ({templates.length})
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {templates.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-sm text-foreground-tertiary">Nenhum template</p>
                </div>
              ) : (
                templates.map((tpl) => {
                  const catCfg = CATEGORY_LABELS[tpl.category] || CATEGORY_LABELS.general;
                  const isSelected = selectedTemplate?.id === tpl.id;

                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`w-full text-left p-4 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                        isSelected ? "bg-background-secondary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 ${catCfg.color}`}>
                          <Mail size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground-primary truncate">
                            {tpl.name}
                          </p>
                          <p className="text-xs text-foreground-tertiary mt-0.5 truncate">
                            {tpl.subject}
                          </p>
                          <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${catCfg.color}`}>
                            {catCfg.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Variables Info */}
          <div className="mt-4 bg-background-primary border border-border rounded-xl p-4">
            <h4 className="text-xs font-semibold text-foreground-secondary mb-2">Variáveis Disponíveis</h4>
            <div className="space-y-1">
              {[
                { var: "{{nome_cliente}}", desc: "Nome do cliente" },
                { var: "{{nome_responsavel}}", desc: "Responsável pela conta" },
                { var: "{{mes_referencia}}", desc: "Mês de referência" },
              ].map((v) => (
                <div key={v.var} className="flex items-center gap-2">
                  <code className="text-[10px] px-1.5 py-0.5 bg-background-tertiary rounded text-brand-primary font-mono">
                    {v.var}
                  </code>
                  <span className="text-[10px] text-foreground-tertiary">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Template Preview */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <FileText size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
              <p className="text-sm text-foreground-tertiary">
                Selecione um template para visualizar
              </p>
            </div>
          ) : (
            <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground-primary">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-xs text-foreground-tertiary mt-0.5">
                    Assunto: {selectedTemplate.subject}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-background-secondary rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === "preview"
                        ? "bg-background-primary text-foreground-primary shadow-sm"
                        : "text-foreground-tertiary hover:text-foreground-secondary"
                    }`}
                  >
                    <Eye size={12} />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode("code")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === "code"
                        ? "bg-background-primary text-foreground-primary shadow-sm"
                        : "text-foreground-tertiary hover:text-foreground-secondary"
                    }`}
                  >
                    <Code size={12} />
                    HTML
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {viewMode === "preview" ? (
                  <div
                    className="bg-white rounded-lg border border-border p-6"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.html_body }}
                  />
                ) : (
                  <pre className="bg-background-secondary rounded-lg p-4 text-xs text-foreground-secondary overflow-x-auto font-mono whitespace-pre-wrap">
                    {selectedTemplate.html_body}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
