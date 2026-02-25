"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Calendar, CheckSquare } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { PRIORITY_COLORS, STATUS_COLORS, TASK_STATUSES } from "@/lib/constants";
import api from "@/lib/api";
import type { Task } from "@/types/task";

interface ClientTasksTabProps {
  clientId: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export function ClientTasksTab({ clientId }: ClientTasksTabProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/tasks?client_id=${clientId}&per_page=100`);
        setTasks((data as any).items ?? data ?? []);
      } catch (err) {
        console.error("Failed to load tasks:", err);
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

  const byStatus = TASK_STATUSES.reduce(
    (acc, s) => {
      acc[s.value] = tasks.filter((t) => t.status === s.value);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const total = tasks.length;
  const done = byStatus["done"]?.length || 0;
  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  ).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <CheckSquare size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {total} tarefas total
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {done} concluídas
          </span>
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {overdue} atrasadas
            </span>
          </div>
        )}
        <button
          onClick={() => router.push("/tasks")}
          className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-sm font-medium hover:bg-brand-primary/20 transition-colors ml-auto"
        >
          <Plus size={14} />
          Nova Tarefa
        </button>
      </div>

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <div className="text-center py-10 text-foreground-tertiary">
          <CheckSquare size={40} className="mx-auto mb-2 opacity-50" />
          <p>Nenhuma tarefa para este cliente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks
            .sort((a, b) => {
              const statusOrder = ["in_progress", "todo", "backlog", "review", "done"];
              return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            })
            .map((task) => {
              const isOverdue =
                task.due_date &&
                new Date(task.due_date) < new Date() &&
                task.status !== "done";
              const statusLabel =
                TASK_STATUSES.find((s) => s.value === task.status)?.label ||
                task.status;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-background-secondary transition-colors"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      PRIORITY_COLORS[task.priority] || ""
                    }`}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        task.status === "done"
                          ? "text-foreground-tertiary line-through"
                          : "text-foreground-primary"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      STATUS_COLORS[task.status] || ""
                    }`}
                  >
                    {statusLabel}
                  </span>
                  {task.due_date && (
                    <span
                      className={`flex items-center gap-1 text-[11px] whitespace-nowrap ${
                        isOverdue
                          ? "text-red-500 font-medium"
                          : "text-foreground-tertiary"
                      }`}
                    >
                      <Calendar size={11} />
                      {formatDate(task.due_date)}
                    </span>
                  )}
                  {task.assigned_user_name && (
                    <div
                      className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-bold shrink-0"
                      title={task.assigned_user_name}
                    >
                      {getInitials(task.assigned_user_name)}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
