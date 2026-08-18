import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { appTexts } from "@/src/shared/constants/texts";
import { PwaInstallPrompt } from "@/src/shared/components/PwaInstallPrompt";
import { PwaServiceWorker } from "@/src/shared/components/PwaServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: appTexts.nomeProduto,
    template: `%s · ${appTexts.nomeProduto}`,
  },
  description: appTexts.descricaoProduto,
  manifest: "/manifest.webmanifest",
  applicationName: `${appTexts.nomeProduto} Admin`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: appTexts.nomeProduto,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-(--color-background) text-(--color-foreground)">
        {children}
        <PwaInstallPrompt />
        <PwaServiceWorker />
      </body>
    </html>
  );
}
