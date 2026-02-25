"use client";

import "@/styles/globals.css";

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme-storage');
    if (stored) {
      var parsed = JSON.parse(stored);
      var t = (parsed && parsed.state && parsed.state.theme) || 'light';
      if (t === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Tatica Gestap</title>
        <meta name="description" content="Sistema de Gestao Operacional" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background-primary text-foreground-primary antialiased">
        {children}
      </body>
    </html>
  );
}
