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
        <title>Tática - Gestão Empresarial</title>
        <meta name="description" content="Plataforma de gestão financeira e empresarial - Tática Consultoria" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background-primary text-foreground-primary antialiased">
        {children}
      </body>
    </html>
  );
}
