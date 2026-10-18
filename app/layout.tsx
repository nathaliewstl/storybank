import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryBank — STAR interview stories for students",
  description:
    "StoryBank helps students preparing for job and internship interviews turn their experiences into STAR stories and practice them daily.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href={user ? "/app" : "/"} className="brand">
              <span className="brand-mark" aria-hidden="true">★</span>
              StoryBank
            </Link>
            <nav className="header-nav" aria-label="Main">
              {user ? (
                <>
                  <span className="header-email" title={user.email ?? ""}>
                    {user.email}
                  </span>
                  <form action={signOut}>
                    <button type="submit" className="btn btn-ghost" data-testid="logout">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-ghost">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn btn-primary">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
