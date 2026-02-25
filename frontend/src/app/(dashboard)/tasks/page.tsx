"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { KanbanColumn } from "@/components/tasks/kanban-column";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TemplatePickerModal } from "@/components/tasks/template-picker-modal";
import { Filter, Loader2, FileText } from "lucide-react";
import { TASK_STATUSES, TICKET_PRIORITIES } from "@/lib/constants";
import api from "@/lib/api";
import type { Task } from "@/types/task";
import type { Client } from "@/types/client";
import type { UserType } from "@/types/user";

const COLUMNS = TASK_STATUSES;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [filterUser, setFilterUser] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForColumn, setCreateForColumn] = useState("todo");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Drag state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", "200");
      if (filterUser) params.set("assigned_user_id", filterUser);
      if (filterClient) params.set("client_id", filterClient);
      if (filterPriority) params.set("priority", filterPriority);

      const { data } = await api.get(`/tasks?${params.toString()}`);
      setTasks((data as any).items ?? data ?? []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterClient, filterPriority]);

  useEffect(() => {
    fetchTasks();
    api
      .get("/users")
      .then((r: any) => setUsers(r.data.items ?? r.data ?? []))
      .catch(() => {});
    api
      .get("/clients?per_page=100")
      .then((r: any) => setClients(r.data.items ?? []))
      .catch(() => {});
  }, [fetchTasks]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const col of COLUMNS) {
      grouped[col.value] = tasks
        .filter((t) => t.status === col.value)
        .sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [tasks]);

  // Find which column a task belongs to
  function findColumnOfTask(taskId: string): string | null {
    for (const col of COLUMNS) {
      if (tasksByColumn[col.value]?.some((t) => t.id === taskId)) {
        return col.value;
      }
    }
    return null;
  }

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnOfTask(activeId);
    // overId can be a task id or a column status
    const overColumn = COLUMNS.some((c) => c.value === overId)
      ? overId
      : findColumnOfTask(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    // Move task to new column optimistically
    setTasks((prev) => {
      const task = prev.find((t) => t.id === activeId);
      if (!task) return prev;
      return prev.map((t) =>
        t.id === activeId ? { ...t, status: overColumn as Task["status"] } : t
      );
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    // Determine target column
    const targetColumn = COLUMNS.some((c) => c.value === overId)
      ? overId
      : findColumnOfTask(overId);

    if (!targetColumn) return;

    // Calculate new position
    const columnTasks = tasks
      .filter((t) => t.status === targetColumn && t.id !== activeId)
      .sort((a, b) => a.position - b.position);

    let newPosition = 0;
    if (overId !== targetColumn) {
      // Dropped on a specific task — insert at that position
      const overIndex = columnTasks.findIndex((t) => t.id === overId);
      newPosition = overIndex >= 0 ? overIndex : columnTasks.length;
    } else {
      // Dropped on the column itself — append at end
      newPosition = columnTasks.length;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              status: targetColumn as Task["status"],
              position: newPosition,
            }
          : t
      )
    );

    // API call
    try {
      await api.patch(`/tasks/${activeId}/move`, {
        status: targetColumn,
        position: newPosition,
      });
    } catch (err) {
      console.error("Failed to move task:", err);
      fetchTasks(); // Revert on error
    }
  }

  function openCreate(columnStatus: string) {
    setCreateForColumn(columnStatus);
    setShowCreateModal(true);
  }

  function openDetail(task: Task) {
    setSelectedTask(task);
    setShowDetailModal(true);
  }

  const selectClass =
    "h-9 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  return (
    <PageWrapper
      title="Tarefas"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Tarefas" },
      ]}
    >
      {/* Filters + Actions */}
      <div className="bg-background-primary border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-foreground-tertiary" />
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-sm font-medium hover:bg-brand-primary/20 transition-colors ml-auto"
          >
            <FileText size={14} />
            Templates
          </button>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={selectClass}
          >
            <option value="">Responsável</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className={selectClass}
          >
            <option value="">Cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.trade_name || c.company_name}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={selectClass}
          >
            <option value="">Prioridade</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.value}
                status={col.value}
                label={col.label}
                tasks={tasksByColumn[col.value] || []}
                onTaskClick={openDetail}
                onCreateClick={openCreate}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onClick={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        columnStatus={createForColumn}
        users={users}
        clients={clients}
        onCreated={fetchTasks}
      />

      {/* Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        users={users}
        clients={clients}
        onUpdated={fetchTasks}
        onDeleted={fetchTasks}
      />

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        users={users}
        clients={clients}
        onApplied={fetchTasks}
      />
    </PageWrapper>
  );
}
