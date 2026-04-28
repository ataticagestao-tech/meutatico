"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  MapPin,
  Settings2,
  Contact,
  Loader2,
  CheckSquare,
  Ticket,
  Users as UsersIcon,
  FolderOpen,
  DollarSign,
  Wallet,
  History,
} from "lucide-react";
import { CLIENT_STATUSES } from "@/lib/constants";
import api from "@/lib/api";
import { ClientAvatarUpload } from "@/components/clients/client-avatar-upload";
import { ClientTasksTab } from "@/components/clients/client-tasks-tab";
import { ClientTicketsTab } from "@/components/clients/client-tickets-tab";
import { ClientPartnersTab } from "@/components/clients/client-partners-tab";
import { ClientDocumentsTab } from "@/components/clients/client-documents-tab";
import { ClientFinanceiroTab } from "@/components/clients/client-financeiro-tab";
import { ClientFluxoCaixaTab } from "@/components/clients/client-fluxo-caixa-tab";
import { ClientHistoricoTab } from "@/components/clients/client-historico-tab";
import type { Client, ClientUpdateRequest, ClientContact } from "@/types/client";
import type { UserType } from "@/types/user";

type TabKey = "main" | "address" | "management" | "contacts" | "tasks" | "tickets" | "partners" | "documents" | "financeiro" | "fluxo-caixa" | "historico";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "main", label: "Dados Principais", icon: Building2 },
  { key: "address", label: "Endereço", icon: MapPin },
  { key: "management", label: "Gestão", icon: Settings2 },
  { key: "contacts", label: "Contatos", icon: Contact },
  { key: "tasks", label: "Tarefas", icon: CheckSquare },
  { key: "tickets", label: "Solicitações", icon: Ticket },
  { key: "partners", label: "Sócios", icon: UsersIcon },
  { key: "documents", label: "Documentos", icon: FolderOpen },
  { key: "financeiro", label: "Financeiro", icon: DollarSign },
  { key: "fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet },
  { key: "historico", label: "Histórico", icon: History },
];

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

type EditContact = Omit<ClientContact, "id"> & { id?: string };

