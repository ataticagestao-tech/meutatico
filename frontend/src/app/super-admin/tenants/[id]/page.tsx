"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${apiUrl}/super-admin/tenants/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setTenant(await res.json());
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [params.id]);

  const updateStatus = async (status: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem("access_token");
    await fetch(`${apiUrl}/super-admin/tenants/${params.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTenant({ ...tenant, status });
  };

  if (loading) return <div className="p-6 text-center text-foreground-tertiary">Carregando...</div>;
  if (!tenant) return <div className="p-6 text-center text-foreground-tertiary">Tenant nao encontrado</div>;

  return (
    <div className="p-6">
      <Link href="/super-admin/tenants" className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground-primary mb-4">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-amber-50 rounded-lg">
          <Building2 size={28} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">{tenant.name}</h1>
          <p className="text-sm text-foreground-secondary">{tenant.schema_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background-primary border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground-primary">Informacoes</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-foreground-secondary">Slug:</span><span>{tenant.slug}</span></div>
            <div className="flex justify-between"><span className="text-foreground-secondary">CNPJ:</span><span>{tenant.document || "-"}</span></div>
            <div className="flex justify-between"><span className="text-foreground-secondary">Email:</span><span>{tenant.email}</span></div>
            <div className="flex justify-between"><span className="text-foreground-secondary">Telefone:</span><span>{tenant.phone || "-"}</span></div>
            <div className="flex justify-between"><span className="text-foreground-secondary">Plano:</span><span>{tenant.plan_name || "-"}</span></div>
            <div className="flex justify-between"><span className="text-foreground-secondary">Criado em:</span><span>{new Date(tenant.created_at).toLocaleDateString("pt-BR")}</span></div>
          </div>
        </div>

        <div className="bg-background-primary border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground-primary">Acoes</h3>
          <div className="space-y-3">
            <p className="text-sm text-foreground-secondary">Status atual: <strong>{tenant.status}</strong></p>
            <div className="flex flex-wrap gap-2">
              {tenant.status !== "active" && (
                <button onClick={() => updateStatus("active")} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Ativar</button>
              )}
              {tenant.status !== "suspended" && (
                <button onClick={() => updateStatus("suspended")} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600">Suspender</button>
              )}
              {tenant.status !== "inactive" && (
                <button onClick={() => updateStatus("inactive")} className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600">Desativar</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
