"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import api from "@/lib/api";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Login com Google nao esta configurado neste ambiente.",
  exchange_failed: "Nao foi possivel concluir a autenticacao com o Google.",
  session_failed: "Falha ao criar a sessao apos o login Google.",
  missing_code: "O Google nao retornou o codigo de autorizacao.",
  access_denied: "Voce cancelou a autorizacao.",
};

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-primary" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorReason = searchParams.get("reason");
    const success = searchParams.get("google");

    if (errorReason) {
      setError(ERROR_MESSAGES[errorReason] || "Erro ao autenticar com o Google.");
      return;
    }

    if (success !== "ok") {
      setError("Resposta inesperada do servidor de autenticacao.");
      return;
    }

    // Cookie httpOnly ja esta setado pelo backend. Buscar /me e popular sessionStorage.
    api
      .get("/auth/me")
      .then(({ data }) => {
        sessionStorage.setItem(
          "user",
          JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            roles: data.roles ?? [],
            permissions: data.permissions ?? [],
          })
        );
        if (data.tenant) {
          sessionStorage.setItem("tenant", JSON.stringify(data.tenant));
        }
        router.replace("/dashboard");
      })
      .catch(() => {
        setError("Sessao nao pode ser validada. Tente novamente.");
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-foreground-primary mb-2">
            Nao foi possivel entrar
          </h1>
          <p className="text-sm text-foreground-secondary mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-foreground-tertiary">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
        <p className="text-sm">Concluindo login com o Google...</p>
      </div>
    </div>
  );
}
