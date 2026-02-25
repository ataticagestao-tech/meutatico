"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold text-foreground-primary">
        Algo deu errado
      </h2>
      <p className="text-foreground-tertiary text-sm">
        {error.message || "Erro inesperado ao carregar a pagina."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition"
      >
        Tentar novamente
      </button>
    </div>
  );
}
