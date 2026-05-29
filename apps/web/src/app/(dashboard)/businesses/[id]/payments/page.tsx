"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppRouter } from "@/lib/app-navigation";
import { panelHref } from "@/lib/business-nav";
import { usePlanAllowsPix } from "@/lib/use-plan-allows-pix";

export default function PaymentsPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const router = useAppRouter();
  const { pixEnabled, isLoading } = usePlanAllowsPix();

  useEffect(() => {
    if (!businessId || isLoading) return;
    const base = panelHref(businessId, "faqs");
    router.replace(pixEnabled ? `${base}?sec=pix` : base);
  }, [businessId, isLoading, pixEnabled, router]);

  return (
    <div className="flex justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>
  );
}
