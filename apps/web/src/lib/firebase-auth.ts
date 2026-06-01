import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  sendEmailVerification,
  reload,
  type User,
} from "firebase/auth";
import {
  getClientAuth,
  ensureClientTenant,
  updateClientTenantProfile,
} from "@flowdesk/firebase/client";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (config?: {
    prompt?: "" | "consent" | "select_account" | "none";
  }) => void;
};

type GoogleOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }) => GoogleTokenClient;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2;
      };
    };
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services só funciona no navegador"));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar o Google Sign-In."));
      document.head.appendChild(script);
    });
  }
  return googleIdentityScriptPromise;
}

async function ensureTenantProfile(user: User, name?: string) {
  const email = user.email;
  if (!email) throw new Error("E-mail não encontrado na conta Firebase");
  const displayName = name ?? user.displayName ?? email.split("@")[0] ?? "Usuário";
  await user.getIdToken(true);
  await ensureClientTenant(user.uid, { name: displayName, email });
}

function verificationContinueUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/?auth=register`;
}

async function sendVerificationLink(user: User) {
  const url = verificationContinueUrl();
  await sendEmailVerification(user, url ? { url } : undefined);
}

async function ensureVerified(user: User): Promise<boolean> {
  await reload(user);
  return user.emailVerified === true;
}

export async function resendVerificationEmail() {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Faça login para continuar.");
  await sendVerificationLink(user);
}

export async function refreshVerifiedSession() {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Faça login para continuar.");
  const verified = await ensureVerified(user);
  if (!verified) {
    throw new Error("Seu e-mail ainda não foi confirmado.");
  }
  await ensureTenantProfile(user);
  const token = await user.getIdToken(true);
  return { token, user };
}

export type EmailAuthResult =
  | { status: "VERIFIED"; token: string; user: User }
  | { status: "VERIFICATION_REQUIRED"; email: string; user: User };

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
  if (raw.toLowerCase().includes("confirme seu e-mail")) {
    return "Confirme seu e-mail antes de acessar o painel.";
  }
  if (raw.toLowerCase().includes("requested action is invalid")) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "sua URL";
    return `Login Google inválido em ${origin}. Use http://localhost:3000 no dev ou confira OAuth (pnpm google:oauth-setup): origens JS + redirect /__/auth/handler para localhost e zapflow-higor-2026.web.app.`;
  }
  if (raw.toLowerCase().includes("bloqueado pelo navegador")) {
    return "O login com Google foi bloqueado pelo navegador. Permita pop-ups para este site e tente novamente.";
  }
  if (raw.toLowerCase().includes("origin_mismatch")) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "seu domínio";
    return `Origem ${origin} não está no OAuth do Google. Console → Credentials → OAuth Web → Authorized JavaScript origins: adicione ${origin} (sem barra). Firebase → Auth → Authorized domains: mesmo host. Rode pnpm google:oauth-setup (WEB_ORIGIN no .env).`;
  }
  if (raw.toLowerCase().includes("redirect_uri_mismatch")) {
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
    if (!authDomain) {
      return "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN não configurado. Defina no .env e rode pnpm google:oauth-setup.";
    }
    return `Redirect URI inválida. No Google Cloud → Credentials → OAuth Client, adicione exatamente: https://${authDomain}/__/auth/handler (rode pnpm google:oauth-setup).`;
  }
  return map[code] ?? raw;
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<EmailAuthResult> {
  const auth = getClientAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await sendVerificationLink(cred.user);
  return {
    status: "VERIFICATION_REQUIRED",
    email,
    user: cred.user,
  };
}

export async function loginWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  const auth = getClientAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!(await ensureVerified(cred.user))) {
    await sendVerificationLink(cred.user);
    return {
      status: "VERIFICATION_REQUIRED",
      email: cred.user.email ?? email,
      user: cred.user,
    };
  }
  await ensureTenantProfile(cred.user);
  const token = await cred.user.getIdToken();
  return { status: "VERIFIED", token, user: cred.user };
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function isPrivateNetworkHost(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  const [a, b] = host.split(".").map(Number);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function assertGoogleAuthOrigin(): void {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  if (isPrivateNetworkHost(host)) {
    const port = window.location.port || "3000";
    throw new Error(
      `Abra http://localhost:${port} (não use ${window.location.host}). O Google OAuth não aceita IP da rede (${host}).`
    );
  }
}

async function finishGoogleLogin(user: User): Promise<EmailAuthResult> {
  if (!(await ensureVerified(user))) {
    throw new Error("Confirme seu e-mail antes de continuar.");
  }
  await ensureTenantProfile(user);
  const token = await user.getIdToken();
  return { status: "VERIFIED" as const, token, user };
}

async function signInWithGoogleIdentity(): Promise<EmailAuthResult> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID no .env");

  await loadGoogleIdentityScript();

  const googleOAuth2 = window.google?.accounts?.oauth2;
  if (!googleOAuth2) {
    throw new Error("Google Identity Services indisponível.");
  }

  const accessToken = await new Promise<string>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("Não foi possível abrir o login do Google. Tente novamente.")));
    }, 15000);

    const tokenClient = googleOAuth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        finish(() => {
          if (!response.access_token) {
            reject(
              new Error(
                response.error_description ?? response.error ?? "Não foi possível obter a credencial do Google."
              )
            );
            return;
          }
          resolve(response.access_token);
        });
      },
    });

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });

  const credential = GoogleAuthProvider.credential(undefined, accessToken);
  const auth = getClientAuth();
  const result = await signInWithCredential(auth, credential);
  return finishGoogleLogin(result.user);
}

export async function loginWithGoogle(): Promise<EmailAuthResult | null> {
  assertGoogleAuthOrigin();
  return signInWithGoogleIdentity();
}

let googleRedirectPromise: Promise<{ token: string; user: User } | null> | null = null;

export function completeGoogleRedirect() {
  return googleRedirectPromise ?? Promise.resolve(null);
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
