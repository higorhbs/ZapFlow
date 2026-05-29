import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { planAllowsPix } from "@/lib/plan-features";

export function usePlanAllowsPix() {
  const { uid, ready } = useAuth();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", uid],
    queryFn: () => tenantApi.get(),
    enabled: ready && !!uid,
  });
  return {
    pixEnabled: planAllowsPix(tenant?.plan),
    isLoading,
    plan: tenant?.plan,
  };
}
