import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = { title: "Resource Optimization" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-7xl gap-6 px-6 py-4 text-sm font-medium">
            <Link href="/">Risk Dashboard</Link>
            <Link href="/resources">Optimization</Link>
            <Link href="/alerts">Alerts</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
