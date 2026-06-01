export const BUSINESS_PANEL_SEGMENTS = [
  "conversations",
  "appointments",
  "catalog",
  "status",
  "payments",
  "faqs",
  "whatsapp",
  "settings",
] as const;

export type BusinessPanelSegment = (typeof BUSINESS_PANEL_SEGMENTS)[number];

function normPath(path: string): string {
  return (path.split("?")[0] ?? path).replace(/\/$/, "") || "/";
}

export function isActivePanelRoute(pathname: string, href: string): boolean {
  const p = normPath(pathname);
  const h = normPath(href);
  return p === h || p.startsWith(`${h}/`);
}

export function panelHref(businessId: string, segment: string): string {
  return `/businesses/${businessId}/${segment}`;
}

export function getBusinessPanelSegment(pathname: string): BusinessPanelSegment | null {
  const m = normPath(pathname).match(/\/businesses\/[^/]+\/([^/]+)$/);
  const seg = m?.[1];
  return BUSINESS_PANEL_SEGMENTS.includes(seg as BusinessPanelSegment)
    ? (seg as BusinessPanelSegment)
    : null;
}

export function isBusinessPanelHref(href: string): boolean {
  return getBusinessPanelSegment(href) !== null;
}

export function canUseBusinessPanelSpa(pathname: string): boolean {
  return getBusinessPanelSegment(pathname) !== null;
}
