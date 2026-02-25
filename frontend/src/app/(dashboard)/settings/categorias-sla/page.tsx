"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Timer,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Zap,
} from "lucide-react";
import api from "@/lib/api";

interface SlaCategory {
  id: string;
  name: string;
  slug: string;
  sla_hours: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

export default function CategoriasSlaPage() {
  const [categories, setCategories] = useState<SlaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editHours, setEditHours] = useState(24);
  const [editColor, setEditColor] = useState("#3b82f6");

  // New form
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newHours, setNewHours] = useState(24);
  const [newColor, setNewColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);

  async function fetchCategories() {
    try {
      const { data } = await api.get("/sla/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCategories(); }, []);

  async function handleSeed() {
    setSaving(true);
    try {
      await api.post("/sla/categories/seed");
      fetchCategories();
    } catch { /* error */ }
    finally { setSaving(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newSlug) return;
    setSaving(true);
    try {
      await api.post("/sla/categories", {
        name: newName,
        slug: newSlug,
        sla_hours: newHours,
        color: newColor,
      });
      setShowNew(false);
      setNewName("");
      setNewSlug("");
      fetchCategories();
    } catch { /* error */ }
    finally { setSaving(false); }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await api.put(`/sla/categories/${id}`, {
        name: editName,
        sla_hours: editHours,
        color: editColor,
      });
      setEditingId(null);
      fetchCategories();
    } catch { /* error */ }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    try {
      await api.delete(`/sla/categories/${id}`);
      fetchCategories();
    } catch { /* error */ }
  }

  async function handleToggle(cat: SlaCategory) {
    try {
      await api.put(`/sla/categories/${cat.id}`, { is_active: !cat.is_active });
      fetchCategories();
    } catch { /* error */ }
  }

  function startEdit(cat: SlaCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditHours(cat.sla_hours);
    setEditColor(cat.color);
  }

  const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  const COLORS = ["#3b82f6", "#ef4444", "#8b5cf6", "#f97316", "#10b981", "#ec4899", "#6b7280", "#06b6d4"];

  if (loading) {
    return (
      <PageWrapper
        title="Categorias & SLA"
        breadcrumb={[{ label: "Configurações", href: "/settings" }, { label: "Categorias & SLA" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Categorias & SLA"
      breadcrumb={[{ label: "Configurações", href: "/settings" }, { label: "Categorias & SLA" }]}
      actions={
        <div className="flex items-center gap-2">
          {categories.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-secondary"
            >
              <Zap size={14} /> Categorias Padrão
            </button>
          )}
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} /> Nova Categoria
          </button>
        </div>
      }
    >
      {/* Info */}
      <div className="mb-6 p-4 bg-background-secondary/50 border border-border rounded-xl">
        <p className="text-sm text-foreground-secondary">
          Configure categorias de tarefa e o SLA (prazo máximo em horas) para cada uma.
          Tarefas com a categoria correspondente terão seu SLA calculado automaticamente.
        </p>
      </div>

      {/* Categories list */}
      {categories.length === 0 && !showNew ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <Timer size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary mb-3">Nenhuma categoria SLA configurada</p>
          <button
            onClick={handleSeed}
            disabled={saving}
            className="px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Criando..." : "Criar Categorias Padrão"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;

            if (isEditing) {
              return (
                <div key={cat.id} className="bg-background-primary border-2 border-brand-primary rounded-xl p-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground-tertiary mb-1">Nome</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-tertiary mb-1">SLA (horas)</label>
                      <input type="number" value={editHours} onChange={(e) => setEditHours(Number(e.target.value))} min={1} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-tertiary mb-1">Cor</label>
                      <div className="flex items-center gap-1.5 mt-1">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={`w-7 h-7 rounded-full border-2 ${editColor === c ? "border-foreground-primary" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={() => handleUpdate(cat.id)} disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                        <Save size={14} /> Salvar
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-2 border border-border rounded-lg text-sm text-foreground-secondary">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={cat.id} className={`bg-background-primary border border-border rounded-xl p-5 flex items-center justify-between ${!cat.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                  <div>
                    <p className="text-sm font-semibold text-foreground-primary">{cat.name}</p>
                    <p className="text-xs text-foreground-tertiary mt-0.5">
                      Slug: {cat.slug} · SLA: <strong>{cat.sla_hours}h</strong>
                      {!cat.is_active && " · Inativa"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(cat)} className={`px-2 py-1 rounded text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/20" : "bg-gray-100 text-gray-500 dark:bg-gray-900/20"}`}>
                    {cat.is_active ? "Ativa" : "Inativa"}
                  </button>
                  <button onClick={() => startEdit(cat)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-secondary">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-foreground-tertiary hover:text-red-500 rounded-lg hover:bg-background-secondary">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* New category inline form */}
          {showNew && (
            <form onSubmit={handleCreate} className="bg-background-primary border-2 border-brand-primary/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground-primary mb-3">Nova Categoria</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-tertiary mb-1">Nome *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Fiscal" className={inputClass} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-tertiary mb-1">Slug *</label>
                  <input type="text" value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="Ex: fiscal" className={inputClass} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-tertiary mb-1">SLA (horas)</label>
                  <input type="number" value={newHours} onChange={(e) => setNewHours(Number(e.target.value))} min={1} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-tertiary mb-1">Cor</label>
                  <div className="flex items-center gap-1 mt-1">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setNewColor(c)} className={`w-6 h-6 rounded-full border-2 ${newColor === c ? "border-foreground-primary" : "border-transparent"}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Criar
                  </button>
                  <button type="button" onClick={() => setShowNew(false)} className="px-3 py-2 border border-border rounded-lg text-sm text-foreground-secondary">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
