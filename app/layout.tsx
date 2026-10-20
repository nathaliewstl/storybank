import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BrandMark from "@/components/BrandMark";
import HeaderLogin from "@/components/HeaderLogin";
import { signOut } from "./actions";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "StoryBank — STAR interview stories for students",
  description:
    "StoryBank helps students preparing for job and internship interviews turn their experiences into STAR stories and practise them daily.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href={user ? "/app" : "/"} className="brand">
              <BrandMark />
              StoryBank
            </Link>
            <nav className="header-nav" aria-label="Main">
              {user ? (
                <>
                  <span className="header-email" title={user.email ?? ""}>
                    {user.email}
                  </span>
                  <form action={signOut}>
                    <button type="submit" className="btn btn-ghost btn-sm" data-testid="logout">
                      <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <HeaderLogin />
              )}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
