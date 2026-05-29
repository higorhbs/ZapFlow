"use client";

import NextLink, { type LinkProps } from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { hardNavigateHosting, hostingHref } from "@/lib/hosting-href";
import { isStaticHostingClient } from "@/lib/static-hosting";
import { isBusinessPanelHref } from "@/lib/business-nav";
import { navigateBusinessPanel } from "@/lib/use-business-panel-nav";

type AppLinkProps = LinkProps & Omit<ComponentProps<"a">, "href">;

function toHref(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "/";
  const query = href.query;
  if (!query || typeof query !== "object") return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function isModifiedClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  const target = e.currentTarget.target;
  return (
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    e.button !== 0 ||
    (!!target && target !== "_self")
  );
}

export function AppLink({
  href,
  prefetch,
  replace,
  scroll,
  onClick,
  ...rest
}: AppLinkProps) {
  const path = hostingHref(toHref(href));

  if (isStaticHostingClient()) {
    const runNav = () => {
      if (replace) window.location.replace(new URL(path, window.location.origin).href);
      else hardNavigateHosting(path);
    };

    const handleClickCapture = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || isModifiedClick(e)) return;
      if (isBusinessPanelHref(path)) {
        e.preventDefault();
        e.stopPropagation();
        navigateBusinessPanel(path);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      runNav();
    };

    return <a href={path} onClickCapture={handleClickCapture} {...rest} />;
  }

  return (
    <NextLink href={href} prefetch={prefetch} replace={replace} scroll={scroll} onClick={onClick} {...rest} />
  );
}
