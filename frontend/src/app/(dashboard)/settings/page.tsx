"use client";

import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Users,
  Shield,
  Building2,
  Bell,
  Palette,
  Database,
  Key,
  Globe,
  ChevronRight,
} from "lucide-react";

const settingsGroups = [
  {
    title: "Usuarios e Acessos",
    items: [
      {
        label: "Usuarios",
        description: "Gerencie os usuarios do sistema, convide novos membros e controle acessos.",
        href: "/settings/users",
        icon: Users,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-500",
      },
      {
        label: "Cargos e Permissoes",
        description: "Configure cargos, niveis de acesso e permissoes por modulo.",
        href: "/settings/roles",
        icon: Shield,
        iconBg: "bg-purple-50",
        iconColor: "text-purple-500",
      },
    ],
  },
  {
    title: "Configuracoes Gerais",
    items: [
      {
        label: "Dados da Empresa",
        description: "Informacoes da empresa, logo, endereco e dados fiscais.",
        href: "/settings/company",
        icon: Building2,
        iconBg: "bg-green-50",
        iconColor: "text-green-500",
      },
      {
        label: "Notificacoes",
        description: "Configure alertas por email, push e notificacoes internas.",
        href: "/settings/notifications",
        icon: Bell,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-500",
      },
      {
        label: "Aparencia",
        description: "Personalize o tema, cores e layout do sistema.",
        href: "/settings/appearance",
        icon: Palette,
        iconBg: "bg-pink-50",
        iconColor: "text-pink-500",
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Integracao e API",
        description: "Gerencie chaves de API, webhooks e integracoes externas.",
        href: "/settings/api",
        icon: Key,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
      },
      {
        label: "Backup e Dados",
        description: "Exportacao de dados, backup e restauracao do sistema.",
        href: "/settings/backup",
        icon: Database,
        iconBg: "bg-teal-50",
        iconColor: "text-teal-500",
      },
      {
        label: "Portal do Cliente",
        description: "Configure o portal de autoatendimento para clientes.",
        href: "/settings/portal",
        icon: Globe,
        iconBg: "bg-indigo-50",
        iconColor: "text-indigo-500",
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <PageWrapper
      title="Configuracoes"
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Configuracoes" }]}
    >
      <div className="space-y-8">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-foreground-tertiary uppercase tracking-wider mb-3">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="bg-background-primary border border-border rounded-xl p-5 text-left hover:shadow-md hover:border-brand-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${item.iconBg}`}>
                      <item.icon size={20} className={item.iconColor} />
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-foreground-tertiary group-hover:text-brand-primary transition-colors mt-1"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground-primary mb-1 group-hover:text-brand-primary transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-xs text-foreground-tertiary leading-relaxed">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
