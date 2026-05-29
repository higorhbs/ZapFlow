"use client";

import { hostingHref } from "@/lib/hosting-href";

export const BUSINESS_PANEL_NAV_EVENT = "business-panel-nav";

export function navigateBusinessPanel(href: string): void {
  const url = hostingHref(href);
  window.history.pushState({ businessPanel: true }, "", url);
  window.dispatchEvent(new Event(BUSINESS_PANEL_NAV_EVENT));
}
