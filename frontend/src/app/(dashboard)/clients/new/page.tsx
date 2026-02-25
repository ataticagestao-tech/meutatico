"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Search,
  Loader2,
  Users,
  Pencil,
  User,
  Building,
  Globe,
} from "lucide-react";
import { CLIENT_STATUSES } from "@/lib/constants";
import api from "@/lib/api";
import { fetchCNPJ, fetchCEP, formatPartnerDocument, getPartnerTypeLabel } from "@/lib/brasilapi";
import type { ClientCreateRequest, ClientContact, ClientPartner } from "@/types/client";
import type { UserType } from "@/types/user";

type TabKey = "main" | "address" | "management" | "partners" | "contacts";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "main", label: "Dados Principais", icon: Building2 },
  { key: "address", label: "Endereco", icon: MapPin },
  { key: "management", label: "Gestao", icon: Settings2 },
  { key: "partners", label: "Socios", icon: Users },
  { key: "contacts", label: "Contatos", icon: Contact },
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

type EmptyContact = Omit<ClientContact, "id">;

const emptyContact: EmptyContact = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  role: "",
  is_primary: false,
};

type PartnerForm = Omit<ClientPartner, "id">;

const emptyPartner: PartnerForm = {
  name: "",
  document_number: "",
  document_type: "CPF",
  role: "",
  partner_type: 2,
  partner_type_label: "Pessoa Fisica",
  entry_date: "",
  age_range: "",
  country: "Brasil",
  source: "manual",
};

