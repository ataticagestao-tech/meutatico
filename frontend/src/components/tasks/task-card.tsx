"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, GripVertical } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { PRIORITY_COLORS } from "@/lib/constants";
import type { Task } from "@/types/task";

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-background-primary border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group ${
        isDragging ? "opacity-30" : ""
      } ${isDragOverlay ? "shadow-xl rotate-2" : ""}`}
      onClick={() => !isDragging && onClick(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
            PRIORITY_COLORS[task.priority] || ""
          }`}
        >
          {PRIORITY_LABELS[task.priority] || task.priority}
        </span>
        <button
          className="p-0.5 text-foreground-tertiary hover:text-foreground-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
      </div>

      <p className="text-sm font-medium text-foreground-primary mb-2 line-clamp-2">
        {task.title}
      </p>

      {task.category && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background-tertiary text-foreground-secondary mb-2">
          {task.category}
        </span>
      )}

      <div className="flex items-center justify-between">
        {task.due_date ? (
          <span
            className={`flex items-center gap-1 text-[11px] ${
              isOverdue ? "text-red-500" : "text-foreground-tertiary"
            }`}
          >
            <Calendar size={11} />
            {formatDate(task.due_date)}
          </span>
        ) : (
          <span />
        )}
        {task.assigned_user_name && (
          <div
            className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-bold"
            title={task.assigned_user_name}
          >
            {getInitials(task.assigned_user_name)}
          </div>
        )}
      </div>

      {task.client_name && (
        <p className="text-[11px] text-foreground-tertiary mt-1.5 truncate">
          {task.client_name}
        </p>
      )}
    </div>
  );
}
