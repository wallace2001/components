import type { Metadata } from "next";
import { CssBaseline } from "@mui/material";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meu Projeto com MUI",
  description: "Next.js com Material UI e CSS puro",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CssBaseline />
        {children}
      </body>
    </html>
  );
}
