"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, BarChart3, Shield, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Erro ao fazer login");
      }

      const data = await res.json();
      // Access token agora é enviado como cookie httpOnly pelo backend
      // Salvamos apenas dados não-sensíveis no sessionStorage (limpa ao fechar aba)
      sessionStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("tenant", JSON.stringify(data.tenant));

      // Verifica se é super admin
      if (data.user.roles?.includes("super_admin")) {
        router.push("/super-admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="3" y="3" width="19" height="19" rx="4" fill="white" />
              <rect x="26" y="3" width="19" height="19" rx="4" fill="white" opacity=".2" />
              <rect x="3" y="26" width="19" height="19" rx="4" fill="white" opacity=".2" />
              <rect x="26" y="26" width="19" height="19" rx="4" fill="white" />
            </svg>
            <h1 className="text-4xl font-bold text-white">tática</h1>
          </div>
          <p className="text-xs uppercase tracking-[2px] text-white/40 font-medium mb-12">
            gestão estratégica
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <BarChart3 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Dashboard Inteligente</h3>
                <p className="text-xs text-white/60 mt-0.5">Visão completa do seu negócio em tempo real</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Segurança Total</h3>
                <p className="text-xs text-white/60 mt-0.5">Dados protegidos com criptografia de ponta</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Automação de Processos</h3>
                <p className="text-xs text-white/60 mt-0.5">Reduza trabalho manual com fluxos inteligentes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <rect x="3" y="3" width="19" height="19" rx="4" fill="#2563EB" />
                <rect x="26" y="3" width="19" height="19" rx="4" fill="#2563EB" opacity=".2" />
                <rect x="3" y="26" width="19" height="19" rx="4" fill="#2563EB" opacity=".2" />
                <rect x="26" y="26" width="19" height="19" rx="4" fill="#2563EB" />
              </svg>
              <h1 className="text-3xl font-bold text-foreground-primary">tática</h1>
            </div>
            <p className="text-[10px] uppercase tracking-[1.5px] text-foreground-tertiary font-medium">gestão estratégica</p>
          </div>

          <h2 className="text-2xl font-semibold text-foreground-primary mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-foreground-secondary mb-8">
            Entre com suas credenciais para acessar o sistema
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground-primary mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-2.5 bg-background-primary border border-border rounded-lg
                  text-foreground-primary placeholder:text-foreground-tertiary
                  focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary
                  transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-primary mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="w-full px-4 py-2.5 pr-12 bg-background-primary border border-border rounded-lg
                    text-foreground-primary placeholder:text-foreground-tertiary
                    focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary
                    transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground-secondary"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                <input type="checkbox" className="rounded border-border" />
                Lembrar-me
              </label>
              <a href="/forgot-password" className="text-sm text-brand-primary hover:underline">
                Esqueci minha senha
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white
                rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <LogIn size={20} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
