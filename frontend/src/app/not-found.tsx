import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-6xl font-bold text-foreground-tertiary">404</h1>
      <h2 className="text-xl font-semibold text-foreground-primary">
        Pagina nao encontrada
      </h2>
      <p className="text-foreground-tertiary text-sm">
        A pagina que voce procura nao existe ou foi removida.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
