"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { TaskCard } from "./task-card";
import type { Task } from "@/types/task";

const COLUMN_COLORS: Record<string, string> = {
  backlog: "border-t-slate-400",
  todo: "border-t-blue-400",
  in_progress: "border-t-yellow-400",
  review: "border-t-indigo-400",
  done: "border-t-green-400",
};

interface KanbanColumnProps {
  status: string;
  label: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateClick: (status: string) => void;
}

export function KanbanColumn({
  status,
  label,
  tasks,
  onTaskClick,
  onCreateClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex-shrink-0 w-72 rounded-xl border border-border border-t-4 transition-colors ${
        COLUMN_COLORS[status] || "border-t-gray-400"
      } ${isOver ? "bg-brand-primary/5" : "bg-background-secondary"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground-primary">
            {label}
          </h3>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-background-tertiary text-xs font-medium text-foreground-secondary">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onCreateClick(status)}
          className="p-1 text-foreground-tertiary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="px-3 pb-3 space-y-2 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
