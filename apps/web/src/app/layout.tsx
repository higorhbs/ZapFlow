import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToasterHost } from "./toaster-host";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZapFlow — Atendimento automático no WhatsApp",
  description: "Resposta automática para WhatsApp de pequenos negócios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={inter.className} suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=sessionStorage.getItem("zapflow:activeBusinessType");if(t)document.documentElement.setAttribute("data-business-type",t);}catch(e){}})();`,
          }}
        />
        <Providers>
          {children}
          <ToasterHost />
        </Providers>
      </body>
    </html>
  );
}
