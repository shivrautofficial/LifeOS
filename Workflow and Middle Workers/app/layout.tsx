import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LifeOS — Productivity & Academic Management",
  description:
    "A local-first starter for the LifeOS project. Includes task management, upcoming agenda, academic tracking, and browser persistence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