export default function NewClientPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("main");
  const [saving, setSaving] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
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

  const [partners, setPartners] = useState<PartnerForm[]>([]);
  const [editingPartnerIdx, setEditingPartnerIdx] = useState<number | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerForm, setPartnerForm] = useState<PartnerForm>({ ...emptyPartner });

  const [contacts, setContacts] = useState<EmptyContact[]>([{ ...emptyContact, is_primary: true }]);

  useEffect(() => {
    api.get<{ items: UserType[] }>("/users").then((res) => {
      setUsers(res.data.items ?? res.data as unknown as UserType[]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // CNPJ lookup via BrasilAPI
  async function lookupCNPJ() {
    const digits = documentNumber.replace(/\D/g, "");
    if (digits.length !== 14) {
      setToast({ message: "Digite um CNPJ completo (14 digitos).", type: "error" });
      return;
    }
    setLoadingCNPJ(true);
    try {
      const data = await fetchCNPJ(digits);
      setCompanyName(data.razao_social || "");
      setTradeName(data.nome_fantasia || "");
      if (data.email) setEmail(data.email.toLowerCase());
      if (data.ddd_telefone_1) {
        const cleanPhone = data.ddd_telefone_1.replace(/\D/g, "");
        if (cleanPhone) setPhone(maskPhone(cleanPhone));
      }
      if (data.cep) {
        setAddressZip(maskCEP(data.cep));
        setAddressStreet(data.logradouro || "");
        setAddressNumber(data.numero || "");
        setAddressComplement(data.complemento || "");
        setAddressNeighborhood(data.bairro || "");
        setAddressCity(data.municipio || "");
        setAddressState(data.uf || "");
      }

      // Auto-preencher regime tributário
      if (data.opcao_pelo_mei) {
        setTaxRegime("mei");
      } else if (data.opcao_pelo_simples) {
        setTaxRegime("simples_nacional");
      }

      // Mapear sócios (QSA)
      if (data.qsa && data.qsa.length > 0) {
        const mappedPartners: PartnerForm[] = data.qsa.map((socio) => {
          const docDigits = (socio.cnpj_cpf_do_socio || "").replace(/\D/g, "");
          let docType: string = "";
          if (docDigits.length === 11) docType = "CPF";
          else if (docDigits.length === 14) docType = "CNPJ";

          return {
            name: socio.nome_socio || "",
            document_number: docDigits,
            document_type: docType,
            role: socio.qualificacao_socio || "",
            role_code: socio.codigo_qualificacao_socio,
            partner_type: socio.identificador_de_socio || 2,
            partner_type_label: getPartnerTypeLabel(socio.identificador_de_socio || 2),
            entry_date: socio.data_entrada_sociedade || "",
            age_range: socio.faixa_etaria || "",
            country: socio.pais || "Brasil",
            legal_representative_name: socio.nome_representante_legal || "",
            legal_representative_document: (socio.cpf_representante_legal || "").replace(/^0+$/, ""),
            legal_representative_role: socio.qualificacao_representante_legal || "",
            source: "api" as const,
          };
        });
        setPartners(mappedPartners);
      }

      setToast({ message: "Dados do CNPJ preenchidos com sucesso!", type: "success" });
    } catch {
      setToast({ message: "CNPJ nao encontrado ou invalido.", type: "error" });
    } finally {
      setLoadingCNPJ(false);
    }
  }

  // CEP lookup via BrasilAPI
  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCEP(true);
    try {
      const data = await fetchCEP(digits);
      setAddressStreet(data.street || "");
      setAddressNeighborhood(data.neighborhood || "");
      setAddressCity(data.city || "");
      setAddressState(data.state || "");
    } catch {
      setToast({ message: "CEP nao encontrado.", type: "error" });
    } finally {
      setLoadingCEP(false);
    }
  }

  async function checkDocumentDuplicate(docNumber: string) {
    const cleaned = docNumber.replace(/\D/g, "");
    if (cleaned.length < 11) {
      setDocumentError(null);
      setExistingClient(null);
      return;
    }
    try {
      const res = await api.get(`/clients/check-document/${cleaned}`);
      if (res.data.exists) {
        const name = res.data.client.trade_name || res.data.client.company_name;
        setDocumentError(`Ja existe um cliente com este documento: ${name}`);
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

  // Partner management
  function openAddPartner() {
    setPartnerForm({ ...emptyPartner });
    setEditingPartnerIdx(null);
    setShowPartnerForm(true);
  }

  function openEditPartner(idx: number) {
    setPartnerForm({ ...partners[idx] });
    setEditingPartnerIdx(idx);
    setShowPartnerForm(true);
  }

  function savePartner() {
    if (!partnerForm.name.trim()) {
      setToast({ message: "Nome do socio e obrigatorio.", type: "error" });
      return;
    }
    if (editingPartnerIdx !== null) {
      setPartners(partners.map((p, i) => (i === editingPartnerIdx ? { ...partnerForm } : p)));
    } else {
      setPartners([...partners, { ...partnerForm }]);
    }
    setShowPartnerForm(false);
    setEditingPartnerIdx(null);
  }

  function removePartner(idx: number) {
    setPartners(partners.filter((_, i) => i !== idx));
  }

  // Contact management
  function addContact() {
    setContacts([...contacts, { ...emptyContact }]);
  }

  function removeContact(idx: number) {
    if (contacts.length <= 1) return;
    setContacts(contacts.filter((_, i) => i !== idx));
  }

  function updateContact(idx: number, field: keyof EmptyContact, value: string | boolean) {
    setContacts(
      contacts.map((c, i) => {
        if (i !== idx) return c;
        return { ...c, [field]: value };
      })
    );
  }

  function setPrimaryContact(idx: number) {
    setContacts(
      contacts.map((c, i) => ({
        ...c,
        is_primary: i === idx,
      }))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !documentNumber || !email) {
      setToast({ message: "Preencha os campos obrigatorios: Razao Social, Documento e Email.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload: ClientCreateRequest = {
        document_type: documentType.toUpperCase() as any,
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
        status: status as ClientCreateRequest["status"],
        responsible_user_id: responsibleUserId || undefined,
        contracted_plan: contractedPlan || undefined,
        contract_start_date: contractStartDate || undefined,
        contract_end_date: contractEndDate || undefined,
        monthly_fee: monthlyFee ? parseFloat(monthlyFee) : undefined,
        tax_regime: taxRegime || undefined,
        systems_used: systemsUsed.length > 0 ? systemsUsed : undefined,
        notes: notes || undefined,
        contacts: contacts.filter((c) => c.name).map((c) => ({
          ...c,
          phone: c.phone ? c.phone.replace(/\D/g, "") : undefined,
          whatsapp: c.whatsapp ? c.whatsapp.replace(/\D/g, "") : undefined,
        })),
        partners: partners.map((p) => ({
          name: p.name,
          document_number: p.document_number || undefined,
          document_type: p.document_type || undefined,
          role: p.role || undefined,
          role_code: p.role_code ?? undefined,
          partner_type: p.partner_type,
          partner_type_label: p.partner_type_label || undefined,
          entry_date: p.entry_date || undefined,
          age_range: p.age_range || undefined,
          country: p.country || undefined,
          legal_representative_name: p.legal_representative_name || undefined,
          legal_representative_document: p.legal_representative_document || undefined,
          legal_representative_role: p.legal_representative_role || undefined,
          source: p.source || "api",
        })),
      };

      await api.post("/clients", payload);
      setToast({ message: "Cliente criado com sucesso!", type: "success" });
      setTimeout(() => router.push("/clients"), 1200);
    } catch (err: any) {
      let msg = "Erro ao criar cliente.";
      if (err?.response?.status === 409) {
        const detail = err.response.data?.detail;
        msg = typeof detail === "string" ? detail : "Ja existe um cliente com este documento.";
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

  const partnerTypeIcon = (type: number) => {
    if (type === 1) return <Building size={16} className="text-blue-500" />;
    if (type === 3) return <Globe size={16} className="text-amber-500" />;
    return <User size={16} className="text-green-600" />;
  };

  return (
    <PageWrapper
      title="Novo Cliente"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clientes", href: "/clients" },
        { label: "Novo Cliente" },
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
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

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
                {tab.key === "partners" && partners.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-brand-primary/10 text-brand-primary rounded-full">
                    {partners.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Tab 1: Dados Principais */}
            {activeTab === "main" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Document type toggle */}
                <div className="md:col-span-2">
                  <label className={labelClass}>Tipo de Documento</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentType("cnpj");
                        setDocumentNumber("");
                      }}
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
                      onClick={() => {
                        setDocumentType("cpf");
                        setDocumentNumber("");
                      }}
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
                  <label className={labelClass}>
                    {documentType === "cnpj" ? "CNPJ" : "CPF"} *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={documentNumber}
                      onChange={(e) => {
                        setDocumentNumber(
                          documentType === "cnpj"
                            ? maskCNPJ(e.target.value)
                            : maskCPF(e.target.value)
                        );
                        setDocumentError(null);
                        setExistingClient(null);
                      }}
                      onBlur={(e) => checkDocumentDuplicate(e.target.value)}
                      placeholder={
                        documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"
                      }
                      className={`${inputClass} ${documentError ? "border-red-500 focus:ring-red-500/30 focus:border-red-500" : ""}`}
                    />
                    {documentType === "cnpj" && (
                      <button
                        type="button"
                        onClick={lookupCNPJ}
                        disabled={loadingCNPJ}
                        className="flex items-center gap-1.5 px-3 h-10 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 text-sm font-medium"
                        title="Buscar dados do CNPJ"
                      >
                        {loadingCNPJ ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Search size={16} />
                        )}
                        Buscar
                      </button>
                    )}
                  </div>
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
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Razao social da empresa"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Nome fantasia"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-foreground-tertiary">
                    Preenchido automaticamente via Receita Federal, quando disponivel.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Endereco */}
            {activeTab === "address" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={addressZip}
                      onChange={(e) => setAddressZip(maskCEP(e.target.value))}
                      onBlur={() => lookupCep(addressZip)}
                      placeholder="00000-000"
                      className={inputClass}
                    />
                    {loadingCEP && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-brand-primary" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Rua / Logradouro</label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Rua, Avenida..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Numero</label>
                  <input
                    type="text"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    placeholder="123"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Complemento</label>
                  <input
                    type="text"
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    placeholder="Sala, andar..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input
                    type="text"
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input
                    type="text"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Cidade"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione...</option>
                    {BR_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tab 3: Gestao */}
            {activeTab === "management" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={selectClass}
                  >
                    {CLIENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsavel</label>
                  <select
                    value={responsibleUserId}
                    onChange={(e) => setResponsibleUserId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Plano Contratado</label>
                  <input
                    type="text"
                    value={contractedPlan}
                    onChange={(e) => setContractedPlan(e.target.value)}
                    placeholder="Ex: Plano Premium"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Inicio do Contrato</label>
                  <input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fim do Contrato</label>
                  <input
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Regime Tributario</label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value)}
                    className={selectClass}
                  >
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
                      type="text"
                      value={systemInput}
                      onChange={(e) => setSystemInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSystem();
                        }
                      }}
                      placeholder="Digite e pressione Enter"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={addSystem}
                      className="px-3 h-10 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shrink-0"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {systemsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {systemsUsed.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSystem(s)}
                            className="hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Observacoes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Anotacoes internas sobre o cliente..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Sócios */}
            {activeTab === "partners" && (
              <div className="space-y-4">
                {/* Partner form modal/inline */}
                {showPartnerForm && (
                  <div className="border border-brand-primary rounded-xl p-5 bg-brand-primary/5">
                    <h4 className="text-sm font-semibold text-foreground-primary mb-4">
                      {editingPartnerIdx !== null ? "Editar Socio" : "Adicionar Socio"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Nome *</label>
                        <input
                          type="text"
                          value={partnerForm.name}
                          onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                          placeholder="Nome do socio"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>CPF / CNPJ</label>
                        <input
                          type="text"
                          value={partnerForm.document_number ? formatPartnerDocument(partnerForm.document_number) : ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            setPartnerForm({
                              ...partnerForm,
                              document_number: digits,
                              document_type: digits.length <= 11 ? "CPF" : "CNPJ",
                            });
                          }}
                          placeholder="000.000.000-00"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Qualificacao</label>
                        <input
                          type="text"
                          value={partnerForm.role || ""}
                          onChange={(e) => setPartnerForm({ ...partnerForm, role: e.target.value })}
                          placeholder="Ex: Socio-Administrador"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Tipo</label>
                        <select
                          value={partnerForm.partner_type}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPartnerForm({
                              ...partnerForm,
                              partner_type: val,
                              partner_type_label: getPartnerTypeLabel(val),
                            });
                          }}
                          className={selectClass}
                        >
                          <option value={2}>Pessoa Fisica</option>
                          <option value={1}>Pessoa Juridica</option>
                          <option value={3}>Estrangeiro</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Data de Entrada</label>
                        <input
                          type="date"
                          value={partnerForm.entry_date || ""}
                          onChange={(e) => setPartnerForm({ ...partnerForm, entry_date: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Pais</label>
                        <input
                          type="text"
                          value={partnerForm.country || "Brasil"}
                          onChange={(e) => setPartnerForm({ ...partnerForm, country: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      {partnerForm.partner_type === 1 && (
                        <>
                          <div>
                            <label className={labelClass}>Representante Legal</label>
                            <input
                              type="text"
                              value={partnerForm.legal_representative_name || ""}
                              onChange={(e) => setPartnerForm({ ...partnerForm, legal_representative_name: e.target.value })}
                              placeholder="Nome do representante"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>CPF Representante</label>
                            <input
                              type="text"
                              value={partnerForm.legal_representative_document || ""}
                              onChange={(e) => setPartnerForm({ ...partnerForm, legal_representative_document: e.target.value.replace(/\D/g, "") })}
                              placeholder="000.000.000-00"
                              className={inputClass}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => { setShowPartnerForm(false); setEditingPartnerIdx(null); }}
                        className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={savePartner}
                        className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        {editingPartnerIdx !== null ? "Salvar" : "Adicionar"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Partners list */}
                {partners.length === 0 && !showPartnerForm && (
                  <div className="text-center py-10 text-foreground-tertiary">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum socio cadastrado.</p>
                    <p className="text-xs mt-1">Busque um CNPJ para preencher automaticamente ou adicione manualmente.</p>
                  </div>
                )}

                {partners.map((partner, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-xl p-5 hover:border-foreground-tertiary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {partnerTypeIcon(partner.partner_type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground-primary">
                            {partner.name}
                          </h4>
                          <div className="mt-1 space-y-0.5">
                            {partner.document_number && (
                              <p className="text-xs text-foreground-secondary">
                                {partner.document_type === "CNPJ" ? "CNPJ" : "CPF"}: {formatPartnerDocument(partner.document_number)}
                              </p>
                            )}
                            {partner.role && (
                              <p className="text-xs text-foreground-secondary">
                                Qualificacao: {partner.role}
                              </p>
                            )}
                            <p className="text-xs text-foreground-tertiary">
                              Tipo: {partner.partner_type_label || getPartnerTypeLabel(partner.partner_type)}
                            </p>
                            {partner.entry_date && (
                              <p className="text-xs text-foreground-tertiary">
                                Entrada: {new Date(partner.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}
                              </p>
                            )}
                            {partner.age_range && (
                              <p className="text-xs text-foreground-tertiary">
                                Faixa etaria: {partner.age_range}
                              </p>
                            )}
                            {partner.partner_type === 1 && partner.legal_representative_name && (
                              <p className="text-xs text-foreground-tertiary">
                                Representante: {partner.legal_representative_name}
                                {partner.legal_representative_document && (
                                  <> (CPF: {formatPartnerDocument(partner.legal_representative_document)})</>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {partner.source === "api" && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full mr-1">
                            Receita Federal
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditPartner(idx)}
                          className="p-1.5 text-foreground-tertiary hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePartner(idx)}
                          className="p-1.5 text-foreground-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!showPartnerForm && (
                  <button
                    type="button"
                    onClick={openAddPartner}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-lg text-sm font-medium text-foreground-secondary hover:border-brand-primary hover:text-brand-primary transition-colors w-full justify-center"
                  >
                    <Plus size={16} />
                    Adicionar Socio
                  </button>
                )}

                {partners.length > 0 && (
                  <p className="text-xs text-foreground-tertiary text-center">
                    Dados dos socios obtidos automaticamente da Receita Federal. Voce pode editar ou adicionar socios manualmente.
                  </p>
                )}
              </div>
            )}

            {/* Tab 5: Contatos */}
            {activeTab === "contacts" && (
              <div className="space-y-6">
                {contacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-xl p-5 ${
                      contact.is_primary
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-semibold text-foreground-primary">
                          Contato {idx + 1}
                        </h4>
                        {contact.is_primary && (
                          <span className="px-2 py-0.5 bg-brand-primary text-white text-xs font-medium rounded-full">
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!contact.is_primary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryContact(idx)}
                            className="text-xs text-brand-primary hover:underline"
                          >
                            Tornar principal
                          </button>
                        )}
                        {contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeContact(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Nome</label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateContact(idx, "name", e.target.value)}
                          placeholder="Nome do contato"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Cargo / Funcao</label>
                        <input
                          type="text"
                          value={contact.role || ""}
                          onChange={(e) => updateContact(idx, "role", e.target.value)}
                          placeholder="Ex: Diretor, Gerente..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(idx, "email", e.target.value)}
                          placeholder="email@empresa.com"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Telefone</label>
                        <input
                          type="text"
                          value={contact.phone || ""}
                          onChange={(e) =>
                            updateContact(idx, "phone", maskPhone(e.target.value))
                          }
                          placeholder="(00) 00000-0000"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>WhatsApp</label>
                        <input
                          type="text"
                          value={contact.whatsapp || ""}
                          onChange={(e) =>
                            updateContact(idx, "whatsapp", maskPhone(e.target.value))
                          }
                          placeholder="(00) 00000-0000"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-lg text-sm font-medium text-foreground-secondary hover:border-brand-primary hover:text-brand-primary transition-colors w-full justify-center"
                >
                  <Plus size={16} />
                  Adicionar Contato
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Cliente"}
          </button>
        </div>
      </form>
    </PageWrapper>
  );
}
