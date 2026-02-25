"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  X,
  Loader2,
  Shield,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import type { Role, Permission } from "@/types/user";

interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export default function SettingsRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissionIds, setFormPermissionIds] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/roles");
      setRoles((data as any).items ?? data ?? []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  useEffect(() => {
    api.get("/permissions").then((r: any) => {
      setAllPermissions(r.data.items ?? r.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Group permissions by module
  const permissionGroups: PermissionGroup[] = [];
  const moduleMap = new Map<string, Permission[]>();
  allPermissions.forEach((p) => {
    const existing = moduleMap.get(p.module);
    if (existing) {
      existing.push(p);
    } else {
      moduleMap.set(p.module, [p]);
    }
  });
  moduleMap.forEach((permissions, module) => {
    permissionGroups.push({ module, permissions });
  });
  permissionGroups.sort((a, b) => a.module.localeCompare(b.module));

  const MODULE_LABELS: Record<string, string> = {
    clients: "Clientes",
    tickets: "Solicitacoes",
    tasks: "Tarefas",
    knowledge_base: "Base de Conhecimento",
    documents: "Documentos",
    users: "Usuarios",
    roles: "Cargos",
    settings: "Configuracoes",
    reports: "Relatorios",
    dashboard: "Dashboard",
  };

  const ACTION_LABELS: Record<string, string> = {
    create: "Criar",
    read: "Visualizar",
    update: "Editar",
    delete: "Excluir",
    manage: "Gerenciar",
    export: "Exportar",
  };

  function openCreate() {
    setEditingRole(null);
    setFormName("");
    setFormDescription("");
    setFormPermissionIds([]);
    setExpandedModules([]);
    setShowModal(true);
  }

  function openEdit(role: Role) {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormPermissionIds(role.permissions.map((p) => p.id));
    setExpandedModules([]);
    setShowModal(true);
  }

  function togglePermission(permId: string) {
    setFormPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  }

  function toggleModuleAll(module: string) {
    const modulePerms = allPermissions.filter((p) => p.module === module);
    const allSelected = modulePerms.every((p) => formPermissionIds.includes(p.id));
    if (allSelected) {
      setFormPermissionIds((prev) => prev.filter((id) => !modulePerms.some((p) => p.id === id)));
    } else {
      const newIds = modulePerms.map((p) => p.id).filter((id) => !formPermissionIds.includes(id));
      setFormPermissionIds((prev) => [...prev, ...newIds]);
    }
  }

  function toggleExpandModule(module: string) {
    setExpandedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName) return;

    setSaving(true);
    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        permission_ids: formPermissionIds,
      };

      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, payload);
        setToast({ message: "Cargo atualizado com sucesso!", type: "success" });
      } else {
        await api.post("/roles", payload);
        setToast({ message: "Cargo criado com sucesso!", type: "success" });
      }
      setShowModal(false);
      fetchRoles();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erro ao salvar cargo.";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(roleId: string) {
    if (!window.confirm("Tem certeza que deseja excluir este cargo?")) return;
    try {
      await api.delete(`/roles/${roleId}`);
      fetchRoles();
      setToast({ message: "Cargo excluido.", type: "success" });
    } catch {
      setToast({ message: "Erro ao excluir cargo.", type: "error" });
    }
  }

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

  // Color variants for role badges
  const ROLE_COLORS = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
    "bg-orange-100 text-orange-800",
    "bg-pink-100 text-pink-800",
    "bg-teal-100 text-teal-800",
    "bg-red-100 text-red-800",
    "bg-indigo-100 text-indigo-800",
  ];

  return (
    <PageWrapper
      title="Cargos e Permissoes"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Configuracoes", href: "/settings" },
        { label: "Cargos e Permissoes" },
      ]}
      actions={
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Novo Cargo
        </button>
      }
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      {/* Roles List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <Shield size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-50" />
          <p className="text-foreground-tertiary mb-1">Nenhum cargo cadastrado</p>
          <p className="text-foreground-tertiary text-xs">Crie cargos para controlar o acesso ao sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role, idx) => (
            <div
              key={role.id}
              className="bg-background-primary border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[idx % ROLE_COLORS.length]}`}>
                    {role.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(role)}
                    className="p-1.5 text-foreground-tertiary hover:text-brand-primary rounded-lg hover:bg-background-tertiary transition-colors"
                    title="Editar"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-1.5 text-foreground-tertiary hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {role.description && (
                <p className="text-sm text-foreground-secondary mb-3">{role.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                <Shield size={12} />
                <span>
                  {role.permissions.length} permiss{role.permissions.length === 1 ? "ao" : "oes"}
                </span>
              </div>

              {role.permissions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.permissions.slice(0, 6).map((perm) => (
                    <span
                      key={perm.id}
                      className="px-2 py-0.5 bg-background-tertiary text-foreground-secondary text-[10px] rounded-full"
                    >
                      {MODULE_LABELS[perm.module] || perm.module}: {ACTION_LABELS[perm.action] || perm.action}
                    </span>
                  ))}
                  {role.permissions.length > 6 && (
                    <span className="px-2 py-0.5 bg-background-tertiary text-foreground-tertiary text-[10px] rounded-full">
                      +{role.permissions.length - 6} mais
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground-primary">
                {editingRole ? "Editar Cargo" : "Novo Cargo"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
                <div>
                  <label className={labelClass}>Nome do Cargo *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Administrador, Atendente..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Descricao</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder="Descricao do cargo..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className={labelClass}>
                    Permissoes ({formPermissionIds.length} selecionada{formPermissionIds.length !== 1 ? "s" : ""})
                  </label>
                  <div className="border border-border rounded-lg overflow-hidden">
                    {permissionGroups.length === 0 ? (
                      <p className="text-sm text-foreground-tertiary p-4 text-center">
                        Nenhuma permissao disponivel
                      </p>
                    ) : (
                      permissionGroups.map((group) => {
                        const isExpanded = expandedModules.includes(group.module);
                        const selectedCount = group.permissions.filter((p) =>
                          formPermissionIds.includes(p.id)
                        ).length;
                        const allSelected = selectedCount === group.permissions.length;

                        return (
                          <div key={group.module} className="border-b border-border last:border-b-0">
                            <button
                              type="button"
                              onClick={() => toggleExpandModule(group.module)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-secondary transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown size={14} className="text-foreground-tertiary" /> : <ChevronRight size={14} className="text-foreground-tertiary" />}
                                <span className="text-sm font-medium text-foreground-primary">
                                  {MODULE_LABELS[group.module] || group.module}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground-tertiary">
                                  {selectedCount}/{group.permissions.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleModuleAll(group.module); }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                    allSelected
                                      ? "bg-brand-primary text-white"
                                      : "bg-background-tertiary text-foreground-secondary hover:bg-brand-primary/10 hover:text-brand-primary"
                                  }`}
                                >
                                  {allSelected ? "Desmarcar" : "Todos"}
                                </button>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-3 pl-10 space-y-2">
                                {group.permissions.map((perm) => (
                                  <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                                    <div
                                      onClick={() => togglePermission(perm.id)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                        formPermissionIds.includes(perm.id)
                                          ? "bg-brand-primary border-brand-primary"
                                          : "border-border"
                                      }`}
                                    >
                                      {formPermissionIds.includes(perm.id) && (
                                        <Check size={10} className="text-white" />
                                      )}
                                    </div>
                                    <span className="text-sm text-foreground-primary">
                                      {ACTION_LABELS[perm.action] || perm.action}
                                    </span>
                                    {perm.description && (
                                      <span className="text-xs text-foreground-tertiary">— {perm.description}</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-border shrink-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !formName}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  {saving ? "Salvando..." : editingRole ? "Salvar" : "Criar Cargo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
