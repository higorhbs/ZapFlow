"use client";

import { BusinessHeader } from "./BusinessHeader";
import { useBusinessId } from "@/lib/use-business-id";

export function BusinessShell({ children }: { children: React.ReactNode }) {
  const id = useBusinessId();

  return (
    <div className="flex flex-col min-h-full">
      <BusinessHeader businessId={id} />
      {children}
    </div>
  );
}
