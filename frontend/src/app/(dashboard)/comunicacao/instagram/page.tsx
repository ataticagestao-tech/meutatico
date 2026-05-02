"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Instagram,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Image,
  ExternalLink,
  Link2,
  BarChart3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

// ── Types ────────────────────────────────────────────

interface IGStatus {
  configured: boolean;
  connected: boolean;
  username: string | null;
  name?: string;
}

interface IGProfile {
  id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

interface IGPost {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface IGInsights {
  period?: string;
  reach?: number;
  impressions?: number;
  profile_views?: number;
  website_clicks?: number;
}

// ── Mock data (shown when not connected) ─────────────

const MOCK_METRICS = {
  followers: 2847,
  following: 512,
  posts: 186,
  reach_30d: 12450,
  impressions_30d: 34200,
  profile_views_7d: 890,
  engagement_rate: 4.2,
};

const MOCK_RECENT_POSTS = [
  { id: "1", type: "carousel", caption: "5 dicas para organizar suas finanças empresariais...", likes: 89, comments: 12, date: "2026-02-20" },
  { id: "2", type: "reel", caption: "Como a conciliação bancária pode salvar seu negócio", likes: 234, comments: 28, date: "2026-02-18" },
  { id: "3", type: "image", caption: "Novo cliente onboard! Bem-vinda @empresa_xyz", likes: 156, comments: 19, date: "2026-02-15" },
  { id: "4", type: "carousel", caption: "Regime tributário: Simples vs Lucro Presumido", likes: 312, comments: 45, date: "2026-02-12" },
  { id: "5", type: "reel", caption: "Um dia na vida do BPO Financeiro", likes: 567, comments: 73, date: "2026-02-10" },
  { id: "6", type: "image", caption: "Resultado do mês: nossos clientes cresceram 23%", likes: 198, comments: 31, date: "2026-02-07" },
];

function formatNumber(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function mediaTypeLabel(type: string) {
  switch (type) {
    case "VIDEO": return "Reel";
    case "CAROUSEL_ALBUM": return "Carrossel";
    default: return "Imagem";
  }
}

// ── Component ────────────────────────────────────────

export default function InstagramPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IGStatus | null>(null);
  const [profile, setProfile] = useState<IGProfile | null>(null);
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [insights, setInsights] = useState<IGInsights | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const { data: statusData } = await api.get("/instagram/status");
      setStatus(statusData);

      if (statusData.connected) {
        const [profileRes, mediaRes, insightsRes] = await Promise.all([
          api.get("/instagram/profile"),
          api.get("/instagram/media?limit=12"),
          api.get("/instagram/insights?period=day"),
        ]);
        setProfile(profileRes.data);
        const media = mediaRes.data;
        setPosts(Array.isArray(media) ? media : media?.data ?? []);
        setInsights(insightsRes.data);
      }
    } catch {
      setStatus({ configured: false, connected: false, username: null });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const connected = status?.connected === true;

  if (loading) {
    return (
      <PageWrapper
        title="Instagram"
        breadcrumb={[
          { label: "Comunicação", href: "/comunicacao" },
          { label: "Instagram" },
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
      title="Instagram"
      breadcrumb={[
        { label: "Comunicação", href: "/comunicacao" },
        { label: "Instagram" },
      ]}
    >
      {connected ? (
        /* ── Connected: Real Data ─────────────────────── */
        <div className="space-y-6">
          {/* Header with refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                {profile?.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <Instagram size={20} className="text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground-primary">
                  @{profile?.username || status?.username || "instagram"}
                </p>
                <p className="text-xs text-foreground-tertiary">
                  {profile?.name || status?.name || "Instagram Business"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground-secondary bg-background-secondary border border-border rounded-lg hover:border-brand-primary/30 transition-colors"
            >
              {refreshing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Atualizar
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Alcance", value: insights?.reach },
              { label: "Impressões", value: insights?.impressions },
              { label: "Visitas ao Perfil", value: insights?.profile_views },
              { label: "Cliques no Site", value: insights?.website_clicks },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-background-primary border border-border rounded-xl p-4"
              >
                <p className="text-xs text-foreground-tertiary mb-1">{kpi.label}</p>
                <span className="text-xl font-bold text-foreground-primary">
                  {kpi.value != null ? formatNumber(kpi.value) : "N/A"}
                </span>
              </div>
            ))}
          </div>

          {/* Profile Overview + Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-background-primary border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center overflow-hidden">
                  {profile?.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">T</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground-primary">
                    @{profile?.username || ""}
                  </p>
                  <p className="text-xs text-foreground-tertiary">
                    {profile?.name || ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 text-center gap-2">
                <div>
                  <p className="text-base font-bold text-foreground-primary">
                    {formatNumber(profile?.media_count ?? 0)}
                  </p>
                  <p className="text-[10px] text-foreground-tertiary">Posts</p>
                </div>
                <div>
                  <p className="text-base font-bold text-foreground-primary">
                    {formatNumber(profile?.followers_count ?? 0)}
                  </p>
                  <p className="text-[10px] text-foreground-tertiary">Seguidores</p>
                </div>
                <div>
                  <p className="text-base font-bold text-foreground-primary">
                    {formatNumber(profile?.follows_count ?? 0)}
                  </p>
                  <p className="text-[10px] text-foreground-tertiary">Seguindo</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-background-primary border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground-primary mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-primary" />
                Métricas do Período
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-foreground-tertiary">Alcance</p>
                  <p className="text-lg font-bold text-foreground-primary">
                    {insights?.reach != null ? formatNumber(insights.reach) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary">Impressões</p>
                  <p className="text-lg font-bold text-foreground-primary">
                    {insights?.impressions != null ? formatNumber(insights.impressions) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary">Visitas ao Perfil</p>
                  <p className="text-lg font-bold text-foreground-primary">
                    {insights?.profile_views != null ? formatNumber(insights.profile_views) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary">Cliques no Site</p>
                  <p className="text-lg font-bold text-foreground-primary">
                    {insights?.website_clicks != null ? formatNumber(insights.website_clicks) : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Posts */}
          <div className="bg-background-primary border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-primary mb-4 flex items-center gap-2">
              <Image size={16} className="text-pink-500" />
              Posts Recentes
            </h3>
            {posts.length === 0 ? (
              <p className="text-sm text-foreground-tertiary text-center py-8">
                Nenhum post encontrado.
              </p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <a
                    key={post.id}
                    href={post.permalink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      {post.media_url || post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt=""
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          {post.media_type === "VIDEO" ? (
                            <TrendingUp size={18} className="text-pink-500" />
                          ) : (
                            <Image size={18} className="text-purple-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground-primary truncate">
                        {post.caption || "(sem legenda)"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-foreground-tertiary">
                          {mediaTypeLabel(post.media_type)}
                        </span>
                        <span className="text-xs text-foreground-tertiary">
                          {new Date(post.timestamp).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <Heart size={12} className="text-red-400" /> {post.like_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <MessageCircle size={12} className="text-blue-400" /> {post.comments_count ?? 0}
                      </span>
                    </div>
                    <ExternalLink size={14} className="text-foreground-tertiary shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Not Connected: Banner + Mock Preview ────── */
        <div className="space-y-6">
          {/* Connect Banner */}
          <div className="bg-pink-50 dark:bg-pink-900/10 border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-500 flex items-center justify-center mx-auto mb-4">
              <Instagram size={32} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-foreground-primary mb-2">
              Conecte o Instagram da Tática
            </h2>
            <p className="text-sm text-foreground-secondary max-w-md mx-auto mb-6">
              Acompanhe métricas do perfil, visualize posts recentes, monitore engajamento
              e DMs diretamente pelo painel.
            </p>
            <button
              onClick={() => window.location.href = "/settings/integracoes"}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
            >
              <Link2 size={16} />
              Configurar Integração
            </button>
            <p className="text-[11px] text-foreground-tertiary mt-3">
              Configure as variáveis INSTAGRAM_* no .env do backend
            </p>
          </div>

          {/* Preview with mock data */}
          <div className="opacity-75 pointer-events-none">
            <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye size={14} /> Prévia — dados de exemplo
            </p>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-background-primary border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">T</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground-primary">@ataticagestao</p>
                    <p className="text-xs text-foreground-tertiary">A Tática Gestão Financeira</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-center gap-2">
                  <div>
                    <p className="text-base font-bold text-foreground-primary">{formatNumber(MOCK_METRICS.posts)}</p>
                    <p className="text-[10px] text-foreground-tertiary">Posts</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground-primary">{formatNumber(MOCK_METRICS.followers)}</p>
                    <p className="text-[10px] text-foreground-tertiary">Seguidores</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground-primary">{formatNumber(MOCK_METRICS.following)}</p>
                    <p className="text-[10px] text-foreground-tertiary">Seguindo</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-background-primary border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground-primary mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand-primary" />
                  Métricas (últimos 30 dias)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-foreground-tertiary">Alcance</p>
                    <p className="text-lg font-bold text-foreground-primary">{formatNumber(MOCK_METRICS.reach_30d)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-tertiary">Impressões</p>
                    <p className="text-lg font-bold text-foreground-primary">{formatNumber(MOCK_METRICS.impressions_30d)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-tertiary">Visitas ao Perfil</p>
                    <p className="text-lg font-bold text-foreground-primary">{MOCK_METRICS.profile_views_7d}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-tertiary">Engajamento</p>
                    <p className="text-lg font-bold text-foreground-primary">{MOCK_METRICS.engagement_rate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Posts mock */}
            <div className="bg-background-primary border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground-primary mb-4 flex items-center gap-2">
                <Image size={16} className="text-pink-500" />
                Posts Recentes
              </h3>
              <div className="space-y-3">
                {MOCK_RECENT_POSTS.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary"
                  >
                    <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0">
                      {post.type === "reel" ? (
                        <TrendingUp size={18} className="text-pink-500" />
                      ) : (
                        <Image size={18} className="text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground-primary truncate">{post.caption}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-foreground-tertiary capitalize">{post.type}</span>
                        <span className="text-xs text-foreground-tertiary">
                          {new Date(post.date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <Heart size={12} className="text-red-400" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <MessageCircle size={12} className="text-blue-400" /> {post.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
