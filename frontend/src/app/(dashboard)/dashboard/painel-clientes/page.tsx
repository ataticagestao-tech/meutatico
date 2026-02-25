"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { ClientPanelTab } from "@/components/dashboard/client-panel-tab";

export default function PainelClientesPage() {
  return (
    <PageWrapper
      title="Painel por Cliente"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Painel por Cliente" },
      ]}
    >
      <ClientPanelTab />
    </PageWrapper>
  );
}
