"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface ClientActionsMenuProps {
  clientId: string;
  clientName: string;
  onDelete: (clientId: string) => void;
}

interface MenuPosition {
  top: number;
  left: number;
}

export function ClientActionsMenu({ clientId, clientName, onDelete }: ClientActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const confirm = useConfirm();

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 88;
    const menuWidth = 176;

    const spaceBelow = window.innerHeight - rect.bottom;

    let top: number;
    let left: number;

    if (spaceBelow >= menuHeight + 8) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - menuHeight - 4;
    }

    if (rect.right >= menuWidth) {
      left = rect.right - menuWidth;
    } else {
      left = rect.left;
    }

    setPosition({ top, left });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const handleScroll = () => setIsOpen(false);
    const handleResize = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updatePosition]);

  const handleEdit = () => {
    setIsOpen(false);
    router.push(`/clients/${clientId}`);
  };

  const handleDelete = async () => {
    setIsOpen(false);
    const confirmed = await confirm({
      title: `Excluir o cliente "${clientName}"?`,
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Sim, excluir",
      variant: "destructive",
    });
    if (confirmed) {
      onDelete(clientId);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${
          isOpen
            ? "bg-background-tertiary text-foreground-primary"
            : "text-foreground-tertiary hover:text-foreground-secondary hover:bg-background-tertiary"
        }`}
        title="Acoes"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-[9999] w-44 py-1 bg-background-primary border border-border rounded-lg shadow-xl"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          role="menu"
        >
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground-primary hover:bg-background-secondary transition-colors"
            role="menuitem"
          >
            <Pencil className="w-4 h-4 text-blue-500" />
            <span>Editar</span>
          </button>

          <div className="my-1 border-t border-border" />

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            role="menuitem"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>
        </div>
      )}
    </>
  );
}
