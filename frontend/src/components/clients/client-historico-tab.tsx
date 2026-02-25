"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  FileText,
  Mail,
  Clock,
  Loader2,
  History,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface ClientHistoricoTabProps {
  clientId: string;
}

interface AuditEntry {
  id: string;
  action: string;
  module: string;
  detail: string | null;
  user_name: string;
  created_at: string;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  tasks: CheckSquare,
  documents: FileText,
  email: Mail,
};

const MODULE_COLORS: Record<string, string> = {
  tasks: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  documents: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
  email: "text-pink-500 bg-pink-50 dark:bg-pink-900/20",
};

export function ClientHistoricoTab({ clientId }: ClientHistoricoTabProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data } = await api.get(`/clients/${clientId}/history`);
        setEntries(Array.isArray(data) ? data : data.items || []);
      } catch {
        // API may not exist yet — show empty state
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-background-tertiary mb-4">
          <History size={32} className="text-foreground-tertiary" />
        </div>
        <h4 className="text-sm font-semibold text-foreground-primary mb-1">
          Nenhum registro encontrado
        </h4>
        <p className="text-xs text-foreground-tertiary max-w-sm">
          O histórico de ações será exibido aqui conforme tarefas forem concluídas,
          documentos gerados e comunicações realizadas para este cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => {
        const Icon = MODULE_ICONS[entry.module] || Clock;
        const colorClass = MODULE_COLORS[entry.module] || "text-gray-500 bg-gray-50 dark:bg-gray-900/20";

        return (
          <div key={entry.id} className="flex gap-3 pb-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full shrink-0 ${colorClass}`}>
                <Icon size={14} />
              </div>
              {idx < entries.length - 1 && (
                <div className="w-px flex-1 bg-border mt-2" />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm text-foreground-primary">
                {entry.detail || entry.action}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-foreground-tertiary">
                <span>{entry.user_name}</span>
                <span>&middot;</span>
                <span>{formatDate(entry.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
