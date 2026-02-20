"use client";

import { useEffect } from "react";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const theme = localStorage.getItem("theme-storage");
    if (theme) {
      try {
        const parsed = JSON.parse(theme);
        const t = parsed?.state?.theme || "light";
        if (t === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } catch {}
    }
  }, []);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Tatica Gestap</title>
        <meta name="description" content="Sistema de Gestão Operacional" />
      </head>
      <body className="min-h-screen bg-background-primary text-foreground-primary antialiased">
        {children}
      </body>
    </html>
  );
}
