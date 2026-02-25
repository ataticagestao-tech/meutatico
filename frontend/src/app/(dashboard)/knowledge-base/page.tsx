"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Search,
  Plus,
  BookOpen,
  FileText,
  Video,
  FolderOpen,
  Eye,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate, getInitials } from "@/lib/utils";
import api from "@/lib/api";

interface KBCategory {
  id: string;
  name: string;
  parent_id?: string;
  children?: KBCategory[];
  article_count?: number;
}

interface KBArticle {
  id: string;
  title: string;
  content_type: "article" | "video" | "faq";
  category_id?: string;
  category_name?: string;
  status: "draft" | "published" | "archived";
  visibility: "public" | "internal" | "private";
  author_name?: string;
  views?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-800",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  article: FileText,
  video: Video,
  faq: BookOpen,
};

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const debouncedSearch = useDebounce(search, 400);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", "50");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("content_type", typeFilter);
      if (visibilityFilter) params.set("visibility", visibilityFilter);
      if (selectedCategory) params.set("category_id", selectedCategory);

      const { data } = await api.get(`/knowledge-base/articles?${params.toString()}`);
      setArticles((data as any).items ?? data ?? []);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter, visibilityFilter, selectedCategory]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  useEffect(() => {
    api.get("/knowledge-base/categories").then((r: any) => {
      setCategories(r.data.items ?? r.data ?? []);
    }).catch(() => {});
  }, []);

  function renderCategoryTree(items: KBCategory[], level = 0) {
    return items.map((cat) => (
      <div key={cat.id}>
        <button
          onClick={() => setSelectedCategory(selectedCategory === cat.id ? "" : cat.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
            selectedCategory === cat.id
              ? "bg-brand-primary/10 text-brand-primary font-medium"
              : "text-foreground-secondary hover:bg-background-tertiary"
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <span className="flex items-center gap-2">
            <FolderOpen size={14} className="shrink-0" />
            {cat.name}
          </span>
          {cat.article_count != null && (
            <span className="text-xs text-foreground-tertiary">{cat.article_count}</span>
          )}
        </button>
        {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, level + 1)}
      </div>
    ));
  }

  const selectClass =
    "h-9 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  return (
    <PageWrapper
      title="Base de Conhecimento"
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Base de Conhecimento" }]}
      actions={
        <button
          onClick={() => router.push("/knowledge-base/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Novo Artigo
        </button>
      }
    >
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: Category Tree */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-background-primary border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground-primary mb-3">Categorias</h3>
            <button
              onClick={() => setSelectedCategory("")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                !selectedCategory
                  ? "bg-brand-primary/10 text-brand-primary font-medium"
                  : "text-foreground-secondary hover:bg-background-tertiary"
              }`}
            >
              Todas
            </button>
            <div className="space-y-0.5">
              {renderCategoryTree(categories)}
            </div>
            {categories.length === 0 && (
              <p className="text-xs text-foreground-tertiary py-4 text-center">Nenhuma categoria</p>
            )}
          </div>
        </div>

        {/* Right: Articles */}
        <div className="flex-1">
          {/* Search & Filters */}
          <div className="bg-background-primary border border-border rounded-xl p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
                <input
                  type="text"
                  placeholder="Buscar artigos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                <option value="">Status</option>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
                <option value="">Tipo</option>
                <option value="article">Artigo</option>
                <option value="video">Video</option>
                <option value="faq">FAQ</option>
              </select>
              <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className={selectClass}>
                <option value="">Visibilidade</option>
                <option value="public">Publico</option>
                <option value="internal">Interno</option>
                <option value="private">Privado</option>
              </select>
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-brand-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <BookOpen size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-50" />
              <p className="text-foreground-tertiary">Nenhum artigo encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {articles.map((article) => {
                const Icon = TYPE_ICON[article.content_type] || FileText;
                return (
                  <div
                    key={article.id}
                    onClick={() => router.push(`/knowledge-base/${article.id}`)}
                    className="bg-background-primary border border-border rounded-xl p-5 hover:shadow-md cursor-pointer transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                        <Icon size={20} className="text-brand-primary" />
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[article.status] || ""}`}>
                        {STATUS_LABEL[article.status] || article.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground-primary mb-1 line-clamp-2 group-hover:text-brand-primary transition-colors">
                      {article.title}
                    </h4>
                    {article.category_name && (
                      <p className="text-xs text-foreground-tertiary mb-3">{article.category_name}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-foreground-tertiary">
                      <span>{article.author_name || "—"}</span>
                      <div className="flex items-center gap-3">
                        {article.views != null && (
                          <span className="flex items-center gap-1">
                            <Eye size={12} />
                            {article.views}
                          </span>
                        )}
                        <span>{formatDate(article.created_at)}</span>
                      </div>
                    </div>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-background-tertiary text-foreground-secondary text-[10px] rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
