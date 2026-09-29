import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarSync",
  description: "Monitoramento energético residencial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
