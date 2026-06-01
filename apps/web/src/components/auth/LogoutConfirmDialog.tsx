"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

function getAppRoot() {
  return document.getElementById("__next");
}

export function LogoutConfirmDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const root = getAppRoot();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;

    const t = window.setTimeout(() => cancelRef.current?.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (root) root.inert = false;
    };
  }, [open, loading, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={() => !loading && onOpenChange(false)}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
      <Card className="p-6 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center mb-4">
          <LogOut className="w-6 h-6" />
        </div>
        <h2 id="logout-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
          Deseja sair da sua conta?
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Você precisará entrar novamente para acessar o painel.
        </p>
        <div className="flex gap-3">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            className="flex-1"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sair"}
          </Button>
        </div>
      </Card>
      </div>
    </div>,
    document.body,
  );
}
