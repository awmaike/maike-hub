import "./globals.css";

export const metadata = {
  title: "Maike Hub",
  description: "Central pessoal de infraestrutura, monitoramento e desenvolvimento.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
