"use client";

import { createContext, useContext } from "react";

export type AuthContextValue = {
  ready: boolean;
  uid: string | null;
};

export const AuthContext = createContext<AuthContextValue>({ ready: false, uid: null });

export function useAuth() {
  return useContext(AuthContext);
}
