"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  email: string;
  plan_name: string | null;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  suspended: "bg-yellow-100 text-yellow-700",
  trial: "bg-blue-100 text-blue-700",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", document: "", email: "", phone: "",
    plan_id: "", admin_name: "", admin_email: "", admin_password: "",
  });
  const [plans, setPlans] = useState<any[]>([]);

  const fetchTenants = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const params = new URLSearchParams({ page: "1", per_page: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`${apiUrl}/super-admin/tenants?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/super-admin/plans?per_page=50`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.items || []);
      }
    } catch {}
  };

  useEffect(() => { fetchTenants(); fetchPlans(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/super-admin/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", slug: "", document: "", email: "", phone: "", plan_id: "", admin_name: "", admin_email: "", admin_password: "" });
        fetchTenants();
      }
    } catch {}
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground-primary">Tenants</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus size={20} /> Novo Tenant
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
        <input
          type="text"
          placeholder="Buscar por nome ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchTenants()}
          className="w-full pl-10 pr-4 py-2 bg-background-primary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {/* Table */}
      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background-secondary border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase">CNPJ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase">Plano</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-foreground-tertiary">Carregando...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-foreground-tertiary">Nenhum tenant encontrado</td></tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="border-b border-border hover:bg-background-secondary/50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-foreground-primary">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-foreground-secondary">{t.document || "-"}</td>
                  <td className="px-4 py-3 text-sm text-foreground-secondary">{t.plan_name || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-700"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-secondary">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Create */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-primary rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-foreground-primary mb-4">Novo Tenant</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="minha-empresa" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CNPJ</label>
                  <input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plano</label>
                <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="">Selecione...</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} - R${p.price_monthly}</option>
                  ))}
                </select>
              </div>
              <hr className="border-border" />
              <p className="text-sm font-semibold text-foreground-secondary">Administrador do Tenant</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Admin</label>
                  <input value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email do Admin</label>
                  <input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Senha do Admin</label>
                <input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} required minLength={8} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-background-secondary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Criar Tenant</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
