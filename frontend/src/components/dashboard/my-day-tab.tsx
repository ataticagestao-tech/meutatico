"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { PRIORITY_COLORS, STATUS_COLORS, TASK_STATUSES } from "@/lib/constants";
import api from "@/lib/api";
import type { Task } from "@/types/task";

export function MyDayTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [allMyTasks, setAllMyTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/tasks?per_page=200");
        const tasks: Task[] = (data as any).items ?? data ?? [];
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const myActive = tasks.filter(
          (t) => t.status !== "done" && t.status !== "cancelled"
        );
        setAllMyTasks(myActive);

        const today = myActive.filter(
          (t) => t.due_date && t.due_date.split("T")[0] === todayStr
        );
        setTodayTasks(today);

        const overdue = myActive.filter(
          (t) => t.due_date && new Date(t.due_date) < now && t.due_date.split("T")[0] !== todayStr
        );
        setOverdueTasks(overdue);
      } catch (err) {
        console.error("Failed to load my day:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const statusLabel = (s: string) =>
    TASK_STATUSES.find((st) => st.value === s)?.label || s;

  function TaskRow({ task }: { task: Task }) {
    const isOverdue =
      task.due_date && new Date(task.due_date) < new Date();
    return (
      <div
        className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-background-secondary transition-colors cursor-pointer"
        onClick={() => router.push("/tasks")}
      >
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
            PRIORITY_COLORS[task.priority] || ""
          }`}
        >
          {task.priority === "urgent"
            ? "Urgente"
            : task.priority === "high"
              ? "Alta"
              : task.priority === "medium"
                ? "Média"
                : "Baixa"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground-primary truncate">
            {task.title}
          </p>
          {task.client_name && (
            <p className="text-[11px] text-foreground-tertiary truncate">
              {task.client_name}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
            STATUS_COLORS[task.status] || ""
          }`}
        >
          {statusLabel(task.status)}
        </span>
        {task.due_date && (
          <span
            className={`text-[11px] whitespace-nowrap ${
              isOverdue ? "text-red-500 font-medium" : "text-foreground-tertiary"
            }`}
          >
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Counters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Calendar size={20} className="text-blue-500" />
          <div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {todayTasks.length}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              tarefas para hoje
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <AlertTriangle size={20} className="text-red-500" />
          <div>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {overdueTasks.length}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">atrasadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <CheckSquare size={20} className="text-amber-500" />
          <div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {allMyTasks.length}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              pendentes no total
            </p>
          </div>
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-3">
            <AlertTriangle size={16} />
            Atrasadas ({overdueTasks.length})
          </h3>
          <div className="space-y-2">
            {overdueTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </div>
      )}

      {/* Today */}
      <div className="bg-background-primary border border-border rounded-xl p-5">
        <h3 className="flex items-center gap-2 font-semibold text-foreground-primary mb-3">
          <Calendar size={16} />
          Tarefas de Hoje ({todayTasks.length})
        </h3>
        {todayTasks.length > 0 ? (
          <div className="space-y-2">
            {todayTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-foreground-tertiary">
            <Clock size={40} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma tarefa para hoje</p>
          </div>
        )}
      </div>
    </div>
  );
}
