"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Building2,
  Save,
  Loader2,
  Upload,
  X,
  Globe,
  Clock,
  Calendar,
  HelpCircle,
} from "lucide-react";
import { QuickTooltip } from "@/components/ui/tooltip";
import api from "@/lib/api";
import { normalizeUrl } from "@/lib/utils";

interface CompanySettings {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  email: string;
  phone: string | null;
  logo_url: string | null;
  settings: {
    theme?: string;
    timezone?: string;
    language?: string;
    date_format?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasilia (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belem (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiaba (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD (2026-12-31)" },
];

const LANGUAGES = [
  { value: "pt-BR", label: "Portugues (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Espanol" },
];

export default function SettingsCompanyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [language, setLanguage] = useState("pt-BR");

  const [slug, setSlug] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CompanySettings>("/settings/company");
      setName(data.name || "");
      setDocument(data.document || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setLogoUrl(data.logo_url || "");
      setSlug(data.slug || "");
      setCreatedAt(data.created_at || "");

      const s = data.settings || {};
      setTimezone(s.timezone || "America/Sao_Paulo");
      setDateFormat(s.date_format || "DD/MM/YYYY");
      setLanguage(s.language || "pt-BR");
    } catch (err) {
      console.error("Failed to fetch company settings:", err);
      setToast({ message: "Erro ao carregar dados da empresa.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      setToast({ message: "Nome e email sao obrigatorios.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const normalizedLogo = logoUrl ? normalizeUrl(logoUrl) : null;
      if (normalizedLogo && normalizedLogo !== logoUrl) {
        setLogoUrl(normalizedLogo);
      }
      await api.put("/settings/company", {
        name,
        document: document || null,
        email,
        phone: phone || null,
        logo_url: normalizedLogo,
        settings: {
          timezone,
          date_format: dateFormat,
          language,
        },
      });
      setToast({ message: "Dados da empresa atualizados com sucesso!", type: "success" });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao salvar dados da empresa.";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function formatCnpj(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";
  const selectClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  if (loading) {
    return (
      <PageWrapper
        title="Dados da Empresa"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configuracoes", href: "/settings" },
          { label: "Empresa" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-tertiary">
            <Loader2 size={24} className="animate-spin text-brand-primary" />
            <span className="text-sm">Carregando dados da empresa...</span>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Dados da Empresa"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Configuracoes", href: "/settings" },
        { label: "Empresa" },
      ]}
      actions={
        <button
          onClick={handleSubmit}
          disabled={saving || !name || !email}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Salvando..." : "Salvar Alteracoes"}
        </button>
      }
    >
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Identidade */}
        <div className="bg-background-primary border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-green-50">
              <Building2 size={18} className="text-green-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground-primary">Identidade</h2>
          </div>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className={labelClass}>Logo da Empresa</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-background-secondary overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Building2 size={24} className="text-foreground-tertiary" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) setLogoUrl(normalizeUrl(v));
                    }}
                    placeholder="URL da logo (ex: tatica.com/logo.png)"
                    className={inputClass}
                  />
                  <p className="text-xs text-foreground-tertiary mt-1">
                    Insira a URL da imagem da logo da empresa.
                  </p>
                </div>
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className={labelClass}>Nome da Empresa *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Razao social ou nome fantasia"
                className={inputClass}
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className={`${labelClass} flex items-center gap-1.5`}>
                CNPJ
                <QuickTooltip label="14 digitos do CNPJ. Formato e validado automaticamente.">
                  <HelpCircle size={13} className="text-foreground-tertiary cursor-help" />
                </QuickTooltip>
              </label>
              <input
                type="text"
                value={document}
                onChange={(e) => setDocument(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                className={inputClass}
              />
            </div>

            {/* Slug (readonly) */}
            <div>
              <label className={`${labelClass} flex items-center gap-1.5`}>
                Identificador (slug)
                <QuickTooltip label="Identificador unico do tenant na URL. Nao pode ser alterado apos a criacao.">
                  <HelpCircle size={13} className="text-foreground-tertiary cursor-help" />
                </QuickTooltip>
              </label>
              <input
                type="text"
                value={slug}
                readOnly
                className={`${inputClass} bg-background-secondary cursor-not-allowed opacity-70`}
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-background-primary border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-blue-50">
              <Globe size={18} className="text-blue-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground-primary">Contato</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Preferencias */}
        <div className="bg-background-primary border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-purple-50">
              <Clock size={18} className="text-purple-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground-primary">Preferencias</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Fuso Horario</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={selectClass}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Formato de Data</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className={selectClass}
              >
                {DATE_FORMATS.map((df) => (
                  <option key={df.value} value={df.value}>
                    {df.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Idioma</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={selectClass}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Info */}
        {createdAt && (
          <div className="bg-background-secondary border border-border rounded-xl p-4">
            <p className="text-xs text-foreground-tertiary">
              Tenant criado em{" "}
              {new Date(createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        {/* Submit (mobile) */}
        <div className="flex justify-end md:hidden">
          <button
            type="submit"
            disabled={saving || !name || !email}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
        </div>
      </form>
    </PageWrapper>
  );
}
