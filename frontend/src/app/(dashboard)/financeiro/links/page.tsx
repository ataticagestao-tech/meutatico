"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { ExternalLink } from "lucide-react";

const LINKS = [
  { label: "Contas a Pagar", path: "contas-pagar" },
  { label: "Contas a Receber", path: "contas-receber" },
  { label: "Conciliação Bancária", path: "conciliacao" },
  { label: "Resultado Financeiro", path: "resultado" },
  { label: "Relatórios", path: "relatorios" },
];

const BASE_URL = "https://ataticagestao.com/auth";

export default function LinksRapidosPage() {
  return (
    <PageWrapper
      title="Links Rápidos"
      breadcrumb={[
        { label: "Financeiro", href: "/financeiro" },
        { label: "Links Rápidos" },
      ]}
    >
      <div className="max-w-2xl">
        <p className="text-sm text-foreground-secondary mb-6">
          Acesso direto ao sistema financeiro. Cada link abre em uma nova aba.
        </p>
        <div className="space-y-2">
          {LINKS.map((link) => (
            <a
              key={link.path}
              href={`${BASE_URL}/${link.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-background-primary border border-border rounded-xl hover:shadow-md transition-shadow group"
            >
              <span className="text-sm font-medium text-foreground-primary">
                {link.label}
              </span>
              <ExternalLink
                size={16}
                className="text-foreground-tertiary group-hover:text-brand-primary transition-colors"
              />
            </a>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
