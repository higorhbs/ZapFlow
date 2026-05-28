import { LoginScreen } from "@/components/auth/LoginScreen";
import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";

export default function HomePage() {
  return (
    <RedirectIfAuthenticated>
      <LoginScreen />
    </RedirectIfAuthenticated>
  );
}
