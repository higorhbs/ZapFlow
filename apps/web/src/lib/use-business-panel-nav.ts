"use client";

import { canUseBusinessPanelSpa } from "@/lib/business-nav";
import { hostingHref, isFirebaseHostingClient } from "@/lib/hosting-href";

export const BUSINESS_PANEL_NAV_EVENT = "business-panel-nav";

function hardNavigate(href: string): void {
  const url = hostingHref(href);
  window.location.href = new URL(url, window.location.origin).href;
}

export function navigateBusinessPanel(href: string): void {
  if (!isFirebaseHostingClient() || !canUseBusinessPanelSpa(window.location.pathname)) {
    hardNavigate(href);
    return;
  }

  const url = hostingHref(href);
  window.history.pushState({ businessPanel: true }, "", url);
  window.dispatchEvent(new Event(BUSINESS_PANEL_NAV_EVENT));
}
