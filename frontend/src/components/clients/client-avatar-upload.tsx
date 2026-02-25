"use client";

import { useRef, useState } from "react";
import { ClientAvatar } from "./client-avatar";
import { Camera, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/api";

interface ClientAvatarUploadProps {
  clientId: string;
  logoUrl?: string | null;
  name: string;
  size?: "md" | "lg" | "xl";
  onUploadSuccess: (newUrl: string | null) => void;
}

export function ClientAvatarUpload({
  clientId,
  logoUrl,
  name,
  size = "lg",
  onUploadSuccess,
}: ClientAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      alert("Formato nao suportado. Use JPG, PNG, WebP ou SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Arquivo muito grande. Maximo: 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await api.post(
        `/clients/${clientId}/logo`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      onUploadSuccess(response.data.logo_url);
    } catch {
      alert("Erro ao fazer upload. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Remover a logo do cliente?")) return;

    setIsUploading(true);
    try {
      await api.delete(`/clients/${clientId}/logo`);
      onUploadSuccess(null);
    } catch {
      // silent
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="relative group cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <ClientAvatar logoUrl={logoUrl} name={name} size={size} />

      {(isHovering || isUploading) && (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      )}

      {logoUrl && isHovering && !isUploading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveLogo();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition z-10"
          title="Remover logo"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
