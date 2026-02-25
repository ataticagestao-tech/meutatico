"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, User, Phone, Mail } from "lucide-react";
import api from "@/lib/api";

interface Partner {
  id: string;
  name: string;
  document_number?: string;
  email?: string;
  phone?: string;
  role?: string;
  share_percentage?: number;
}

interface ClientPartnersTabProps {
  clientId: string;
}

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export function ClientPartnersTab({ clientId }: ClientPartnersTabProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/clients/${clientId}/partners`);
        setPartners(Array.isArray(data) ? data : data.items ?? []);
      } catch (err) {
        console.error("Failed to load partners:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg w-fit">
        <Users size={16} className="text-purple-500" />
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
          {partners.length} sócio{partners.length !== 1 ? "s" : ""}
        </span>
      </div>

      {partners.length === 0 ? (
        <div className="text-center py-10 text-foreground-tertiary">
          <Users size={40} className="mx-auto mb-2 opacity-50" />
          <p>Nenhum sócio cadastrado</p>
          <p className="text-xs mt-1">
            Os sócios são importados automaticamente ao buscar o CNPJ
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="border border-border rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground-primary truncate">
                    {partner.name}
                  </p>
                  {partner.role && (
                    <p className="text-xs text-foreground-tertiary">
                      {partner.role}
                    </p>
                  )}
                </div>
                {partner.share_percentage != null && (
                  <span className="text-sm font-bold text-brand-primary">
                    {partner.share_percentage}%
                  </span>
                )}
              </div>

              {partner.document_number && (
                <p className="text-xs text-foreground-secondary">
                  CPF: {maskCPF(partner.document_number)}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-foreground-secondary">
                {partner.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {partner.email}
                  </span>
                )}
                {partner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {maskPhone(partner.phone)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
