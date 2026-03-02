"use client";

import { useEffect, useState } from "react";
import { Layers, Plus } from "lucide-react";

export default function GlobalModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", icon: "", sort_order: 0 });

  const fetchModules = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/super-admin/modules`, {
        credentials: "include",
      });
      if (res.ok) setModules(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/super-admin/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ key: "", name: "", description: "", icon: "", sort_order: 0 });
        fetchModules();
      }
    } catch {}
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground-primary">Modulos Globais</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
        >
          <Plus size={20} /> Novo Modulo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <p className="col-span-4 text-center text-foreground-tertiary py-8">Carregando...</p>
        ) : (
          modules.map((m: any) => (
            <div key={m.id} className="bg-background-primary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Layers size={20} className="text-amber-500" />
                <span className="font-medium text-foreground-primary">{m.name}</span>
              </div>
              <p className="text-xs text-foreground-tertiary mb-2">{m.key}</p>
              {m.description && <p className="text-sm text-foreground-secondary">{m.description}</p>}
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${m.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                {m.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-primary rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Novo Modulo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Key</label>
                <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required placeholder="my_module" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descricao</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
