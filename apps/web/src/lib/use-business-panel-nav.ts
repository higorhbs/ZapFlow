"use client";

import { hostingHref } from "@/lib/hosting-href";
import { canUseBusinessPanelSpa } from "@/lib/business-nav";

export const BUSINESS_PANEL_NAV_EVENT = "business-panel-nav";

export function navigateBusinessPanel(href: string): void {
  if (typeof window === "undefined") return;
  const path = hostingHref(href);
  const next = new URL(path, window.location.origin);
  const current = `${window.location.pathname}${window.location.search}`;
  const target = `${next.pathname}${next.search}`;
  if (current === target) return;

  if (canUseBusinessPanelSpa(next.pathname) && canUseBusinessPanelSpa(window.location.pathname)) {
    window.history.pushState(null, "", next.href);
    window.dispatchEvent(new Event(BUSINESS_PANEL_NAV_EVENT));
    return;
  }

  window.location.assign(next.href);
}
