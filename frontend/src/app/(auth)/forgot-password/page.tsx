"use client";

import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground-primary mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para login
        </Link>

        <h2 className="text-2xl font-semibold text-foreground-primary mb-2">
          Recuperar senha
        </h2>
        <p className="text-foreground-secondary mb-8">
          Informe seu email para receber as instrucoes de recuperacao
        </p>

        {sent ? (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            <p className="font-medium">Email enviado!</p>
            <p className="text-sm mt-1">
              Se o email existir em nossa base, voce recebera as instrucoes de recuperacao.
            </p>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white
                rounded-lg font-medium hover:bg-brand-secondary disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Mail size={20} />
                  Enviar email de recuperacao
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
