"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { MyDayTab } from "@/components/dashboard/my-day-tab";

export default function MeuDiaPage() {
  return (
    <PageWrapper
      title="Meu Dia"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Meu Dia" },
      ]}
    >
      <MyDayTab />
    </PageWrapper>
  );
}
