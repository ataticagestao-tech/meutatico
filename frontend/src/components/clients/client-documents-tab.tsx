"use client";

import { FolderOpen, ExternalLink, Upload } from "lucide-react";

interface ClientDocumentsTabProps {
  clientId: string;
  clientName?: string;
}

const FOLDER_STRUCTURE = [
  { name: "01 - Contratos", description: "Contratos de prestação de serviço" },
  { name: "02 - Termos", description: "Termos de responsabilidade, NDA, LGPD" },
  { name: "03 - Notas Fiscais", description: "Notas fiscais emitidas e recebidas" },
  { name: "04 - Comprovantes", description: "Comprovantes de pagamento e transferência" },
  { name: "05 - Relatórios Mensais", description: "Relatórios financeiros mensais" },
  { name: "06 - Documentos Fiscais", description: "Documentos fiscais e contábeis" },
  { name: "07 - Diversos", description: "Outros documentos" },
];

export function ClientDocumentsTab({ clientId, clientName }: ClientDocumentsTabProps) {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <FolderOpen size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Integração com OneDrive pendente
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Quando a integração com OneDrive for configurada, os documentos do cliente serão
            exibidos aqui com navegação por pastas, preview e upload.
          </p>
        </div>
      </div>

      {/* Folder Structure Preview */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-primary mb-3">
          Estrutura de Pastas
        </h4>
        <p className="text-xs text-foreground-tertiary mb-4">
          Ao integrar com o OneDrive, a seguinte estrutura será criada automaticamente:
        </p>
        <div className="space-y-1.5">
          {FOLDER_STRUCTURE.map((folder) => (
            <div
              key={folder.name}
              className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg"
            >
              <FolderOpen size={18} className="text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary">{folder.name}</p>
                <p className="text-xs text-foreground-tertiary">{folder.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Preview */}
      <div className="flex flex-wrap gap-3">
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary/50 text-white rounded-lg text-sm font-medium cursor-not-allowed"
        >
          <Upload size={16} />
          Upload de Documento
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-tertiary cursor-not-allowed"
        >
          <ExternalLink size={16} />
          Abrir no OneDrive
        </button>
      </div>
    </div>
  );
}
