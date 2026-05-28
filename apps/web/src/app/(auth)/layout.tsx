import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>;
}
