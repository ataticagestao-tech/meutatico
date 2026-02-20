"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Upload,
  FolderPlus,
  Folder,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  ChevronRight,
  X,
  Loader2,
  MoreVertical,
  Download,
  Trash2,
  Home,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface DocFolder {
  id: string;
  name: string;
  parent_id?: string;
  children?: DocFolder[];
  created_at: string;
}

interface DocFile {
  id: string;
  name: string;
  file_type: string;
  size: number;
  folder_id?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileType: string): React.ElementType {
  const type = fileType.toLowerCase();
  if (type.includes("image") || type.includes("png") || type.includes("jpg") || type.includes("jpeg")) return FileImage;
  if (type.includes("pdf") || type.includes("doc") || type.includes("text")) return FileText;
  if (type.includes("sheet") || type.includes("xls") || type.includes("csv")) return FileSpreadsheet;
  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return FileArchive;
  return File;
}

function getFileColor(fileType: string): string {
  const type = fileType.toLowerCase();
  if (type.includes("image") || type.includes("png") || type.includes("jpg")) return "text-purple-500 bg-purple-50";
  if (type.includes("pdf")) return "text-red-500 bg-red-50";
  if (type.includes("doc")) return "text-blue-500 bg-blue-50";
  if (type.includes("sheet") || type.includes("xls") || type.includes("csv")) return "text-green-500 bg-green-50";
  if (type.includes("zip") || type.includes("rar")) return "text-yellow-500 bg-yellow-50";
  return "text-gray-500 bg-gray-50";
}

export default function DocumentsPage() {
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Documentos" },
  ]);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Dropdown for file actions
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("folder_id", currentFolderId);

      const [foldersRes, filesRes] = await Promise.all([
        api.get(`/documents/folders?${params.toString()}`).catch(() => ({ data: { data: [] } })),
        api.get(`/documents/files?${params.toString()}`).catch(() => ({ data: { data: [] } })),
      ]);

      setFolders((foldersRes.data as any).data ?? foldersRes.data ?? []);
      setFiles((filesRes.data as any).data ?? filesRes.data ?? []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function navigateToFolder(folderId: string | null, folderName: string) {
    if (folderId === currentFolderId) return;
    setCurrentFolderId(folderId);

    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Documentos" }]);
    } else {
      const existingIdx = breadcrumbs.findIndex((b) => b.id === folderId);
      if (existingIdx >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIdx + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
      }
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await api.post("/documents/folders", {
        name: newFolderName.trim(),
        parent_id: currentFolderId || undefined,
      });
      setShowFolderModal(false);
      setNewFolderName("");
      fetchContents();
      setToast({ message: "Pasta criada com sucesso!", type: "success" });
    } catch (err) {
      setToast({ message: "Erro ao criar pasta.", type: "error" });
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const formData = new FormData();
        formData.append("file", fileList[i]);
        if (currentFolderId) formData.append("folder_id", currentFolderId);

        await api.post("/documents/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      fetchContents();
      setToast({ message: `${fileList.length} arquivo(s) enviado(s) com sucesso!`, type: "success" });
    } catch (err) {
      setToast({ message: "Erro ao enviar arquivo(s).", type: "error" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteFile(fileId: string) {
    try {
      await api.delete(`/documents/files/${fileId}`);
      fetchContents();
      setToast({ message: "Arquivo excluido.", type: "success" });
    } catch {
      setToast({ message: "Erro ao excluir arquivo.", type: "error" });
    }
    setActiveDropdown(null);
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      await api.delete(`/documents/folders/${folderId}`);
      fetchContents();
      setToast({ message: "Pasta excluida.", type: "success" });
    } catch {
      setToast({ message: "Erro ao excluir pasta.", type: "error" });
    }
  }

  async function handleDownload(file: DocFile) {
    try {
      const { data } = await api.get(`/documents/files/${file.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: try the URL directly
      if (file.url) window.open(file.url, "_blank");
    }
    setActiveDropdown(null);
  }

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  return (
    <PageWrapper
      title="Documentos"
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Documentos" }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
          >
            <FolderPlus size={16} />
            Nova Pasta
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Upload size={16} />
            {uploading ? "Enviando..." : "Upload"}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      }
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: Folder Tree */}
        <div className="lg:w-60 shrink-0">
          <div className="bg-background-primary border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground-primary mb-3">Pastas</h3>
            <button
              onClick={() => navigateToFolder(null, "Documentos")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                currentFolderId === null
                  ? "bg-brand-primary/10 text-brand-primary font-medium"
                  : "text-foreground-secondary hover:bg-background-tertiary"
              }`}
            >
              <Home size={14} />
              Raiz
            </button>
            {folders.length === 0 && currentFolderId === null && (
              <p className="text-xs text-foreground-tertiary py-4 text-center">Nenhuma pasta</p>
            )}
          </div>
        </div>

        {/* Right: File Grid */}
        <div className="flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
            {breadcrumbs.map((bc, idx) => (
              <div key={bc.id ?? "root"} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight size={14} className="text-foreground-tertiary" />}
                <button
                  onClick={() => navigateToFolder(bc.id, bc.name)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    idx === breadcrumbs.length - 1
                      ? "font-medium text-foreground-primary"
                      : "text-foreground-secondary hover:text-brand-primary"
                  }`}
                >
                  {bc.name}
                </button>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-brand-primary" />
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <Folder size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-50" />
              <p className="text-foreground-tertiary mb-1">Nenhum arquivo ou pasta</p>
              <p className="text-foreground-tertiary text-xs">Envie arquivos ou crie pastas para organizar seus documentos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Folders */}
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onDoubleClick={() => navigateToFolder(folder.id, folder.name)}
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                  className="bg-background-primary border border-border rounded-xl p-4 hover:shadow-md cursor-pointer transition-shadow text-center group relative"
                >
                  <Folder size={36} className="mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium text-foreground-primary truncate">{folder.name}</p>
                  <p className="text-[10px] text-foreground-tertiary mt-1">{formatDate(folder.created_at)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="absolute top-2 right-2 p-1 text-foreground-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Excluir pasta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Files */}
              {files.map((file) => {
                const Icon = getFileIcon(file.file_type);
                const color = getFileColor(file.file_type);
                return (
                  <div
                    key={file.id}
                    className="bg-background-primary border border-border rounded-xl p-4 hover:shadow-md transition-shadow text-center group relative"
                  >
                    <div className={`w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center ${color}`}>
                      <Icon size={24} />
                    </div>
                    <p className="text-sm font-medium text-foreground-primary truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-foreground-tertiary mt-1">
                      {formatFileSize(file.size)} &middot; {formatDate(file.created_at)}
                    </p>
                    {/* Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === file.id ? null : file.id); }}
                        className="p-1 text-foreground-tertiary hover:text-foreground-primary rounded"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeDropdown === file.id && (
                        <div className="absolute right-0 top-7 w-32 bg-background-primary border border-border rounded-lg shadow-lg py-1 z-10">
                          <button
                            onClick={() => handleDownload(file)}
                            className="w-full text-left px-3 py-1.5 text-sm text-foreground-secondary hover:bg-background-tertiary flex items-center gap-2"
                          >
                            <Download size={12} />
                            Baixar
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={12} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFolderModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-sm mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">Nova Pasta</h2>
              <button onClick={() => setShowFolderModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Nome da Pasta</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creatingFolder || !newFolderName.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <FolderPlus size={16} />
                  {creatingFolder ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
