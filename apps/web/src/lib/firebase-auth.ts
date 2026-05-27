import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getClientAuth, ensureClientTenant } from "@zapflow/firebase/client";

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
    "permission-denied": "Sem permissão no Firestore. Confira as regras e o login.",
  };
  const raw = err instanceof Error ? err.message : fallback;
  if (raw.toLowerCase().includes("requested action is invalid")) {
    return "Login Google falhou. Rode npm run google:oauth-setup e adicione http://localhost:3000 nas origens JavaScript.";
  }
  if (raw.toLowerCase().includes("origin_mismatch")) {
    return "Use http://localhost:3000 (não IP da rede). Se persistir: npm run google:oauth-setup.";
  }
  if (raw.toLowerCase().includes("redirect_uri_mismatch")) {
    return "Redirect OAuth incorreto. Rode npm run google:oauth-setup e adicione os URIs de redirecionamento.";
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

async function finishGoogleLogin(user: User) {
  await ensureTenantProfile(user);
  const token = await user.getIdToken();
  return { token, user };
}

export async function loginWithGoogle(): Promise<{ token: string; user: User } | null> {
  const auth = getClientAuth();
  const provider = googleProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    return finishGoogleLogin(cred.user);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    const msg = err instanceof Error ? err.message : "";
    const shouldUseRedirect =
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      msg.toLowerCase().includes("requested action is invalid") ||
      msg.toLowerCase().includes("origin_mismatch") ||
      msg.toLowerCase().includes("redirect_uri_mismatch");
    if (shouldUseRedirect) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export async function completeGoogleRedirect() {
  const cred = await getRedirectResult(getClientAuth());
  if (!cred?.user) return null;
  return finishGoogleLogin(cred.user);
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
