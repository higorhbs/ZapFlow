import { BusinessShell } from "@/components/business/BusinessShell";

export function generateStaticParams() {
  return [{ id: "app" }];
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessShell usePanelHost>{children}</BusinessShell>;
}
