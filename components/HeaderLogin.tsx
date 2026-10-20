"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The header "Log in" link is pointless on the login page itself
export default function HeaderLogin() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <Link href="/login" className="btn btn-ghost btn-sm">
      Log in
    </Link>
  );
}
