"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Tag,
  Plus,
  X,
  Loader2,
  Users,
  Search,
} from "lucide-react";
import api from "@/lib/api";

interface ClientSummary {
  id: string;
  company_name: string;
  trade_name: string | null;
  tags: string[];
  status: string;
}

const TAG_COLORS: Record<string, string> = {
  "BPO Completo": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Só Fiscal": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Cobrança Ativa": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Gestão Administrativa": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "BPO Financeiro": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Consultoria": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Novo Cliente": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "VIP": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const DEFAULT_TAG_COLOR = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLOR;
}

export default function TagsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        const { data } = await api.get("/clients", { params: { per_page: 100 } });
        const items: ClientSummary[] = data.items || [];
        setClients(items);

        // Extract all unique tags
        const tagSet = new Set<string>();
        items.forEach((c) => (c.tags || []).forEach((t) => tagSet.add(t)));
        setAllTags(Array.from(tagSet).sort());
      } catch (err) {
        console.error("Failed to load clients:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  async function addTagToClient(clientId: string, tag: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client || client.tags.includes(tag)) return;

    setSaving(clientId);
    try {
      const updatedTags = [...client.tags, tag];
      await api.put(`/clients/${clientId}`, { tags: updatedTags });
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, tags: updatedTags } : c))
      );
      if (!allTags.includes(tag)) {
        setAllTags((prev) => [...prev, tag].sort());
      }
    } catch (err) {
      console.error("Failed to add tag:", err);
    } finally {
      setSaving(null);
    }
  }

  async function removeTagFromClient(clientId: string, tag: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    setSaving(clientId);
    try {
      const updatedTags = client.tags.filter((t) => t !== tag);
      await api.put(`/clients/${clientId}`, { tags: updatedTags });
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, tags: updatedTags } : c))
      );
    } catch (err) {
      console.error("Failed to remove tag:", err);
    } finally {
      setSaving(null);
    }
  }

  function handleAddNewTag() {
    const trimmed = newTag.trim();
    if (trimmed && !allTags.includes(trimmed)) {
      setAllTags((prev) => [...prev, trimmed].sort());
    }
    setNewTag("");
  }

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      !search ||
      (c.trade_name || c.company_name).toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || (c.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <PageWrapper
        title="Tags & Segmentação"
        breadcrumb={[
          { label: "Clientes", href: "/clients" },
          { label: "Tags & Segmentação" },
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
      title="Tags & Segmentação"
      breadcrumb={[
        { label: "Clientes", href: "/clients" },
        { label: "Tags & Segmentação" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Tags */}
        <div className="lg:col-span-1">
          <div className="bg-background-primary border border-border rounded-xl">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground-primary mb-3">
                Tags Disponíveis
              </h3>
              {/* Add new tag */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewTag();
                    }
                  }}
                  placeholder="Nova tag..."
                  className="flex-1 h-9 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-xs placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                <button
                  onClick={handleAddNewTag}
                  disabled={!newTag.trim()}
                  className="h-9 w-9 flex items-center justify-center bg-brand-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
              {/* All tags filter */}
              <button
                onClick={() => setSelectedTag(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  !selectedTag
                    ? "bg-brand-primary text-white"
                    : "text-foreground-secondary hover:bg-background-secondary"
                }`}
              >
                Todos ({clients.length})
              </button>
              {allTags.map((tag) => {
                const count = clients.filter((c) => (c.tags || []).includes(tag)).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedTag === tag
                        ? "bg-brand-primary text-white"
                        : "text-foreground-secondary hover:bg-background-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={12} />
                      <span>{tag}</span>
                    </div>
                    <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
              {allTags.length === 0 && (
                <p className="text-xs text-foreground-tertiary text-center py-4">
                  Nenhuma tag criada
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main: Client list with tags */}
        <div className="lg:col-span-3">
          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full h-10 pl-10 pr-4 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          {/* Clients */}
          <div className="space-y-2">
            {filteredClients.length === 0 ? (
              <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
                <Users size={40} className="mx-auto mb-2 text-foreground-tertiary opacity-40" />
                <p className="text-sm text-foreground-tertiary">Nenhum cliente encontrado</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-background-primary border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="text-sm font-medium text-foreground-primary hover:text-brand-primary transition-colors"
                      >
                        {client.trade_name || client.company_name}
                      </button>
                      {client.trade_name && (
                        <p className="text-xs text-foreground-tertiary">{client.company_name}</p>
                      )}
                    </div>
                    {saving === client.id && (
                      <Loader2 size={14} className="animate-spin text-brand-primary shrink-0" />
                    )}
                  </div>

                  {/* Current tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(client.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                      >
                        {tag}
                        <button
                          onClick={() => removeTagFromClient(client.id, tag)}
                          className="hover:opacity-70"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}

                    {/* Add tag dropdown */}
                    <div className="relative group">
                      <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border-2 border-dashed border-border text-foreground-tertiary hover:border-brand-primary hover:text-brand-primary transition-colors">
                        <Plus size={10} />
                        Tag
                      </button>
                      <div className="absolute left-0 top-full mt-1 w-48 bg-background-primary border border-border rounded-lg shadow-lg z-10 hidden group-hover:block">
                        <div className="p-1 max-h-40 overflow-y-auto">
                          {allTags
                            .filter((t) => !(client.tags || []).includes(t))
                            .map((tag) => (
                              <button
                                key={tag}
                                onClick={() => addTagToClient(client.id, tag)}
                                className="w-full text-left px-3 py-1.5 text-xs text-foreground-secondary hover:bg-background-secondary rounded transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                          {allTags.filter((t) => !(client.tags || []).includes(t)).length === 0 && (
                            <p className="px-3 py-1.5 text-xs text-foreground-tertiary">
                              Todas as tags aplicadas
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
