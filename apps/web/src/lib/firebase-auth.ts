import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  type User,
} from "firebase/auth";
import {
  getClientAuth,
  ensureClientTenant,
  updateClientTenantProfile,
} from "@zapflow/firebase/client";

async function ensureTenantProfile(user: User, name?: string) {
  const email = user.email;
  if (!email) throw new Error("E-mail não encontrado na conta Firebase");
  const displayName = name ?? user.displayName ?? email.split("@")[0] ?? "Usuário";
  await user.getIdToken(true);
  await ensureClientTenant(user.uid, { name: displayName, email });
}

export function authErrorMessage(err: unknown, fallback: string): string {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  const map: Record<string, string> = {
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/popup-blocked": "Popup bloqueado. Permita popups para localhost:3000.",
    "auth/cancelled-popup-request": "Login cancelado.",
    "auth/unauthorized-domain":
      "Domínio não autorizado. Em Firebase → Authentication → Settings, adicione localhost.",
    "auth/operation-not-allowed": "Ative o provedor Google em Firebase → Authentication → Sign-in method.",
    "auth/account-exists-with-different-credential":
      "Este e-mail já está cadastrado com outro método de login.",
    "auth/invalid-credential": "Credenciais inválidas.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/email-already-in-use": "E-mail já cadastrado.",
    "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres).",
    "auth/requires-recent-login": "Por segurança, saia e entre de novo antes de alterar e-mail ou senha.",
    "auth/invalid-email": "E-mail inválido.",
    "permission-denied": "Sem permissão no Firestore. Confira as regras e o login.",
  };
  const raw = err instanceof Error ? err.message : fallback;
  if (raw.toLowerCase().includes("requested action is invalid")) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "sua URL";
    return `Login Google inválido em ${origin}. Use http://localhost:3000 no dev ou confira OAuth (npm run google:oauth-setup): origens JS + redirect /__/auth/handler para localhost e zapflow-higor-2026.web.app.`;
  }
  if (raw.toLowerCase().includes("origin_mismatch")) {
    return "Use http://localhost:3000 (não IP da rede). Se persistir: npm run google:oauth-setup.";
  }
  if (raw.toLowerCase().includes("redirect_uri_mismatch")) {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "SEU-PROJETO";
    return `Redirect URI inválida. No Google Cloud → Credentials → OAuth Client, adicione exatamente: https://${project}.firebaseapp.com/__/auth/handler (rode npm run google:oauth-setup).`;
  }
  return map[code] ?? raw;
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const auth = getClientAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await ensureTenantProfile(cred.user, name);
  const token = await cred.user.getIdToken();
  return {
    token,
    tenant: { id: cred.user.uid, name, email, plan: "STARTER" as const },
  };
}

export async function loginWithEmail(email: string, password: string) {
  const auth = getClientAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureTenantProfile(cred.user);
  const token = await cred.user.getIdToken();
  return { token, user: cred.user };
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function isLocalAuthOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function isPrivateNetworkHost(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  const [a, b] = host.split(".").map(Number);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function assertGoogleAuthOrigin(): void {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  if (isPrivateNetworkHost(host)) {
    const port = window.location.port || "3000";
    throw new Error(
      `Abra http://localhost:${port} (não use ${window.location.host}). O Google OAuth não aceita IP da rede (${host}).`
    );
  }
}

async function finishGoogleLogin(user: User) {
  await ensureTenantProfile(user);
  const token = await user.getIdToken();
  return { token, user };
}

function shouldFallbackToRedirect(err: unknown): boolean {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  const msg = err instanceof Error ? err.message : "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/operation-not-supported-in-this-environment" ||
    msg.toLowerCase().includes("requested action is invalid") ||
    msg.toLowerCase().includes("origin_mismatch") ||
    msg.toLowerCase().includes("redirect_uri_mismatch")
  );
}

export async function loginWithGoogle(): Promise<{ token: string; user: User } | null> {
  assertGoogleAuthOrigin();
  const auth = getClientAuth();
  const provider = googleProvider();

  if (!isLocalAuthOrigin()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    const cred = await signInWithPopup(auth, provider);
    return finishGoogleLogin(cred.user);
  } catch (err: unknown) {
    if (shouldFallbackToRedirect(err)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

let googleRedirectPromise: Promise<{ token: string; user: User } | null> | null = null;

export function completeGoogleRedirect() {
  if (!googleRedirectPromise) {
    googleRedirectPromise = (async () => {
      const cred = await getRedirectResult(getClientAuth());
      if (!cred?.user) return null;
      return finishGoogleLogin(cred.user);
    })();
  }
  return googleRedirectPromise;
}

export async function getIdToken(): Promise<string | null> {
  const user = getClientAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function logoutFirebase() {
  await signOut(getClientAuth());
}

export function watchAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(getClientAuth(), cb);
}

export function hasPasswordProvider(user: User | null): boolean {
  return !!user?.providerData.some((p) => p.providerId === "password");
}

export function hasGoogleProvider(user: User | null): boolean {
  return !!user?.providerData.some((p) => p.providerId === "google.com");
}

export async function updateAccountName(name: string) {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Faça login para continuar.");
  await updateProfile(user, { displayName: name });
  await updateClientTenantProfile(user.uid, { name });
}

export async function updateAccountEmail(newEmail: string, currentPassword: string) {
  const user = getClientAuth().currentUser;
  if (!user?.email) throw new Error("E-mail não encontrado na conta.");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updateEmail(user, newEmail);
  await updateClientTenantProfile(user.uid, { email: newEmail });
}

export async function updateAccountPassword(currentPassword: string, newPassword: string) {
  const user = getClientAuth().currentUser;
  if (!user?.email) throw new Error("Conta sem e-mail/senha. Use login com Google.");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}
