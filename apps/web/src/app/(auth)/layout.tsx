import { GoogleAuthRedirectHandler } from "@/components/auth/GoogleAuthRedirectHandler";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleAuthRedirectHandler />
      {children}
    </>
  );
}
