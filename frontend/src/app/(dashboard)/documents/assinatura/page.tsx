"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { FileSignature, Lock } from "lucide-react";

export default function AssinaturaDigitalPage() {
  return (
    <PageWrapper
      title="Assinatura Digital"
      breadcrumb={[
        { label: "Documentos", href: "/documents" },
        { label: "Assinatura Digital" },
      ]}
    >
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center mb-6">
          <FileSignature size={40} className="text-blue-500/60" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold mb-4">
          <Lock size={12} />
          Em breve
        </div>

        <h2 className="text-xl font-bold text-foreground-primary mb-2">
          Assinatura Digital
        </h2>
        <p className="text-sm text-foreground-tertiary text-center max-w-md mb-6">
          Em breve você poderá enviar documentos para assinatura eletrônica diretamente pelo sistema,
          com integração a provedores como Clicksign e D4Sign.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
          {[
            { title: "Envio para assinatura", desc: "Envie contratos e termos para assinatura eletrônica" },
            { title: "Acompanhamento", desc: "Status: Pendente, Visualizado, Assinado" },
            { title: "Armazenamento", desc: "Documento assinado salvo automaticamente" },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-background-secondary/50 border border-border/50 rounded-xl p-4 text-center"
            >
              <p className="text-xs font-semibold text-foreground-secondary mb-1">{item.title}</p>
              <p className="text-[10px] text-foreground-tertiary">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
