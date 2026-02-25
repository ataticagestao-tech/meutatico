"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Save,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import api from "@/lib/api";

interface KBCategory {
  id: string;
  name: string;
}

interface KBArticle {
  id: string;
  title: string;
  body: string;
  content_type: "article" | "video" | "faq";
  category_id?: string;
  status: "draft" | "published" | "archived";
  visibility: "public" | "internal" | "private";
  video_url?: string;
  tags?: string[];
  views?: number;
  created_at: string;
  updated_at: string;
}

export default function KBArticleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
  const isNew = articleId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [categories, setCategories] = useState<KBCategory[]>([]);

  // Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contentType, setContentType] = useState<string>("article");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [visibility, setVisibility] = useState<string>("internal");
  const [videoUrl, setVideoUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    api.get("/knowledge-base/categories").then((r: any) => {
      const data = r.data.items ?? r.data ?? [];
      // Flatten tree if nested
      const flat: KBCategory[] = [];
      function flatten(items: any[]) {
        items.forEach((item: any) => {
          flat.push({ id: item.id, name: item.name });
          if (item.children) flatten(item.children);
        });
      }
      flatten(Array.isArray(data) ? data : []);
      setCategories(flat);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    async function load() {
      try {
        const { data } = await api.get(`/knowledge-base/articles/${articleId}`);
        const article: KBArticle = (data as any).data ?? data;
        setTitle(article.title || "");
        setBody(article.body || "");
        setContentType(article.content_type || "article");
        setCategoryId(article.category_id || "");
        setStatus(article.status || "draft");
        setVisibility(article.visibility || "internal");
        setVideoUrl(article.video_url || "");
        setTags(article.tags || []);
      } catch (err) {
        console.error("Failed to load article:", err);
        setToast({ message: "Erro ao carregar artigo.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [articleId, isNew]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      setToast({ message: "Informe o titulo do artigo.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        body,
        content_type: contentType,
        category_id: categoryId || undefined,
        status,
        visibility,
        video_url: videoUrl || undefined,
        tags: tags.length > 0 ? tags : undefined,
      };
      if (isNew) {
        const { data } = await api.post("/knowledge-base/articles", payload);
        const newId = (data as any).data?.id ?? (data as any).id;
        setToast({ message: "Artigo criado com sucesso!", type: "success" });
        if (newId) {
          setTimeout(() => router.push(`/knowledge-base/${newId}`), 1200);
        } else {
          setTimeout(() => router.push("/knowledge-base"), 1200);
        }
      } else {
        await api.put(`/knowledge-base/articles/${articleId}`, payload);
        setToast({ message: "Artigo salvo com sucesso!", type: "success" });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erro ao salvar artigo.";
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
      <PageWrapper title="Carregando..." breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Base de Conhecimento", href: "/knowledge-base" }, { label: "..." }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isNew ? "Novo Artigo" : "Editar Artigo"}
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Base de Conhecimento", href: "/knowledge-base" },
        { label: isNew ? "Novo Artigo" : title || "Editar" },
      ]}
      actions={
        <button
          onClick={() => router.push("/knowledge-base")}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
      }
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-background-primary border border-border rounded-xl p-6 space-y-5">
              <div>
                <label className={labelClass}>Titulo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titulo do artigo"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Conteudo (Markdown)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={20}
                  placeholder="Escreva o conteudo do artigo em Markdown..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm font-mono placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-y min-h-[300px]"
                />
              </div>
              {contentType === "video" && (
                <div>
                  <label className={labelClass}>URL do Video</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <div className="bg-background-primary border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground-primary">Publicacao</h3>
              <div>
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Visibilidade</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={selectClass}>
                  <option value="public">Publico</option>
                  <option value="internal">Interno</option>
                  <option value="private">Privado</option>
                </select>
              </div>
            </div>

            {/* Category & Type */}
            <div className="bg-background-primary border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground-primary">Organizacao</h3>
              <div>
                <label className={labelClass}>Tipo de Conteudo</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectClass}>
                  <option value="article">Artigo</option>
                  <option value="video">Video</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
                  <option value="">Sem categoria</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-background-primary border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground-primary">Tags</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTag(); }
                  }}
                  placeholder="Adicionar tag..."
                  className={inputClass}
                />
                <button type="button" onClick={addTag} className="px-3 h-10 bg-brand-primary text-white rounded-lg hover:opacity-90 shrink-0">
                  <Plus size={16} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><Trash2 size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-brand-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Save size={16} />
              {saving ? "Salvando..." : isNew ? "Criar Artigo" : "Salvar Artigo"}
            </button>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
