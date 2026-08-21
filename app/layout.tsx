import "./globals.css";

export const metadata = {
  title: "Maike Hub",
  description: "Painel pessoal para tarefas, notas, atalhos e automações."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
