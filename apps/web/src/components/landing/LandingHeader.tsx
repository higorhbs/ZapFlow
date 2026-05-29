"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/contexts/auth-drawer-context";

const NAV_LINKS = [
  { href: "#hero", label: "Início" },
] as const;

export function LandingHeader() {
  const { openAuth } = useAuthDrawer();
  const router = useRouter();

  return (
    <header className="relative z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-primary">ZapFlow</span>
          <span className="flex size-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <MessageSquare className="size-4 text-primary" />
          </span>
        </Link>

        <nav
          aria-label="Principal"
          className="hidden items-center rounded-full border border-primary/15 bg-secondary px-2 py-1.5 md:flex"
        >
          <Link
            href="#hero"
            className="rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-primary"
          >
            Início
          </Link>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("zapflow:open-onboarding"))}
            className="rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-primary"
          >
            Recursos
          </button>

          <button
            type="button"
            onClick={() => router.push("/plans")}
            className="rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-primary"
          >
            Preços
          </button>

          <button
            type="button"
            onClick={() => window.open(
              "https://wa.me/5531973616454?text=Ol%C3%A1%2C%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es",
              "_blank"
            )}
            className="rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-primary"
          >
            Contato
          </button>
        </nav>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => openAuth("login")}
            className="hidden h-10 rounded-full px-4 text-muted-foreground hover:bg-transparent hover:text-primary sm:inline-flex"
          >
            Entrar
          </Button>
          <Button
            type="button"
            onClick={() => openAuth("register")}
            className="hidden h-10 gap-1.5 rounded-full px-5 hover:bg-brand-700 sm:inline-flex"
          >
            Testar grátis
            <ArrowUpRight />
          </Button>
          <Button
            type="button"
            onClick={() => openAuth("register")}
            className="h-10 rounded-full px-4 hover:bg-brand-700 sm:hidden"
          >
            Testar
          </Button>
        </div>
      </div>
    </header>
  );
}
