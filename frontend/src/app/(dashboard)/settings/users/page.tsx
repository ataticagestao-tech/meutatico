"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Search,
  Plus,
  X,
  Users,
  MoreVertical,
  UserX,
  UserCheck,
  Edit3,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime, getInitials, passwordChecklist } from "@/lib/utils";
import api from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { QuickTooltip } from "@/components/ui/tooltip";
import type { UserType, UserCreateRequest, UserUpdateRequest } from "@/types/user";
import type { Role } from "@/types/user";

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    undo?: () => void | Promise<void>;
  } | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRoleIds, setFormRoleIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Actions dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);

      const { data } = await api.get(`/users?${params.toString()}`);
      setUsers((data as any).items ?? data ?? []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    api.get("/roles").then((r: any) => {
      setRoles(r.data.items ?? r.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), toast.undo ? 7000 : 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function openCreate() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPhone("");
    setFormRoleIds([]);
    setFormIsActive(true);
    setShowModal(true);
  }

  function openEdit(user: UserType) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormPhone(user.phone || "");
    setFormRoleIds(user.roles.map((r) => r.id));
    setFormIsActive(user.is_active);
    setShowModal(true);
    setActiveDropdown(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formEmail) return;
    if (!editingUser && !formPassword) {
      setToast({ message: "Informe uma senha para o novo usuario.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload: UserUpdateRequest = {
          name: formName,
          email: formEmail,
          phone: formPhone || undefined,
          role_ids: formRoleIds,
          is_active: formIsActive,
        };
        if (formPassword) payload.password = formPassword;
        await api.put(`/users/${editingUser.id}`, payload);
        setToast({ message: "Usuario atualizado com sucesso!", type: "success" });
      } else {
        const payload: UserCreateRequest = {
          name: formName,
          email: formEmail,
          password: formPassword,
          phone: formPhone || undefined,
          role_ids: formRoleIds,
          is_active: formIsActive,
        };
        await api.post("/users", payload);
        setToast({ message: "Usuario criado com sucesso!", type: "success" });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || "Erro ao salvar usuario.";
      const errors: string[] = err?.response?.data?.errors || [];
      const msg = errors.length > 0 ? `${detail}\n${errors.join("\n")}` : detail;
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserActive(user: UserType) {
    const previousActive = user.is_active;
    try {
      await api.put(`/users/${user.id}`, { is_active: !previousActive });
      fetchUsers();
      setToast({
        message: previousActive ? "Usuario desativado." : "Usuario ativado.",
        type: "success",
        undo: async () => {
          try {
            await api.put(`/users/${user.id}`, { is_active: previousActive });
            fetchUsers();
            setToast({ message: "Acao desfeita.", type: "success" });
          } catch {
            setToast({ message: "Nao foi possivel desfazer.", type: "error" });
          }
        },
      });
    } catch {
      setToast({ message: "Erro ao atualizar usuario.", type: "error" });
    }
    setActiveDropdown(null);
  }

  function toggleRole(roleId: string) {
    setFormRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

  return (
    <PageWrapper
      title="Usuarios"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Configuracoes", href: "/settings" },
        { label: "Usuarios" },
      ]}
      actions={
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Novo Usuario
        </button>
      }
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium max-w-sm ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <div className="flex-1">
            {toast.message.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          {toast.undo && (
            <button
              type="button"
              onClick={async () => {
                const undoFn = toast.undo;
                setToast(null);
                if (undoFn) await undoFn();
              }}
              className="shrink-0 px-2.5 py-1 -my-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold uppercase tracking-wider"
            >
              Desfazer
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="bg-background-primary border border-border rounded-xl p-4 mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Cargos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Ultimo Login</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <SkeletonTable rows={5} columns={6} />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={Users}
                      accent="indigo"
                      title={debouncedSearch ? "Nenhum usuario encontrado" : "Nenhum usuario cadastrado"}
                      description={
                        debouncedSearch
                          ? "Tente ajustar sua busca ou limpar os filtros."
                          : "Comece criando o primeiro usuario do sistema."
                      }
                      action={
                        !debouncedSearch && (
                          <button
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
                          >
                            <Plus size={16} />
                            Novo Usuario
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            getInitials(user.name)
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground-primary">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {user.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-medium">
                            {role.name}
                          </span>
                        ))}
                        {user.roles.length === 0 && <span className="text-xs text-foreground-tertiary">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">
                      {user.last_login ? formatDateTime(user.last_login) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <QuickTooltip label="Mais acoes" side="left">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                          className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </QuickTooltip>
                      {activeDropdown === user.id && (
                        <div className="absolute right-4 top-12 w-44 bg-background-primary border border-border rounded-lg shadow-lg py-1 z-10">
                          <button
                            onClick={() => openEdit(user)}
                            className="w-full text-left px-3 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => toggleUserActive(user)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                              user.is_active
                                ? "text-red-500 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            {user.is_active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">
                {editingUser ? "Editar Usuario" : "Novo Usuario"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Nome *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@empresa.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  Senha {editingUser ? "(deixe em branco para manter)" : "*"}
                </label>
                <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="********" className={inputClass} />
                {(!editingUser || formPassword) && (() => {
                  const c = passwordChecklist(formPassword);
                  const Item = ({ ok, label }: { ok: boolean; label: string }) => (
                    <li className={`flex items-center gap-1.5 ${ok ? "text-green-600" : "text-foreground-tertiary"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-foreground-tertiary/40"}`} />
                      {label}
                    </li>
                  );
                  return (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      <Item ok={c.minLength} label="Mínimo 8 caracteres" />
                      <Item ok={c.upper} label="Letra maiúscula" />
                      <Item ok={c.number} label="Número" />
                      <Item ok={c.special} label="Caractere especial" />
                    </ul>
                  );
                })()}
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(00) 00000-0000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Cargos</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                  {roles.length === 0 ? (
                    <p className="text-xs text-foreground-tertiary">Nenhum cargo disponivel</p>
                  ) : (
                    roles.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formRoleIds.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="rounded border-border text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="text-sm text-foreground-primary">{role.name}</span>
                        {role.description && (
                          <span className="text-xs text-foreground-tertiary">— {role.description}</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-sm text-foreground-primary">Usuario ativo</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !formName || !formEmail}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {saving ? "Salvando..." : editingUser ? "Salvar" : "Criar Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