const emptyContact: EditContact = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  role: "",
  is_primary: false,
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>("main");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [existingClient, setExistingClient] = useState<{ id: string; company_name: string; trade_name?: string } | null>(null);

  // Form state
  const [documentType, setDocumentType] = useState<"cnpj" | "cpf">("cnpj");
  const [documentNumber, setDocumentNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");

  const [status, setStatus] = useState("active");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [contractedPlan, setContractedPlan] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [systemsUsed, setSystemsUsed] = useState<string[]>([]);
  const [systemInput, setSystemInput] = useState("");
  const [notes, setNotes] = useState("");

  const [contacts, setContacts] = useState<EditContact[]>([{ ...emptyContact, is_primary: true }]);

  const populateForm = useCallback((client: Client) => {
    setDocumentType(client.document_type || "cnpj");
    const raw = client.document_number || "";
    setDocumentNumber(
      client.document_type === "cpf" ? maskCPF(raw) : maskCNPJ(raw)
    );
    setCompanyName(client.company_name || "");
    setTradeName(client.trade_name || "");
    setEmail(client.email || "");
    setPhone(client.phone ? maskPhone(client.phone) : "");
    setAddressZip(client.address_zip ? maskCEP(client.address_zip) : "");
    setAddressStreet(client.address_street || "");
    setAddressNumber(client.address_number || "");
    setAddressComplement(client.address_complement || "");
    setAddressNeighborhood(client.address_neighborhood || "");
    setAddressCity(client.address_city || "");
    setAddressState(client.address_state || "");
    setStatus(client.status || "active");
    setResponsibleUserId(client.responsible_user_id || "");
    setContractedPlan(client.contracted_plan || "");
    setContractStartDate(client.contract_start_date || "");
    setContractEndDate(client.contract_end_date || "");
    setMonthlyFee(client.monthly_fee ? String(client.monthly_fee) : "");
    setTaxRegime(client.tax_regime || "");
    setSystemsUsed(client.systems_used || []);
    setNotes(client.notes || "");
    setLogoUrl(client.logo_url || null);
    if (client.contacts && client.contacts.length > 0) {
      setContacts(client.contacts);
    } else {
      setContacts([{ ...emptyContact, is_primary: true }]);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [clientRes, usersRes] = await Promise.all([
          api.get<Client | { data: Client }>(`/clients/${clientId}`),
          api.get<{ items: UserType[] }>("/users").catch(() => ({ data: { items: [] } })),
        ]);
        const clientData = (clientRes.data as any).items ?? clientRes.data;
        populateForm(clientData as Client);
        setUsers((usersRes.data as any).items ?? usersRes.data as unknown as UserType[]);
      } catch (err) {
        console.error("Failed to load client:", err);
        setToast({ message: "Erro ao carregar cliente.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId, populateForm]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressStreet(data.logradouro || "");
        setAddressNeighborhood(data.bairro || "");
        setAddressCity(data.localidade || "");
        setAddressState(data.uf || "");
      }
    } catch {}
  }

  async function checkDocumentDuplicate(docNumber: string) {
    const cleaned = docNumber.replace(/\D/g, "");
    if (cleaned.length < 11) {
      setDocumentError(null);
      setExistingClient(null);
      return;
    }
    try {
      const res = await api.get(`/clients/check-document/${cleaned}`, {
        params: { exclude_id: clientId },
      });
      if (res.data.exists) {
        const name = res.data.client.trade_name || res.data.client.company_name;
        setDocumentError(`Ja existe outro cliente com este documento: ${name}`);
        setExistingClient(res.data.client);
      } else {
        setDocumentError(null);
        setExistingClient(null);
      }
    } catch {
      // silently ignore
    }
  }

  function addSystem() {
    const trimmed = systemInput.trim();
    if (trimmed && !systemsUsed.includes(trimmed)) {
      setSystemsUsed([...systemsUsed, trimmed]);
      setSystemInput("");
    }
  }

  function removeSystem(s: string) {
    setSystemsUsed(systemsUsed.filter((x) => x !== s));
  }

  function addContact() {
    setContacts([...contacts, { ...emptyContact }]);
  }

  function removeContact(idx: number) {
    if (contacts.length <= 1) return;
    setContacts(contacts.filter((_, i) => i !== idx));
  }

  function updateContact(idx: number, field: keyof EditContact, value: string | boolean) {
    setContacts(
      contacts.map((c, i) => (i !== idx ? c : { ...c, [field]: value }))
    );
  }

  function setPrimaryContact(idx: number) {
    setContacts(contacts.map((c, i) => ({ ...c, is_primary: i === idx })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !documentNumber || !email) {
      setToast({ message: "Preencha os campos obrigatorios.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload: ClientUpdateRequest = {
        document_type: documentType,
        document_number: documentNumber.replace(/\D/g, ""),
        company_name: companyName,
        trade_name: tradeName || undefined,
        email,
        phone: phone ? phone.replace(/\D/g, "") : undefined,
        address_zip: addressZip ? addressZip.replace(/\D/g, "") : undefined,
        address_street: addressStreet || undefined,
        address_number: addressNumber || undefined,
        address_complement: addressComplement || undefined,
        address_neighborhood: addressNeighborhood || undefined,
        address_city: addressCity || undefined,
        address_state: addressState || undefined,
        status: status as ClientUpdateRequest["status"],
        responsible_user_id: responsibleUserId || undefined,
        contracted_plan: contractedPlan || undefined,
        contract_start_date: contractStartDate || undefined,
        contract_end_date: contractEndDate || undefined,
        monthly_fee: monthlyFee ? parseFloat(monthlyFee) : undefined,
        tax_regime: taxRegime || undefined,
        systems_used: systemsUsed.length > 0 ? systemsUsed : undefined,
        notes: notes || undefined,
        contacts: contacts.filter((c) => c.name).map((c) => ({
          name: c.name,
          email: c.email,
          phone: c.phone ? c.phone.replace(/\D/g, "") : undefined,
          whatsapp: c.whatsapp ? c.whatsapp.replace(/\D/g, "") : undefined,
          role: c.role || undefined,
          is_primary: c.is_primary,
        })),
      };
      await api.put(`/clients/${clientId}`, payload);
      setToast({ message: "Cliente atualizado com sucesso!", type: "success" });
    } catch (err: any) {
      let msg = "Erro ao atualizar cliente.";
      if (err?.response?.status === 409) {
        const detail = err.response.data?.detail;
        msg = typeof detail === "string" ? detail : "Ja existe outro cliente com este documento.";
        setDocumentError(msg);
        setActiveTab("main");
      } else {
        const detail = err?.response?.data?.detail;
        if (typeof detail === "string") {
          msg = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          msg = detail.map((e: any) => e.msg || String(e)).join("; ");
        } else if (err?.response?.data?.message) {
          msg = err.response.data.message;
        }
      }
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";
  const selectClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  if (loading) {
    return (
      <PageWrapper title="Carregando..." breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Clientes", href: "/clients" }, { label: "..." }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={tradeName || companyName || "Editar Cliente"}
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clientes", href: "/clients" },
        { label: tradeName || companyName || "Editar" },
      ]}
      actions={
        <button
          onClick={() => router.push("/clients")}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
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

      {/* Client Header with Avatar */}
      <div className="flex items-start gap-4 mb-6 bg-background-primary border border-border rounded-xl p-5">
        <ClientAvatarUpload
          clientId={clientId}
          logoUrl={logoUrl}
          name={tradeName || companyName || "Cliente"}
          size="xl"
          onUploadSuccess={(newUrl) => setLogoUrl(newUrl)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground-primary">
              {tradeName || companyName || "Cliente"}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : status === "inactive"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {status === "active" ? "Ativo" : status === "inactive" ? "Inativo" : "Prospecto"}
            </span>
          </div>
          {tradeName && companyName && (
            <p className="text-sm text-foreground-tertiary">{companyName}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-foreground-tertiary flex-wrap">
            {documentNumber && (
              <span>{documentType.toUpperCase()}: {documentNumber}</span>
            )}
            {responsibleUserId && (
              <span>
                Responsável: {users.find((u) => u.id === responsibleUserId)?.name || "—"}
              </span>
            )}
            {email && <span>{email}</span>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="bg-background-primary border border-border rounded-xl mb-6">
          <div className="flex border-b border-border overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-foreground-tertiary hover:text-foreground-secondary"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Tab 1: Dados Principais */}
            {activeTab === "main" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Tipo de Documento</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setDocumentType("cnpj"); setDocumentNumber(""); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        documentType === "cnpj"
                          ? "bg-brand-primary text-white"
                          : "bg-background-tertiary text-foreground-secondary"
                      }`}
                    >
                      CNPJ
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDocumentType("cpf"); setDocumentNumber(""); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        documentType === "cpf"
                          ? "bg-brand-primary text-white"
                          : "bg-background-tertiary text-foreground-secondary"
                      }`}
                    >
                      CPF
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{documentType === "cnpj" ? "CNPJ" : "CPF"} *</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => {
                      setDocumentNumber(documentType === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value));
                      setDocumentError(null);
                      setExistingClient(null);
                    }}
                    onBlur={(e) => checkDocumentDuplicate(e.target.value)}
                    placeholder={documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                    className={`${inputClass} ${documentError ? "border-red-500 focus:ring-red-500/30 focus:border-red-500" : ""}`}
                  />
                  {documentError && (
                    <div className="flex items-center gap-2 mt-1.5 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-sm text-red-600 dark:text-red-400 flex-1">
                        {documentError}
                      </span>
                      {existingClient && (
                        <a
                          href={`/clients/${existingClient.id}`}
                          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                        >
                          Ver cliente
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Razao Social *</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nome Fantasia</label>
                  <input type="text" value={tradeName} onChange={(e) => setTradeName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className={inputClass} />
                </div>
              </div>
            )}

            {/* Tab 2: Endereco */}
            {activeTab === "address" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>CEP</label>
                  <input type="text" value={addressZip} onChange={(e) => setAddressZip(maskCEP(e.target.value))} onBlur={() => lookupCep(addressZip)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Rua / Logradouro</label>
                  <input type="text" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Numero</label>
                  <input type="text" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Complemento</label>
                  <input type="text" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input type="text" value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input type="text" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <select value={addressState} onChange={(e) => setAddressState(e.target.value)} className={selectClass}>
                    <option value="">Selecione...</option>
                    {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Tab 3: Gestao */}
            {activeTab === "management" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                    {CLIENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsavel</label>
                  <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} className={selectClass}>
                    <option value="">Selecione...</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Plano Contratado</label>
                  <input type="text" value={contractedPlan} onChange={(e) => setContractedPlan(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Inicio do Contrato</label>
                  <input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fim do Contrato</label>
                  <input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Mensalidade (R$)</label>
                  <input type="number" step="0.01" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Regime Tributario</label>
                  <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className={selectClass}>
                    <option value="">Selecione...</option>
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="mei">MEI</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Sistemas Utilizados</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text" value={systemInput}
                      onChange={(e) => setSystemInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSystem(); } }}
                      placeholder="Digite e pressione Enter" className={inputClass}
                    />
                    <button type="button" onClick={addSystem} className="px-3 h-10 bg-brand-primary text-white rounded-lg hover:opacity-90 shrink-0">
                      <Plus size={16} />
                    </button>
                  </div>
                  {systemsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {systemsUsed.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
                          {s}
                          <button type="button" onClick={() => removeSystem(s)} className="hover:text-red-500"><Trash2 size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Observacoes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Contatos */}
            {activeTab === "contacts" && (
              <div className="space-y-6">
                {contacts.map((contact, idx) => (
                  <div key={idx} className={`border rounded-xl p-5 ${contact.is_primary ? "border-brand-primary bg-brand-primary/5" : "border-border"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-semibold text-foreground-primary">Contato {idx + 1}</h4>
                        {contact.is_primary && <span className="px-2 py-0.5 bg-brand-primary text-white text-xs font-medium rounded-full">Principal</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {!contact.is_primary && (
                          <button type="button" onClick={() => setPrimaryContact(idx)} className="text-xs text-brand-primary hover:underline">Tornar principal</button>
                        )}
                        {contacts.length > 1 && (
                          <button type="button" onClick={() => removeContact(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Nome</label>
                        <input type="text" value={contact.name} onChange={(e) => updateContact(idx, "name", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Cargo / Funcao</label>
                        <input type="text" value={contact.role || ""} onChange={(e) => updateContact(idx, "role", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" value={contact.email} onChange={(e) => updateContact(idx, "email", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Telefone</label>
                        <input type="text" value={contact.phone || ""} onChange={(e) => updateContact(idx, "phone", maskPhone(e.target.value))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>WhatsApp</label>
                        <input type="text" value={contact.whatsapp || ""} onChange={(e) => updateContact(idx, "whatsapp", maskPhone(e.target.value))} className={inputClass} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addContact}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-lg text-sm font-medium text-foreground-secondary hover:border-brand-primary hover:text-brand-primary transition-colors w-full justify-center"
                >
                  <Plus size={16} />
                  Adicionar Contato
                </button>
              </div>
            )}

            {/* Tab 5: Tarefas */}
            {activeTab === "tasks" && <ClientTasksTab clientId={clientId} />}

            {/* Tab 6: Solicitações */}
            {activeTab === "tickets" && <ClientTicketsTab clientId={clientId} />}

            {/* Tab 7: Sócios */}
            {activeTab === "partners" && <ClientPartnersTab clientId={clientId} />}

            {/* Tab 8: Documentos */}
            {activeTab === "documents" && (
              <ClientDocumentsTab clientId={clientId} clientName={tradeName || companyName} />
            )}

            {/* Tab 9: Financeiro */}
            {activeTab === "financeiro" && <ClientFinanceiroTab clientId={clientId} />}

            {/* Tab 10: Fluxo de Caixa */}
            {activeTab === "fluxo-caixa" && <ClientFluxoCaixaTab clientId={clientId} />}

            {/* Tab 11: Histórico */}
            {activeTab === "historico" && <ClientHistoricoTab clientId={clientId} />}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/clients")}
            className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
        </div>
      </form>
    </PageWrapper>
  );
}
