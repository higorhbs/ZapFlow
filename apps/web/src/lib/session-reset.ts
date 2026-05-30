import type { QueryClient } from "@tanstack/react-query";
import { clearAuthSessionMarkers, readLastAuthUid, writeLastAuthUid } from "./business-route";
import { removeToken } from "./auth";
import { logoutFirebase } from "./firebase-auth";

export function resetClientSession(queryClient?: QueryClient) {
  clearAuthSessionMarkers();
  queryClient?.clear();
}

export async function signOutAndReset(queryClient?: QueryClient) {
  await logoutFirebase();
  removeToken();
  resetClientSession(queryClient);
}
