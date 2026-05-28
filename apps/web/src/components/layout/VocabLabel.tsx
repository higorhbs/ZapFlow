"use client";

import { cn } from "@/lib/utils";

export function VocabLabel({
  ready,
  children,
  className,
  variant = "default",
  width = "5.5rem",
  block,
}: {
  ready: boolean;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "light";
  width?: string;
  block?: boolean;
}) {
  if (!ready) {
    return (
      <span
        className={cn(
          "rounded-md animate-pulse",
          block ? "block" : "inline-block",
          variant === "light" ? "bg-white/35" : "bg-gray-200/90",
          block ? "h-7" : "h-4",
          className
        )}
        style={{ width }}
        aria-hidden
      />
    );
  }
  return <span suppressHydrationWarning>{children}</span>;
}
