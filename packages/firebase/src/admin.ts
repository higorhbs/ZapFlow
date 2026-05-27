import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App;

function resolveServiceAccountPath(): string | undefined {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!raw) return undefined;
  const candidates = [
    resolve(raw),
    resolve(process.cwd(), raw),
    resolve(process.cwd(), "../..", raw),
    resolve(process.cwd(), "..", raw),
  ];
  return candidates.find((p) => existsSync(p));
}

function initAdmin(): App {
  if (getApps().length) return getApps()[0]!;

  const saPath = resolveServiceAccountPath();
  if (saPath) {
    const serviceAccount = JSON.parse(readFileSync(saPath, "utf8")) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    app = initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
    });
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    app = initializeApp();
  }
  return app;
}

export function getDb(): Firestore {
  initAdmin();
  return getFirestore();
}

export function getAdminAuth(): Auth {
  initAdmin();
  return getAuth();
}

export function newId(): string {
  return getDb().collection("_").doc().id;
}

export function nowIso(): string {
  return new Date().toISOString();
}
