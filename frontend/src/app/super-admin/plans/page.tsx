"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus } from "lucide-react";

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price_monthly: "",
    max_users: "5", max_storage_gb: "5", max_clients: "",
  });

  const fetchPlans = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${apiUrl}/super-admin/plans?per_page=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = localStorage.getItem("access_token");
      const body = {
        ...form,
        price_monthly: parseFloat(form.price_monthly),
        max_users: parseInt(form.max_users),
        max_storage_gb: parseInt(form.max_storage_gb),
        max_clients: form.max_clients ? parseInt(form.max_clients) : null,
        modules: [],
      };
      const res = await fetch(`${apiUrl}/super-admin/plans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", slug: "", description: "", price_monthly: "", max_users: "5", max_storage_gb: "5", max_clients: "" });
        fetchPlans();
      }
    } catch {}
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground-primary">Planos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus size={20} /> Novo Plano
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <p className="col-span-3 text-center text-foreground-tertiary py-8">Carregando...</p>
        ) : plans.length === 0 ? (
          <p className="col-span-3 text-center text-foreground-tertiary py-8">Nenhum plano cadastrado</p>
        ) : (
          plans.map((plan: any) => (
            <div key={plan.id} className="bg-background-primary border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard size={24} className="text-amber-500" />
                <div>
                  <h3 className="font-bold text-foreground-primary">{plan.name}</h3>
                  <p className="text-xs text-foreground-tertiary">{plan.slug}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground-primary mb-1">
                R${plan.price_monthly?.toFixed(2)}
                <span className="text-sm font-normal text-foreground-secondary">/mes</span>
              </p>
              {plan.description && (
                <p className="text-sm text-foreground-secondary mt-2">{plan.description}</p>
              )}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Usuarios:</span>
                  <span className="font-medium">{plan.max_users === -1 ? "Ilimitado" : plan.max_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Storage:</span>
                  <span className="font-medium">{plan.max_storage_gb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Clientes:</span>
                  <span className="font-medium">{plan.max_clients === null || plan.max_clients === -1 ? "Ilimitado" : plan.max_clients}</span>
                </div>
              </div>
              {plan.modules?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-foreground-secondary mb-2">Modulos:</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.modules.map((m: any) => (
                      <span key={m.module_key} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">{m.module_key}</span>
                    ))}
                  </div>
                </div>
              )}
              <span className={`inline-block mt-4 px-2 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                {plan.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-primary rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Novo Plano</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descricao</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preco Mensal (R$)</label>
                  <input type="number" step="0.01" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Usuarios</label>
                  <input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Storage (GB)</label>
                  <input type="number" value={form.max_storage_gb} onChange={(e) => setForm({ ...form, max_storage_gb: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Clientes (vazio=ilim.)</label>
                  <input type="number" value={form.max_clients} onChange={(e) => setForm({ ...form, max_clients: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-background-secondary">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Criar Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
