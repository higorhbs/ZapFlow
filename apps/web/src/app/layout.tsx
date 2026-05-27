import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToasterHost } from "./toaster-host";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZapFlow — Atendimento automático no WhatsApp",
  description: "Resposta automática para WhatsApp de pequenos negócios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
          <ToasterHost />
        </Providers>
      </body>
    </html>
  );
}
